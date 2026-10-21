import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { etiquetaRol } from "../sesion";

export function MenuUsuario({
  nombre,
  correo,
  rol,
  ambito,
  onSalir,
}: {
  nombre: string;
  correo: string;
  rol: string;
  ambito?: string;
  onSalir: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const iniciales = nombre
    .split(" ")
    .map((parte) => parte[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    if (!abierto) return;
    const fuera = (evento: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAbierto(false);
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface px-2 py-1.5 transition hover:border-line-strong hover:bg-surface-muted"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-ink">{iniciales}</div>
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-ink sm:block">{nombre}</span>
        <svg className={`h-4 w-4 text-muted transition ${abierto ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {abierto ? (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-md border border-line bg-surface shadow-[var(--app-shadow)]">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-medium text-ink">{nombre}</p>
            <p className="truncate text-xs text-muted">{correo}</p>
            <p className="truncate text-xs text-muted">{etiquetaRol(rol, ambito)}</p>
          </div>
          <div className="p-1">
            <Link
              to="/cuenta"
              role="menuitem"
              onClick={() => setAbierto(false)}
              className="flex min-h-10 items-center rounded-md px-3 py-2 text-sm text-ink transition hover:bg-surface-muted"
            >
              Mi cuenta
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAbierto(false);
                onSalir();
              }}
              className="flex min-h-10 w-full items-center rounded-md px-3 py-2 text-left text-sm text-ink transition hover:bg-surface-muted"
            >
              Salir
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
