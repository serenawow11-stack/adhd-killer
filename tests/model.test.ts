import { test, expect } from 'vitest';
import { blank, pause, spent, assignCurrent, nextHour } from '../src/lib/model';
import { dateKey } from '../src/lib/planning';
test('暂停以小时边界截断，不把无人确认的后续小时计入', () => {
  const s = blank(),
    start = +new Date('2026-09-22T09:45:00');
  s.running = { taskId: 't', start };
  pause(s, start + 3600000);
  expect(s.logs[0].end).toBe(nextHour(start));
  expect(s.logs[0].end - start).toBe(15 * 60000);
  expect(s.running).toBeNull();
});
test('校正保留原始记录，后续投入累加，完成状态独立', () => {
  const s = blank(),
    t = { id: 'a', title: 'a', date: '2026-09-22', estimate: 180, base: 0, done: false };
  s.tasks = [t];
  s.logs = [{ id: 'l', taskId: 'a', start: 0, end: 120 * 60000 }];
  s.corrections = [{ id: 'c', taskId: 'a', at: 121 * 60000, delta: -30 }];
  expect(spent(s, t, 122 * 60000)).toBe(90);
  s.logs.push({ id: 'n', taskId: 'a', start: 122 * 60000, end: 152 * 60000 });
  expect(spent(s, t, 153 * 60000)).toBe(120);
  expect(t.done).toBe(false);
});
test('当前换任务保留过去计划片段和未来时段', () => {
  const s = blank(),
    now = new Date('2026-09-22T10:20:00'),
    d = dateKey(now);
  s.plans[d] = [{ taskId: 'old', start: 9 * 60, duration: 180 }];
  assignCurrent(s, 'new', now);
  expect(s.plans[d]).toEqual([
    { taskId: 'old', start: 540, duration: 80 },
    { taskId: 'old', start: 660, duration: 60 },
    { taskId: 'new', start: 620, duration: 40 },
  ]);
});
