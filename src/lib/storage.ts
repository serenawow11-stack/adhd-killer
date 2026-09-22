import type { State } from './types';
import { blank, demoState, uid } from './model';
export const demo = new URLSearchParams(location.search).has('demo');
export const storageKey = demo ? 'adhd-killer:demo-v3' : 'adhd-killer:v3';
export function load(): { state: State; error: string | null } {
  try {
    const raw = localStorage.getItem(storageKey);
    let state: State;
    if (raw) {
      const data: unknown = JSON.parse(raw);
      if (!isState(data)) throw Error('本地记录格式异常，原始数据未覆盖。');
      state = { ...blank(), ...data };
    } else {
      state = demo ? demoState() : blank();
      if (!demo) {
        const rawOld = localStorage.getItem('adhd-killer:v1');
        if (rawOld) {
          const old: unknown = JSON.parse(rawOld);
          if (isLegacy(old)) {
            state.tasks = old.tasks.map((t) => ({
              id: t.id,
              title: t.text,
              date: t.day,
              estimate: 0,
              base: 0,
              done: t.done,
            }));
            for (const [k, v] of Object.entries(old.goals)) {
              const i = k.lastIndexOf(':'),
                d = k.slice(0, i),
                h = Number(k.slice(i + 1));
              if (!Number.isInteger(h) || h < 0 || h > 23) continue;
              const task = { id: uid(), title: v, date: d, estimate: 60, base: 0, done: false };
              state.tasks.push(task);
              (state.plans[d] ??= []).push({ taskId: task.id, start: h * 60, duration: 60 });
            }
            if (old.active)
              state.intent = {
                title: old.active.purpose,
                start: old.active.startedAt,
                due: old.active.dueAt,
                returnTitle: '原来的小时目标',
              };
            state.sessions = old.sessions.map((s) => ({
              id: s.id,
              title: s.purpose,
              start: s.startedAt,
              due: s.endedAt,
              end: s.endedAt,
              completed: s.completed,
              returnTitle: '',
            }));
          }
        }
      }
    }
    if (state.running) {
      state.pendingTimer = state.running;
      state.running = null;
    }
    return { state, error: null };
  } catch (e) {
    return {
      state: blank(),
      error: e instanceof Error ? e.message : '无法读取本地数据，原始记录未覆盖。',
    };
  }
}
const record = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);
function isState(x: unknown): x is State {
  return (
    record(x) &&
    x.version === 3 &&
    Array.isArray(x.tasks) &&
    x.tasks.every(
      (t) =>
        record(t) &&
        typeof t.id === 'string' &&
        typeof t.title === 'string' &&
        typeof t.estimate === 'number',
    ) &&
    Array.isArray(x.logs) &&
    Array.isArray(x.sessions) &&
    Array.isArray(x.corrections) &&
    record(x.days) &&
    record(x.plans) &&
    record(x.templates) &&
    record(x.reviews) &&
    record(x.notes)
  );
}
interface Legacy {
  tasks: { id: string; text: string; day: string; done: boolean }[];
  goals: Record<string, string>;
  sessions: {
    id: string;
    purpose: string;
    startedAt: number;
    endedAt: number;
    completed: boolean;
  }[];
  active?: { purpose: string; startedAt: number; dueAt: number };
}
function isLegacy(x: unknown): x is Legacy {
  return (
    record(x) &&
    Array.isArray(x.tasks) &&
    x.tasks.every(
      (t) =>
        record(t) &&
        typeof t.text === 'string' &&
        typeof t.id === 'string' &&
        typeof t.day === 'string',
    ) &&
    record(x.goals) &&
    Object.values(x.goals).every((v) => typeof v === 'string') &&
    Array.isArray(x.sessions)
  );
}
