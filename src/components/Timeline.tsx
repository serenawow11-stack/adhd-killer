import { useState } from 'react';
import { useStore } from '../lib/store';
import { currentTask, dayData, hm, mins, pause, spent } from '../lib/model';
import { clock, dateKey, minutesOf, overlap } from '../lib/planning';
import { Button, Chapter, Field } from './ui';
import { useTaskEditor } from './TaskEditor';
export function Timeline() {
  const { state, now, update, notify, ask, get } = useStore(),
    [all, setAll] = useState(false),
    edit = useTaskEditor();
  const date = new Date(now),
    h = date.getHours(),
    d = dateKey(date),
    ps = state.plans[d] || [],
    rs = dayData(state, d).routines;
  const start = all ? 0 : Math.max(0, h - 2),
    end = all ? 23 : Math.min(23, h + 2);
  const t = currentTask(state, date);
  return (
    <Chapter
      id="road"
      n="02"
      title="时间慢慢走"
      subtitle="A path through today"
      aside={
        <Button
          onClick={() =>
            document
              .getElementById('current-door')
              ?.scrollIntoView({
                block: 'center',
                behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
                  ? 'instant'
                  : 'smooth',
              })
          }
        >
          回到现在 ↓
        </Button>
      }
    >
      <div className="road-caption">
        <span>走过的可以回看，还没走到的不必着急。</span>
        <span>{hm(now)}</span>
      </div>
      <div className="timeline">
        {Array.from({ length: end - start + 1 }, (_, i) => i + start).map((hour) => {
          const goals = ps
              .filter((p) => overlap(hour * 60, (hour + 1) * 60, p.start, p.start + p.duration) > 0)
              .map((p) => state.tasks.find((t) => t.id === p.taskId)?.title)
              .filter(Boolean),
            rh = rs.filter((r) => Math.floor(minutesOf(r.time) / 60) === hour),
            label = [...goals, ...rh.map((r) => `${r.time} ${r.name}`)].join(' · ') || '留一点空白';
          if (hour === h)
            return (
              <div className="road-node now" id="current-door" key={hour}>
                <time className="road-time">{clock(hour * 60)}</time>
                <div className="door">
                  <div className="door-inner">
                    <div className="door-label">
                      <span>YOU ARE HERE · 此刻</span>
                      <span>
                        {clock(hour * 60)}–{clock((hour + 1) * 60)}
                      </span>
                    </div>
                    <h3>{t?.title || rh[0]?.name || '先选一件小事'}</h3>
                    <p className="task-detail">
                      {t?.note || '不必安排得很满，从这一小时开始。'}
                      {t && (
                        <>
                          <br />
                          已投入 {mins(spent(state, t))} /{' '}
                          {t.estimate ? `预计 ${mins(t.estimate)}` : '待设置预计用时'}
                        </>
                      )}
                      {rh.length > 0 && (
                        <>
                          <br />
                          固定作息：{rh.map((r) => `${r.time} ${r.name}`).join(' · ')}
                        </>
                      )}
                    </p>
                    <div className="door-bottom">
                      <div>
                        {t && (
                          <Button
                            id="task-run"
                            variant="primary"
                            onClick={() => {
                              if (state.intent)
                                return notify('先完成或结束临时意图，再开始主任务。');
                              if (t.done) return notify('这件事已经完成，可以更换任务。');
                              update((s) => {
                                if (s.running) pause(s);
                                else s.running = { taskId: t.id, start: Date.now() };
                              });
                            }}
                          >
                            {state.running?.taskId === t.id ? 'Ⅱ 暂停计时' : '开始这一件 →'}
                          </Button>
                        )}
                      </div>
                      <div>
                        <Button id="change-task" onClick={() => edit(true)}>
                          {t ? '更换任务' : '选择任务'} ↗
                        </Button>
                        <Button
                          onClick={() => {
                            if (!t) return edit(true);
                            const slot = `${d}:${h}`;
                            ask({
                              title: '给当前任务补充一句',
                              body: (
                                <Field
                                  label="下一步 / 说明"
                                  name="note"
                                  defaultValue={t.note || ''}
                                  maxLength={150}
                                />
                              ),
                              submit: (f) => {
                                if (
                                  slot !== `${dateKey()}:${new Date().getHours()}` ||
                                  currentTask(get())?.id !== t.id
                                )
                                  throw Error('当前时段或任务已变化，请重新打开');
                                update((s) => {
                                  const target = s.tasks.find((x) => x.id === t.id);
                                  if (target) target.note = String(f.get('note'));
                                });
                              },
                            });
                          }}
                        >
                          ＋ 补充
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          const a = +new Date(`${d}T${clock(hour * 60)}:00`),
            b = a + 3600000,
            records = state.logs
              .filter((l) => overlap(a, b, l.start, l.end) > 0)
              .map(
                (l) =>
                  `${state.tasks.find((t) => t.id === l.taskId)?.title || '任务'} · ${mins(overlap(a, b, l.start, l.end) / 60000)}`,
              ),
            intents = state.sessions
              .filter((s) => overlap(a, b, s.start, s.end) > 0)
              .map((s) => `临时：${s.title} · ${mins(overlap(a, b, s.start, s.end) / 60000)}`);
          return (
            <div className="road-node" key={hour}>
              <time className="road-time">{clock(hour * 60)}</time>
              {hour < h ? (
                <details className="road-item">
                  <summary>{label}</summary>
                  <p>原计划：{label}</p>
                  <p>实际：{[...records, ...intents].join('；') || '未记录'}</p>
                </details>
              ) : (
                <div className="road-item">
                  <span className="readonly">未到 · 只读</span>
                  {label}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Button id="expand-day" className="whole-day" onClick={() => setAll((v) => !v)}>
        {all ? '收起，回到附近几小时 ↑' : '展开完整的 24 小时 ↓'}
      </Button>
    </Chapter>
  );
}
