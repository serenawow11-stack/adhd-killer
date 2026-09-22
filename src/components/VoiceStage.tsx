import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { dateKey, tomorrow, makeDraft, clock, minutesOf, validSlots } from '../lib/planning';
import { modeName, uid } from '../lib/model';
import type { Mode, Draft } from '../lib/types';
import { Button, Chapter } from './ui';
function Microphone() {
  const { notify } = useStore();
  const [status, setStatus] = useState('按住话筒，留下一段声音'),
    [active, setActive] = useState(false),
    [audio, setAudio] = useState('');
  const recorder = useRef<MediaRecorder | null>(null),
    hold = useRef(false),
    pending = useRef(false),
    cancelled = useRef(false),
    url = useRef(''),
    streamRef = useRef<MediaStream | null>(null),
    alive = useRef(true);
  const stop = (cancel = false) => {
    hold.current = false;
    cancelled.current = cancel;
    if (recorder.current?.state === 'recording') recorder.current.stop();
  };
  useEffect(() => {
    alive.current = true;
    const change = () => {
      if (document.hidden) stop();
    };
    document.addEventListener('visibilitychange', change);
    return () => {
      alive.current = false;
      stop(true);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (url.current) URL.revokeObjectURL(url.current);
      document.removeEventListener('visibilitychange', change);
    };
  }, []);
  const start = async () => {
    if (recorder.current || pending.current) return;
    hold.current = true;
    pending.current = true;
    cancelled.current = false;
    setStatus('正在请求麦克风…');
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw Error('此浏览器暂不支持录音，请使用文字输入');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      if (!hold.current || !alive.current) {
        stream.getTracks().forEach((t) => t.stop());
        if (alive.current) setStatus('已松开，请再次按住录音');
        return;
      }
      const rec = new MediaRecorder(stream),
        chunks: BlobPart[] = [];
      recorder.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        recorder.current = null;
        if (!alive.current) return;
        setActive(false);
        if (cancelled.current || !chunks.length) {
          setStatus('已取消，声音未保存');
          return;
        }
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType }));
        setAudio(url.current);
        setStatus('录音已保留，可回听；转写模型尚未连接。');
      };
      rec.start();
      setActive(true);
      setStatus('正在录音 · 松开结束');
    } catch (e) {
      hold.current = false;
      setStatus('可以先用文字，把今天留下来');
      notify(
        e instanceof Error && e.name === 'NotAllowedError'
          ? '未获得麦克风权限，可以直接输入文字。'
          : e instanceof Error
            ? e.message
            : '录音失败',
      );
    } finally {
      pending.current = false;
    }
  };
  return (
    <div className={`stage-art ${active ? 'recording' : ''}`}>
      <div className="spotlight" aria-hidden="true" />
      <span className="stage-label">THE FLOOR IS YOURS</span>
      <button
        className="mic"
        aria-label="按住录音，松开停止"
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          void start();
        }}
        onPointerUp={() => stop()}
        onPointerCancel={() => stop(true)}
        onKeyDown={(e) => {
          if ([' ', 'Enter'].includes(e.key) && !e.repeat) {
            e.preventDefault();
            void start();
          }
        }}
        onKeyUp={(e) => {
          if ([' ', 'Enter'].includes(e.key)) stop();
        }}
      >
        <svg viewBox="0 0 100 150" aria-hidden="true">
          <rect x="33" y="12" width="34" height="65" rx="17" fill="currentColor" />
          <path
            d="M25 52v15a25 25 0 0050 0V52M50 94v36M30 132h40"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path d="M39 28h22M39 38h22M39 48h22" stroke="#254d40" strokeWidth="3" />
        </svg>
      </button>
      <p role="status">{status}</p>
      <div className="record-actions">
        <Button
          onClick={() => {
            if (active || pending.current) stop();
            else void start();
          }}
        >
          {active ? '停止录音' : '点击录音'}
        </Button>
        {active && <Button onClick={() => stop(true)}>取消录音</Button>}
      </div>
      {audio && <audio src={audio} controls />}
      <p className="stage-api">ASR / LLM 待接入 · 录音仅在本页暂存</p>
      <div className="stage-floor" aria-hidden="true" />
    </div>
  );
}
function DraftPreview({ draft }: { draft: Draft }) {
  const { state, update, notify, ask } = useStore();
  const apply = () =>
    update((s) => {
      const d = s.draft;
      if (!d || d.id !== draft.id) throw Error('草稿已经变化，请刷新');
      if (d.date < tomorrow()) throw Error('草稿日期已过期');
      const error = validSlots(d.rows, d.routines);
      if (error) throw Error(error);
      s.days[d.date] = {
        mode: d.mode,
        routines: d.routines.map((r) => ({ ...r, done: false })),
        taskIds: [],
      };
      const plans = [];
      for (const r of d.rows) {
        let t = s.tasks.find((t) => t.title === r.title && !t.done);
        if (!t) {
          t = {
            id: uid(),
            title: r.title,
            date: d.date,
            estimate: r.duration,
            base: 0,
            done: false,
          };
          s.tasks.push(t);
        }
        s.days[d.date].taskIds!.push(t.id);
        if (r.start !== null) plans.push({ taskId: t.id, start: r.start, duration: r.duration });
      }
      s.plans[d.date] = plans;
      s.draft = null;
    });
  const confirm = () => {
    const error = validSlots(draft.rows, draft.routines);
    if (error) return notify(error);
    if (draft.date < tomorrow()) return notify('草稿日期已过期，请重新生成');
    if (state.plans[draft.date]?.length)
      ask({
        title: '更新已确认的明日规划',
        body: <p>将替换 {draft.date} 的时间安排，任务和已有投入不会删除。</p>,
        submit: apply,
      });
    else {
      apply();
      notify('明日规划已确认，到对应日期会显示在时间之路。');
    }
  };
  return (
    <div id="plan-draft">
      <p className="eyebrow mt-5">LOCAL DRAFT · 本地规则草稿</p>
      <p className="subtle">
        {draft.date} · {modeName(draft.mode)} · 保留 20% 可用时间为缓冲
      </p>
      {draft.rows.map((r, i) => (
        <div className={`draft-row ${r.start === null ? 'unplaced' : ''}`} key={r.id}>
          <input
            type="time"
            aria-label={`${r.title} 开始时间`}
            value={r.start === null ? '' : clock(r.start)}
            onChange={(e) =>
              update((s) => {
                if (s.draft)
                  s.draft.rows[i].start = e.target.value ? minutesOf(e.target.value) : null;
              })
            }
          />
          <span>
            {r.title}{' '}
            <small>
              {r.duration} 分钟{r.suggested ? ' · 建议时长' : ''}
              {r.start === null ? ' · 待安排' : ''}
            </small>
          </span>
          <Button
            aria-label={`将 ${r.title} 留待安排`}
            onClick={() =>
              update((s) => {
                if (s.draft) s.draft.rows[i].start = null;
              })
            }
          >
            ×
          </Button>
        </div>
      ))}
      <details className="subtle">
        <summary>查看受保护的固定作息</summary>
        {draft.routines.map((r) => (
          <p key={r.id}>
            {r.time} {r.name}
          </p>
        ))}
      </details>
      <p className="subtle">清空时间可留待安排。确认前不会改动正式时间线。</p>
      <Button id="confirm-plan" variant="primary" onClick={confirm}>
        确认 {draft.date} 的规划
      </Button>
    </div>
  );
}
export function VoiceStage() {
  const { state, update, notify } = useStore();
  const [tab, setTab] = useState<'review' | 'plan'>('review'),
    [reviewDate, setReviewDate] = useState(dateKey()),
    [planDate, setPlanDate] = useState(state.draft?.date || tomorrow()),
    [mode, setMode] = useState<Mode>(state.draft?.mode || 'healthy');
  const text = state.notes[reviewDate] ?? state.reviews[reviewDate]?.text ?? '';
  return (
    <Chapter
      id="stage"
      n="04"
      title="把今天，说给明天"
      subtitle="Your little evening stage"
      aside={<span className="margin-note">轮到你，慢慢说。</span>}
    >
      <div className="stage">
        <Microphone />
        <div className="stage-notes">
          <div className="tabs" role="tablist" aria-label="复盘与计划">
            <Button
              id="tab-review"
              role="tab"
              aria-selected={tab === 'review'}
              aria-controls="review-panel"
              onClick={() => setTab('review')}
            >
              回顾今天
            </Button>
            <Button
              id="tab-plan"
              role="tab"
              aria-selected={tab === 'plan'}
              aria-controls="plan-panel"
              onClick={() => setTab('plan')}
            >
              安排明天
            </Button>
          </div>
          {tab === 'review' ? (
            <div id="review-panel" role="tabpanel" aria-labelledby="tab-review">
              <label className="field-label">
                复盘日期{' '}
                <input
                  type="date"
                  value={reviewDate}
                  max={dateKey()}
                  onChange={(e) => setReviewDate(e.target.value)}
                />
              </label>
              <label className="sr-only" htmlFor="review-text">
                今日复盘与感悟
              </label>
              <textarea
                id="review-text"
                rows={5}
                value={text}
                onChange={(e) =>
                  update((s) => {
                    s.notes[reviewDate] = e.target.value;
                  })
                }
                placeholder={
                  '今天每个小时大概做了什么？\n哪件事向前走了一点？\n有什么想留给明天的感悟？'
                }
              />
              <p className="subtle">模型还没接入，先保留你的原话；不会自动猜测或累计任务用时。</p>
              <Button
                id="save-review"
                variant="primary"
                onClick={() => {
                  if (!reviewDate || reviewDate > dateKey() || !text.trim())
                    return notify('请填写有效复盘日期及内容');
                  update((s) => {
                    s.reviews[reviewDate] = { text: text.trim(), confirmedAt: Date.now() };
                  });
                  notify('已保存复盘原文。用时可以在进度书核对、校正。');
                }}
              >
                确认保存复盘 ↗
              </Button>
              {state.reviews[reviewDate] && (
                <p className="subtle">已保存原文，可继续修改后重新确认。</p>
              )}
            </div>
          ) : (
            <div id="plan-panel" role="tabpanel" aria-labelledby="tab-plan">
              <div className="row">
                <label className="field-label">
                  计划日期
                  <input
                    type="date"
                    min={tomorrow()}
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                  />
                </label>
                <label className="field-label">
                  我的节奏
                  <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                    <option value="healthy">健康日</option>
                    <option value="free">放纵日</option>
                  </select>
                </label>
              </div>
              <textarea
                id="plan-text"
                aria-label="明日任务"
                rows={4}
                value={state.planInput || ''}
                onChange={(e) =>
                  update((s) => {
                    s.planInput = e.target.value;
                  })
                }
                placeholder={'先每行写一件，例如：\n修改简历 60分钟\n读书 30分钟'}
              />
              <p className="subtle">
                当前使用本地规则排程，并非 AI。支持“任务＋数字时长”，复杂自然语言需模型接入后处理。
              </p>
              <Button
                id="make-plan"
                variant="primary"
                onClick={() => {
                  try {
                    if (!planDate || planDate < tomorrow())
                      throw Error('这里仅规划明天及之后的日期');
                    const routines = state.templates[mode];
                    if (!routines) throw Error('请先在作息设置中配置所选模式');
                    const rows = makeDraft(state.planInput || '', routines);
                    if (!rows.length) throw Error('先写下至少一件事');
                    update((s) => {
                      s.draft = {
                        id: uid(),
                        date: planDate,
                        mode,
                        routines: structuredClone(routines),
                        rows,
                      };
                    });
                  } catch (e) {
                    notify(e instanceof Error ? e.message : '生成失败');
                  }
                }}
              >
                生成可编辑草稿 ↗
              </Button>
              {state.draft && <DraftPreview draft={state.draft} />}
            </div>
          )}
        </div>
      </div>
    </Chapter>
  );
}
