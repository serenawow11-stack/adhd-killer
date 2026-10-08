import { useState } from 'react';
import { useStore } from '../lib/store';
import { dayData } from '../lib/model';
import { dateKey } from '../lib/planning';
import type { Mode, State } from '../lib/types';
function SettingsBody({ state }: { state: State }) {
  const [mode, setMode] = useState<Mode>(dayData(state).mode || 'healthy');
  return (
    <>
      <p className="subtle">两套模板都由你决定。未填时间不会自动应用。今天的记录会保留。</p>
      <label>
        编辑模板
        <select name="mode" value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
          <option value="healthy">健康日</option>
          <option value="free">放纵日</option>
        </select>
      </label>
      <div key={mode}>
        {['起床', '洗漱', '早餐', '午餐', '晚餐', '睡觉'].map((name, i) => (
          <label className="inline-label" key={name}>
            {name}
            <input
              name={`time${i}`}
              type="time"
              defaultValue={state.templates[mode]?.find((r) => r.name === name)?.time || ''}
              required
            />
          </label>
        ))}
      </div>
      <label>
        应用范围
        <select name="scope">
          <option value="template">仅保存模板（用于之后的规划）</option>
          <option value="today">模板＋今天的单日设置</option>
        </select>
      </label>
    </>
  );
}
export function useRoutineSettings() {
  const { state, ask, update, notify } = useStore();
  return () =>
    ask({
      title: '给生活一个自己的节奏',
      body: <SettingsBody state={state} />,
      submit: (f) => {
        const mode = f.get('mode') as Mode;
        const rs = ['起床', '洗漱', '早餐', '午餐', '晚餐', '睡觉'].map((name, i) => ({
          id: name,
          name,
          time: String(f.get(`time${i}`)),
          duration: [0, 15, 25, 40, 40, 0][i],
          done: false,
        }));
        update((s) => {
          s.templates[mode] = rs;
          if (f.get('scope') === 'today') {
            const old = dayData(s);
            s.days[dateKey()] = {
              ...old,
              mode,
              routines: rs.map((r) => ({
                ...r,
                done: old.routines.find((x) => x.id === r.id)?.done || false,
              })),
              previous: old,
            };
          }
        });
        notify('作息已保存。规划会保护这些时间。');
      },
    });
}
