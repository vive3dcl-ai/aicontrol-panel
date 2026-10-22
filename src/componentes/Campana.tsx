import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fecha } from "../datos";
import { useNotificacionesVivas } from "../notificaciones-vivo";

export function Campana() {
  const { lista, sinLeer, leerTodas, limpiar } = useNotificacionesVivas();
  const [abierto, setAbierto] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const recientes = lista.slice(0, 8);

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

  function abrir() {
    setAbierto((valor) => !valor);
    setConfirmar(false);
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }

  async function marcarTodas() {
    setOcupado(true);
    try {
      await leerTodas();
    } finally {
      setOcupado(false);
    }
  }

  async function borrarTodas() {
    setOcupado(true);
    try {
      await limpiar();
      setConfirmar(false);
      setAbierto(false);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="relative" ref={raiz}>
      <button
        type="button"
        onClick={abrir}
        aria-label={sinLeer > 0 ? `Notificaciones, ${sinLeer} sin leer` : "Notificaciones"}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        className="relative flex h-11 w-11 items-center justify-center rounded-md border border-line text-muted transition hover:bg-surface-muted hover:text-ink"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0" />
        </svg>
        {sinLeer > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" />
        ) : null}
      </button>
      {abierto ? (
        <div
          role="dialog"
          aria-label="Notificaciones recientes"
          className="absolute right-0 z-50 mt-2 flex max-h-[70vh] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-md border border-line bg-surface shadow-[var(--app-shadow)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <p className="text-sm font-medium text-ink">Notificaciones</p>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={ocupado || sinLeer === 0}
                onClick={() => void marcarTodas()}
                className="rounded-md px-2 py-1 text-xs font-medium text-ink transition hover:bg-surface-muted disabled:opacity-40"
              >
                Leer todas
              </button>
              {confirmar ? (
                <button
                  type="button"
                  disabled={ocupado || lista.length === 0}
                  onClick={() => void borrarTodas()}
                  className="rounded-md px-2 py-1 text-xs font-medium text-red-300 transition hover:bg-surface-muted disabled:opacity-40"
                >
                  Confirmar
                </button>
              ) : (
                <button
                  type="button"
                  disabled={ocupado || lista.length === 0}
                  onClick={() => setConfirmar(true)}
                  className="rounded-md px-2 py-1 text-xs font-medium text-muted transition hover:bg-surface-muted disabled:opacity-40"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
          <div className="overflow-y-auto">
            {recientes.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted">No hay notificaciones.</p>
            ) : recientes.map((aviso) => (
              <button
                key={aviso.id}
                type="button"
                onClick={() => {
                  setAbierto(false);
                  navigate(`/notificaciones?aviso=${aviso.id}`);
                }}
                className="block w-full border-b border-line px-3 py-3 text-left transition hover:bg-surface-muted"
              >
                <span className="flex items-start gap-2">
                  {aviso.leida ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-transparent" /> : <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
                  <span className="min-w-0">
                    <span className={`block truncate text-sm ${aviso.leida ? "text-muted" : "font-medium text-ink"}`}>{aviso.titulo}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{aviso.cuerpo}</span>
                    <span className="mt-1 block text-xs text-muted">{aviso.equipo ? `${aviso.equipo} · ` : ""}{fecha(aviso.creadoEn)}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setAbierto(false);
              navigate("/notificaciones");
            }}
            className="border-t border-line px-3 py-2 text-center text-sm font-medium text-ink transition hover:bg-surface-muted"
          >
            Ver todas
          </button>
        </div>
      ) : null}
    </div>
  );
}
