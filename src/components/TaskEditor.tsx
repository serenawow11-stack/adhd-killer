import { useStore } from '../lib/store';
import { assignCurrent, uid } from '../lib/model';
import { dateKey } from '../lib/planning';
import { Field } from './ui';
export function useTaskEditor() {
  const { get, ask, update, notify } = useStore();
  return (assign = false) => {
    const opened = `${dateKey()}:${new Date().getHours()}`;
    ask({
      title: assign ? '给这个小时一个方向' : '记下一件想做的事',
      body: (
        <>
          {assign && (
            <label>
              从未完成任务中选择
              <select name="pick">
                <option value="">或在下面新建</option>
                {get()
                  .tasks.filter((t) => !t.done)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <Field
            label="任务名称"
            name="title"
            maxLength={100}
            placeholder="例如：完成作品集的项目背景"
          />
          <Field
            label="预计总用时（分钟）"
            name="estimate"
            type="number"
            min={1}
            max={10080}
            defaultValue={60}
            required
          />
        </>
      ),
      submit: (f) => {
        if (assign && opened !== `${dateKey()}:${new Date().getHours()}`)
          throw Error('已跨小时，请重新选择当前任务');
        const title = String(f.get('title') || '').trim(),
          pick = String(f.get('pick') || '');
        if (!pick && !title) throw Error('请填写名称或选择任务');
        update((s) => {
          let t = assign ? s.tasks.find((t) => t.id === pick) : undefined;
          if (!t) {
            t = {
              id: uid(),
              title,
              date: dateKey(),
              estimate: Number(f.get('estimate')),
              base: 0,
              done: false,
            };
            s.tasks.push(t);
          }
          if (assign) assignCurrent(s, t.id);
        });
        notify(assign ? '这个小时的任务已更新。' : '已放进任务书。');
      },
    });
  };
}
