import { useEffect } from 'react';
import { useStore } from './lib/store';
import { dateKey } from './lib/planning';
import { dayData, modeName, uid } from './lib/model';
import { Button, Field } from './components/ui';
import { useRoutineSettings } from './components/RoutineSettings';
import { IntentWindow } from './components/IntentWindow';
import { Timeline } from './components/Timeline';
import { ProgressBook } from './components/ProgressBook';
import { VoiceStage } from './components/VoiceStage';
export default function App() {
  const { state, now, demo, ask, update } = useStore(),
    settings = useRoutineSettings();
  const pending = state.pendingTimer;
  useEffect(() => {
    if (!pending) return;
    ask({
      title: '核对上一次的计时',
      body: (
        <>
          <p>
            「{state.tasks.find((t) => t.id === pending.taskId)?.title}
            」上次未结束，确认前不计入任务。
          </p>
          <Field
            label="实际投入（分钟）"
            name="minutes"
            type="number"
            min={0}
            max={1440}
            defaultValue={0}
            required
          />
          <p className="subtle">记为未分配补记，不猜测后台是否一直在工作。</p>
        </>
      ),
      submit: (f) =>
        update((s) => {
          s.corrections.push({
            id: uid(),
            taskId: pending.taskId,
            at: Date.now(),
            delta: Number(f.get('minutes')),
          });
          s.pendingTimer = null;
        }),
    });
  }, []);
  const exportData = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `回到此刻-${dateKey()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <a className="skip" href="#window">
        跳到此刻
      </a>
      <header className="masthead">
        <a className="brand" href="./">
          <span>a.</span> 回到此刻
        </a>
        <div>
          <span id="date-label">
            {new Date(now).toLocaleDateString('zh-CN', {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
          </span>
          <Button onClick={settings}>作息设置 ↗</Button>
        </div>
      </header>
      <main>
        <div className="day-title">
          <div>
            <span className="eyebrow">A LITTLE ROOM FOR YOUR DAY</span>
            <h1>今天，一件一件来。</h1>
          </div>
          <span className="day-stamp">
            {dayData(state).mode ? modeName(dayData(state).mode) : '我的一天'}
            <br />
            自己的节奏
          </span>
        </div>
        {demo && (
          <div id="demo-banner">
            你正在体验示例的一天，所有操作与真实记录隔离。 <a href="./">进入我的空白记录 →</a>
          </div>
        )}
        <IntentWindow />
        <Timeline />
        <ProgressBook />
        <VoiceStage />
        <footer>
          <span className="brand footer-brand">
            a. <small>把注意力，留给生活。</small>
          </span>
          <div>
            <Button onClick={exportData}>导出记录 ↗</Button>
            <a href="?demo=1">体验示例</a>
          </div>
          <p>本地保存 · 手机与电脑暂不同步 · 模型未连接 · React / TypeScript</p>
        </footer>
      </main>
    </>
  );
}
