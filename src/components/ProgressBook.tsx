import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { dayData, mins, modeName, pause, spent, uid } from '../lib/model';
import { clock, dateKey, overlap, progress } from '../lib/planning';
import type { Task } from '../lib/types';
import { Button, Chapter, Field } from './ui';
import { useTaskEditor } from './TaskEditor';
import { useRoutineSettings } from './RoutineSettings';
export function ProgressBook() {
  const { state, now, update, ask } = useStore(),
    [hour, setHour] = useState(new Date().getHours()),
    editTask = useTaskEditor(),
    settings = useRoutineSettings(),
    r = dayData(state);
  const ts = state.tasks.filter(
    (t) =>
      t.date === dateKey() ||
      r.taskIds?.includes(t.id) ||
      (state.plans[dateKey()] || []).some((p) => p.taskId === t.id),
  );
  const done = r.routines.filter((x) => x.done).length,
    a = +new Date(`${dateKey()}T${clock(hour * 60)}:00`),
    b = a + 3600000,
    logs = state.logs.filter((l) => overlap(a, b, l.start, l.end) > 0),
    last = state.corrections.at(-1);
  const correct = (t: Task, p: number) =>
    ask({
      title: '确认这次投入校正',
      body: (
        <>
          <p>
            将「{t.title}」的累计投入校正为{' '}
            <b>
              {mins((t.estimate * p) / 100)}（{p}%）
            </b>
            。
          </p>
          <p className="subtle">原始计时保留。差额作为未分配补记，不会自动标记完成。</p>
        </>
      ),
      submit: () =>
        update((s) => {
          if (s.running?.taskId === t.id) pause(s);
          s.corrections.push({
            id: uid(),
            taskId: t.id,
            at: Date.now(),
            delta: (t.estimate * p) / 100 - spent(s, t),
          });
        }),
    });
  return (
    <Chapter
      id="book"
      n="03"
      title="翻翻今天"
      subtitle="Little things, added up"
      aside={<span className="margin-note">每一点投入，都有一页。</span>}
    >
      <div className="book">
        <div className="book-left">
          <div className="bookmark" aria-hidden="true" />
          <p className="eyebrow">THE WORK IN PROGRESS</p>
          <div className="row between">
            <h3>我的任务书</h3>
            <Button id="new-task" onClick={() => editTask()}>
              ＋ 记一件事
            </Button>
          </div>
          <div>
            {ts.length ? (
              ts.map((t) => {
                const n = spent(state, t),
                  p = progress(n, t.estimate);
                return (
                  <article className={`task-leaf ${t.done ? 'done' : ''}`} key={t.id}>
                    <header>
                      <div className="row">
                        <input
                          type="checkbox"
                          aria-label={`标记完成 ${t.title}`}
                          checked={t.done}
                          onChange={(e) =>
                            update((s) => {
                              if (s.running?.taskId === t.id) pause(s);
                              const target = s.tasks.find((x) => x.id === t.id)!;
                              target.done = e.target.checked;
                              target.completedAt = target.done ? Date.now() : null;
                            })
                          }
                        />
                        <h4>{t.title}</h4>
                      </div>
                      <span className="percent">{p === null ? '—' : `${p}%`}</span>
                    </header>
                    <CalibrationSlider title={t.title} percent={p} onApply={(v) => correct(t, v)} />
                    <div className="row between">
                      <small>
                        已投入 {mins(n)} /{' '}
                        {t.estimate ? `预计 ${mins(t.estimate)}` : '预计时长未设置'}
                        {t.done ? ' · 已完成' : ''}
                      </small>
                      <Button
                        onClick={() =>
                          ask({
                            title: '校正任务的时间',
                            body: (
                              <>
                                <Field
                                  label="预计总用时（分钟）"
                                  name="est"
                                  type="number"
                                  min={1}
                                  max={10080}
                                  defaultValue={t.estimate || 60}
                                  required
                                />
                                <Field
                                  label="累计投入（分钟）"
                                  name="used"
                                  type="number"
                                  min={0}
                                  max={100000}
                                  defaultValue={Math.round(n)}
                                  required
                                />
                                <p className="subtle">差额标为未分配补记，不编造小时记录。</p>
                              </>
                            ),
                            submit: (f) =>
                              update((s) => {
                                if (s.running?.taskId === t.id) pause(s);
                                const target = s.tasks.find((x) => x.id === t.id)!;
                                s.corrections.push({
                                  id: uid(),
                                  taskId: t.id,
                                  at: Date.now(),
                                  delta: Number(f.get('used')) - spent(s, target),
                                  oldEstimate: target.estimate,
                                });
                                target.estimate = Number(f.get('est'));
                              }),
                          })
                        }
                      >
                        校正
                      </Button>
                    </div>
                    {p !== null && p > 100 && <small>已超出预计用时，任务不会自动标记完成。</small>}
                  </article>
                );
              })
            ) : (
              <p className="empty">
                这一页还空着。
                <br />
                记下一件想做的事吧。
              </p>
            )}
          </div>
          <details className="hour-records">
            <summary>按小时翻阅投入记录</summary>
            <label>
              查看小时{' '}
              <select value={hour} onChange={(e) => setHour(Number(e.target.value))}>
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {clock(h * 60)}–{clock((h + 1) * 60)}
                  </option>
                ))}
              </select>
            </label>
            <div>
              {logs.length ? (
                logs.map((l) => (
                  <p key={l.id}>
                    {state.tasks.find((t) => t.id === l.taskId)?.title} · 本小时{' '}
                    {mins(overlap(a, b, l.start, l.end) / 60000)}
                  </p>
                ))
              ) : (
                <p className="subtle">这个小时还没有已结束的计时记录。</p>
              )}
              {last && (
                <p className="subtle">
                  未分配时段校正：{state.tasks.find((t) => t.id === last.taskId)?.title}{' '}
                  {last.delta >= 0 ? '+' : ''}
                  {Math.round(last.delta)} 分钟{' '}
                  <Button
                    id="undo-correction"
                    onClick={() =>
                      update((s) => {
                        const c = s.corrections.pop();
                        if (c?.oldEstimate !== undefined) {
                          const t = s.tasks.find((t) => t.id === c.taskId);
                          if (t) t.estimate = c.oldEstimate;
                        }
                      })
                    }
                  >
                    撤销最近校正
                  </Button>
                </p>
              )}
            </div>
          </details>
          <p className="book-foot">进度＝累计投入 / 预计用时，不等于成果完成。</p>
        </div>
        <div className="book-right">
          <p className="eyebrow">A RHYTHM OF MY OWN</p>
          <div className="row between">
            <h3>生活，也算数。</h3>
            <span className="mode-label">{modeName(r.mode)}</span>
          </div>
          <div className="routine-summary">
            <strong id="routine-percent">
              {r.routines.length ? `${Math.round((done / r.routines.length) * 100)}%` : '—'}
            </strong>
            <span>
              {r.routines.length
                ? `截至目前 · ${done}/${r.routines.length} 项作息`
                : '先定义你的节奏'}
            </span>
          </div>
          {r.routines.map((x) => (
            <label className="routine-row" key={x.id}>
              <input
                type="checkbox"
                checked={x.done}
                onChange={(e) =>
                  update((s) => {
                    const r = dayData(s).routines.find((r) => r.id === x.id)!;
                    r.done = e.target.checked;
                    r.completedAt = r.done ? Date.now() : null;
                  })
                }
              />
              {x.name}
              <time>{x.time}</time>
            </label>
          ))}
          <Button onClick={settings}>设置我的作息 ↗</Button>
          <p className="book-foot">按自己的节奏。做过了，再轻轻打个勾。</p>
        </div>
      </div>
    </Chapter>
  );
}

function CalibrationSlider({
  title,
  percent,
  onApply,
}: {
  title: string;
  percent: number | null;
  onApply: (n: number) => void;
}) {
  const [value, setValue] = useState(Math.min(100, percent || 0)),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setValue(Math.min(100, percent || 0));
  }, [percent, dirty]);
  return (
    <>
      <input
        type="range"
        aria-label={`校正 ${title} 的投入进度`}
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={percent === null}
        onChange={(e) => {
          setValue(Number(e.target.value));
          setDirty(true);
        }}
      />
      {dirty && (
        <div className="row">
          <Button
            onClick={() => {
              onApply(value);
              setDirty(false);
            }}
          >
            应用 {value}% 校正
          </Button>
          <Button onClick={() => setDirty(false)}>取消校正</Button>
        </div>
      )}
    </>
  );
}
