export type Mode = 'healthy' | 'free';
export interface Task {
  id: string;
  title: string;
  date: string;
  estimate: number;
  base: number;
  done: boolean;
  note?: string;
  completedAt?: number | null;
}
export interface Slot {
  taskId: string;
  start: number;
  duration: number;
}
export interface Routine {
  id: string;
  name: string;
  time: string;
  duration: number;
  done: boolean;
  completedAt?: number | null;
}
export interface Day {
  mode: Mode | null;
  routines: Routine[];
  taskIds?: string[];
  previous?: Day;
}
export interface Timer {
  taskId: string;
  start: number;
}
export interface Log extends Timer {
  id: string;
  end: number;
}
export interface Intent {
  title: string;
  start: number;
  due: number;
  returnTitle: string;
}
export interface Session extends Intent {
  id: string;
  end: number;
  completed: boolean;
}
export interface Correction {
  id: string;
  taskId: string;
  at: number;
  delta: number;
  oldEstimate?: number;
}
export interface DraftRow {
  id: string;
  title: string;
  duration: number;
  suggested: boolean;
  start: number | null;
}
export interface Draft {
  id: string;
  date: string;
  mode: Mode;
  routines: Routine[];
  rows: DraftRow[];
}
export interface State {
  version: 3;
  tasks: Task[];
  plans: Record<string, Slot[]>;
  intent: Intent | null;
  sessions: Session[];
  running: Timer | null;
  pendingTimer?: Timer | null;
  logs: Log[];
  corrections: Correction[];
  templates: Record<Mode, Routine[] | null>;
  days: Record<string, Day>;
  reviews: Record<string, { text: string; confirmedAt: number }>;
  notes: Record<string, string>;
  draft: Draft | null;
  planInput?: string;
}
