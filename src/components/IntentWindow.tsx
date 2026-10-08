import { useStore } from '../lib/store';
import { currentTask, hm, pause, uid } from '../lib/model';
import { Button, Chapter, Field } from './ui';
export function IntentWindow() {
  const { state, now, update, ask } = useStore(),
    intent = state.intent;
  const extend = (m: number) =>
    update((s) => {
      if (s.intent) s.intent.due = Math.max(Date.now(), s.intent.due) + m * 60000;
    });
  const finish = (done: boolean) =>
    update((s) => {
      if (s.intent) s.sessions.push({ ...s.intent, id: uid(), end: Date.now(), completed: done });
      s.intent = null;
    });
  const n = intent ? Math.max(0, Math.ceil((intent.due - now) / 1000)) : 0;
  return (
    <Chapter
      id="window"
      n="01"
      title="此刻的小窗"
      subtitle="One thing at one time"
      aside={<span className="margin-note">先安放这个念头。</span>}
    >
      <div className={`window-frame ${intent ? 'running' : ''}`}>
        <div className="window-sky" aria-hidden="true">
          <div className="sun" />
          <div className="cloud c1" />
          <div className="cloud c2" />
          <div className="hill" />
          <div className="window-cross" />
          <span className="sky-note">just this one thing.</span>
        </div>
        <div className="window-inside">
          <p className="eyebrow">WHAT BRINGS YOU HERE?</p>
          {!intent ? (
            <form
              id="intent-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget),
                  title = String(f.get('name')).trim();
                if (!title) return;
                update((s) => {
                  if (s.intent) return;
                  pause(s);
                  s.intent = {
                    title,
                    start: Date.now(),
                    due: Date.now() + Number(f.get('minutes')) * 60000,
                    returnTitle: currentTask(s)?.title || '当前小时',
                  };
                });
              }}
            >
              <h3>这次打开，是为了…</h3>
              <label className="sr-only" htmlFor="intent-name">
                临时意图
              </label>
              <input
                id="intent-name"
                name="name"
                maxLength={100}
                placeholder="点份外卖，查一条信息…"
                required
              />
              <div className="row">
                <label className="duration">
                  给自己{' '}
                  <input name="minutes" type="number" min={1} max={240} defaultValue={5} required />{' '}
                  分钟
                </label>
                <Button type="submit" variant="primary">
                  打开这扇窗 ↗
                </Button>
              </div>
            </form>
          ) : (
            <div>
              <h3>{intent.title}</h3>
              <div id="countdown" className="countdown" role="timer">
                {String(Math.floor(n / 60)).padStart(2, '0')}:{String(n % 60).padStart(2, '0')}
              </div>
              <p className="subtle">
                {hm(intent.start)} 开始 · {hm(intent.due)} 预计结束
                {n === 0 ? ' · 时间到了，回到目标吗？' : ''}
              </p>
              <div className="row wrap">
                <Button id="intent-finish" variant="primary" onClick={() => finish(true)}>
                  ✓ 做完了
                </Button>
                <Button id="intent-extend" variant="soft" onClick={() => extend(5)}>
                  ＋5 分钟
                </Button>
                <Button
                  onClick={() =>
                    ask({
                      title: '再给自己一点时间',
                      body: (
                        <Field
                          label="延长分钟数"
                          name="minutes"
                          type="number"
                          min={1}
                          max={240}
                          defaultValue={5}
                          required
                        />
                      ),
                      submit: (f) => extend(Number(f.get('minutes'))),
                    })
                  }
                >
                  自定义
                </Button>
                <Button id="intent-stop" onClick={() => finish(false)}>
                  未完成，先结束
                </Button>
              </div>
            </div>
          )}
          <p className="return-line">
            ↳ 做完回到：
            {intent?.returnTitle || currentTask(state)?.title || '当前小时，再选一件小事。'}
          </p>
        </div>
      </div>
      <div className="sill" aria-hidden="true" />
    </Chapter>
  );
}
