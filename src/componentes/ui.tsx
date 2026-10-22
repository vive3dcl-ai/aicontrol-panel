import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";

const OVERLAY_Z = {
  modal: "z-50",
  alert: "z-[100]",
} as const;

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={`fixed inset-0 ${OVERLAY_Z.modal} flex items-end justify-center sm:items-center sm:p-4`}>
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative flex max-h-[92dvh] w-full flex-col rounded-t-md border border-line bg-surface shadow-[var(--app-shadow)] sm:max-h-[90dvh] sm:max-w-lg sm:rounded-md"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-6 sm:py-4">
          <h2 id="modal-title" className="text-base font-semibold text-ink sm:text-lg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted transition hover:bg-surface-muted hover:text-ink"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
        {footer ? <div className="shrink-0 border-t border-line px-4 py-3 sm:px-6 sm:py-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-md border border-line bg-surface p-4 shadow-sm sm:p-5 ${className}`}>{children}</div>;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: "border-line-strong bg-accent-soft text-ink hover:border-focus hover:bg-line",
    secondary: "border-line bg-surface-raised text-ink hover:border-line-strong hover:bg-surface-muted",
    danger: "border-red-800 bg-red-900 text-red-300 hover:bg-red-800",
  };

  return (
    <button
      type={type}
      {...props}
      className={`inline-flex min-h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

const fieldClass =
  "min-h-10 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-focus";

export function Input({ label, className = "", ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      <input {...props} className={`${fieldClass} ${className}`} />
    </label>
  );
}

export function Textarea({
  label,
  className = "",
  ...props
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      <textarea {...props} className={`${fieldClass} min-h-24 ${className}`} />
    </label>
  );
}

export function Select({
  label,
  children,
  className = "",
  ...props
}: { label: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      <select {...props} className={`${fieldClass} ${className}`}>
        {children}
      </select>
    </label>
  );
}

export function Badge({ children, color = "slate" }: { children: ReactNode; color?: "green" | "red" | "yellow" | "slate" | "indigo" }) {
  const colors = {
    green: "bg-emerald-900/50 text-emerald-300",
    red: "bg-red-900/50 text-red-300",
    yellow: "bg-amber-900/50 text-amber-300",
    slate: "border-line bg-surface-muted text-muted",
    indigo: "border-line-strong bg-accent-soft text-ink",
  };
  return <span className={`inline-flex rounded-md border border-transparent px-2 py-0.5 text-xs font-medium ${colors[color]}`}>{children}</span>;
}

export const PAGE_HEADER_CLASS = "rounded-md border border-line bg-surface p-4 shadow-sm sm:p-5 mb-4";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className={`${PAGE_HEADER_CLASS} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm leading-relaxed text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">{action}</div> : null}
    </div>
  );
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md border border-line bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-raised">
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 text-left font-medium text-muted">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Cargando({ texto = "Cargando..." }: { texto?: string }) {
  return <div className="flex min-h-[12rem] items-center justify-center text-muted">{texto}</div>;
}

export function Marca({ grande = false, sigla = "G", logo = false }: { grande?: boolean; sigla?: string; logo?: boolean }) {
  if (logo) {
    return (
      <div className="mx-auto mb-4 flex justify-center px-4 py-3" title={sigla}>
        <img src="/logo.png" alt="AIcontrol" className="h-16 w-auto max-w-full" />
      </div>
    );
  }
  const medida = grande ? "mx-auto mb-4 h-20 w-20" : "h-8 w-auto";
  return (
    <img src={grande ? "/logo.png" : "/isotipo.png"} alt="AIcontrol" className={`shrink-0 object-contain ${medida}`} title={sigla} />
  );
}

function alertTone(type: "error" | "success" | "warning") {
  if (type === "error") {
    return { title: "Error", shell: "border-red-800 bg-red-950/50 text-red-300", icon: "text-red-300", panel: "border-red-800/80" };
  }
  if (type === "warning") {
    return { title: "Aviso", shell: "border-amber-800 bg-amber-950/50 text-amber-300", icon: "text-amber-300", panel: "border-amber-800/80" };
  }
  return { title: "Listo", shell: "border-emerald-800 bg-emerald-950/50 text-emerald-300", icon: "text-emerald-300", panel: "border-emerald-800/80" };
}

export function Alert({
  message,
  type = "error",
  inline = false,
  onClose,
}: {
  message: ReactNode;
  type?: "error" | "success" | "warning";
  inline?: boolean;
  onClose?: () => void;
}) {
  const tone = alertTone(type);
  const [dismissed, setDismissed] = useState(false);
  const messageKey = typeof message === "string" || typeof message === "number" ? String(message) : null;

  useEffect(() => {
    setDismissed(false);
  }, [messageKey, type, message]);

  const handleClose = () => {
    setDismissed(true);
    onClose?.();
  };

  useEffect(() => {
    if (inline || dismissed || type !== "success") return;
    const timer = window.setTimeout(handleClose, 3500);
    return () => window.clearTimeout(timer);
  }, [inline, dismissed, type, messageKey]);

  useEffect(() => {
    if (inline || dismissed) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [inline, dismissed]);

  useEffect(() => {
    if (inline || dismissed) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [inline, dismissed]);

  if (dismissed || !message) return null;

  if (inline) {
    return <div className={`rounded-md border px-4 py-3 text-sm ${tone.shell}`}>{message}</div>;
  }

  return createPortal(
    <div className={`fixed inset-0 ${OVERLAY_Z.alert} flex items-end justify-center sm:items-center sm:p-4`}>
      <button type="button" aria-label="Cerrar" onClick={handleClose} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-dialog-title"
        className={`relative w-full max-w-md overflow-hidden rounded-t-md border bg-surface shadow-[var(--app-shadow)] sm:rounded-md ${tone.panel}`}
      >
        <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
          <span className={`mt-0.5 shrink-0 ${tone.icon}`}>!</span>
          <div className="min-w-0 flex-1">
            <h2 id="alert-dialog-title" className="text-base font-semibold text-ink">
              {tone.title}
            </h2>
            <div className="mt-1 text-sm text-muted">{message}</div>
          </div>
        </div>
        <div className="flex justify-end border-t border-line px-4 py-3 sm:px-5">
          <Button type="button" onClick={handleClose}>
            Entendido
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
