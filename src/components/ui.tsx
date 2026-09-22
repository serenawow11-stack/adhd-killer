import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
export function Button({
  variant = 'quiet',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'soft' | 'quiet' }) {
  return (
    <button
      type={type}
      className={`${variant} inline-flex items-center justify-center gap-1 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 ${className}`}
      {...props}
    />
  );
}
export function Chapter({
  id,
  n,
  title,
  subtitle,
  aside,
  children,
}: {
  id: string;
  n: string;
  title: string;
  subtitle: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="chapter" id={id}>
      <header className="chapter-head">
        <div>
          <span className="number">{n}</span>
          <h2>
            {title}
            <small>{subtitle}</small>
          </h2>
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}
export interface DialogSpec {
  title: string;
  body: ReactNode;
  submit: (data: FormData) => void;
}
export function Modal({
  spec,
  close,
  onError,
}: {
  spec: DialogSpec;
  close: () => void;
  onError: (s: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={close} onClose={close} aria-labelledby="modal-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            spec.submit(new FormData(e.currentTarget));
            close();
          } catch (err) {
            onError(err instanceof Error ? err.message : '无法保存');
          }
        }}
      >
        <div className="row between">
          <h2 id="modal-title">{spec.title}</h2>
          <Button onClick={close} aria-label="关闭">
            ✕
          </Button>
        </div>
        <div id="editor-fields">{spec.body}</div>
        <div className="dialog-actions">
          <Button variant="soft" onClick={close}>
            取消
          </Button>
          <Button variant="primary" type="submit">
            确认保存
          </Button>
        </div>
      </form>
    </dialog>
  );
}
export function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-1 text-xs">
      {label}
      <input {...props} />
    </label>
  );
}
