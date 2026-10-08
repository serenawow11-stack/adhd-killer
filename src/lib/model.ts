import type { State, Task, Day, Mode } from './types';
import { dateKey, overlap } from './planning';
export const uid = () => crypto.randomUUID();
export const modeName = (m: Mode | null) =>
  m === 'healthy' ? '健康日' : m === 'free' ? '放纵日' : '待设置';
export const mins = (n: number) =>
  n >= 60 ? `${Math.round(n / 6) / 10}h` : `${Math.round(n)} 分钟`;
export const hm = (n: number) =>
  new Date(n).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
export const blank = (): State => ({
  version: 3,
  tasks: [],
  plans: {},
  intent: null,
  sessions: [],
  running: null,
  logs: [],
  corrections: [],
  templates: { healthy: null, free: null },
  days: {},
  reviews: {},
  draft: null,
  notes: {},
});
export const dayData = (s: State, d = dateKey()): Day => s.days[d] || { mode: null, routines: [] };
export function spent(s: State, t: Task, at = Date.now()): number {
  let n = t.base || 0;
  for (const l of s.logs.filter((l) => l.taskId === t.id))
    n += Math.max(0, Math.min(l.end, at) - l.start) / 60000;
  for (const c of s.corrections.filter((c) => c.taskId === t.id && c.at <= at)) n += c.delta;
  if (s.running?.taskId === t.id)
    n += Math.max(0, Math.min(at, nextHour(s.running.start)) - s.running.start) / 60000;
  return Math.max(0, n);
}
export function nextHour(time: number) {
  let d = new Date(time);
  d.setMinutes(60, 0, 0);
  return +d;
}
export function pause(s: State, at = Date.now()) {
  if (s.running) {
    s.logs.push({
      ...s.running,
      end: Math.max(s.running.start, Math.min(at, nextHour(s.running.start))),
      id: uid(),
    });
    s.running = null;
  }
}
export function currentTask(s: State, now = new Date()) {
  const m = now.getHours() * 60 + now.getMinutes();
  const slot = (s.plans[dateKey(now)] || [])
    .filter((p) => m >= p.start && m < p.start + p.duration)
    .at(-1);
  return s.tasks.find((t) => t.id === slot?.taskId);
}
export function assignCurrent(s: State, id: string, now = new Date()) {
  pause(s, +now);
  const h = now.getHours(),
    m = h * 60 + now.getMinutes(),
    d = dateKey(now);
  s.plans[d] = (s.plans[d] || []).flatMap((p) => {
    if (!overlap(m, (h + 1) * 60, p.start, p.start + p.duration)) return [p];
    const parts = [];
    if (p.start < m) parts.push({ ...p, duration: m - p.start });
    if (p.start + p.duration > (h + 1) * 60)
      parts.push({ ...p, start: (h + 1) * 60, duration: p.start + p.duration - (h + 1) * 60 });
    return parts;
  });
  s.plans[d].push({ taskId: id, start: m, duration: (h + 1) * 60 - m });
}
export const routines = (free = false) =>
  ['起床', '洗漱', '早餐', '午餐', '晚餐', '睡觉'].map((name, i) => ({
    id: name,
    name,
    time: (free
      ? ['09:00', '09:10', '09:30', '13:00', '19:00', '23:50']
      : ['07:30', '07:40', '08:00', '12:30', '18:30', '23:00'])[i],
    duration: [0, 15, 25, 40, 40, 0][i],
    done: false,
  }));
export function demoState(): State {
  const s = blank(),
    d = dateKey(),
    h = new Date().getHours();
  s.templates = { healthy: routines(), free: routines(true) };
  s.days[d] = { mode: 'healthy', routines: routines().map((r, i) => ({ ...r, done: i < 3 })) };
  s.tasks = [
    { id: 'demo-1', title: '把作品集的故事讲清楚', date: d, estimate: 180, base: 120, done: false },
    { id: 'demo-2', title: '读几页，一本喜欢的书', date: d, estimate: 30, base: 10, done: false },
    { id: 'demo-3', title: '给房间留一点呼吸的空间', date: d, estimate: 20, base: 20, done: true },
  ];
  s.plans[d] = [
    { taskId: 'demo-1', start: h * 60, duration: 60 },
    ...(h < 23 ? [{ taskId: 'demo-2', start: (h + 1) * 60, duration: 30 }] : []),
  ];
  s.intent = {
    title: '点一份喜欢的晚餐',
    start: Date.now(),
    due: Date.now() + 300000,
    returnTitle: s.tasks[0].title,
  };
  return s;
}
