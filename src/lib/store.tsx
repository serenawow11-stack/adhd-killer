import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { State } from './types';
import { load, storageKey, demo } from './storage';
import { pause, nextHour } from './model';
import type { DialogSpec } from '../components/ui';
import { Modal } from '../components/ui';
interface Store {
  state: State;
  now: number;
  demo: boolean;
  update: (fn: (s: State) => void) => void;
  get: () => State;
  notify: (s: string) => void;
  ask: (spec: DialogSpec) => void;
}
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [initial] = useState(load),
    [state, setState] = useState(initial.state),
    [now, setNow] = useState(Date.now()),
    [message, setMessage] = useState(initial.error || ''),
    [modal, setModal] = useState<DialogSpec | null>(null);
  const ref = useRef(state),
    safe = useRef(!initial.error),
    timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = (s: string) => {
    setMessage(s);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setMessage(''), 6500);
  };
  const update = (fn: (s: State) => void) => {
    const next = structuredClone(ref.current);
    fn(next);
    ref.current = next;
    setState(next);
    if (safe.current)
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        safe.current = false;
        notify('存储不可用，请导出记录，避免关闭页面后丢失。');
      }
  };
  useEffect(() => {
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (ref.current.running && n >= nextHour(ref.current.running.start)) {
        update((s) => pause(s));
        notify('新的小时到了，原任务计时已停止。');
      }
    }, 1000);
    return () => {
      clearInterval(id);
      clearTimeout(timeout.current);
    };
  }, []);
  return (
    <Context.Provider
      value={{ state, now, demo, update, get: () => ref.current, notify, ask: setModal }}
    >
      {children}
      <div id="notice" role="status" aria-live="polite">
        {message}
      </div>
      {modal && <Modal spec={modal} close={() => setModal(null)} onError={notify} />}
    </Context.Provider>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw Error('Missing store');
  return value;
}
