import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ProveedorNotificaciones, useNotificacionesVivas, veCampana } from "../notificaciones-vivo";
import { useMarca } from "../marca";
import { navegacion, puertaDeSesion, useSesion, type Usuario } from "../sesion";
import { ThemeToggle } from "../tema";
import { Campana } from "./Campana";
import { Marca } from "./ui";
import { MenuUsuario } from "./MenuUsuario";

const enlace = ({ isActive }: { isActive: boolean }) =>
  `block min-h-11 rounded-md border px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? "border-line-strong bg-accent-soft text-ink"
      : "border-transparent text-muted hover:border-line hover:bg-surface-muted hover:text-ink"
  }`;

export function Shell({ children }: { children: ReactNode }) {
  const { usuario } = useSesion();
  if (!usuario) return null;
  return (
    <ProveedorNotificaciones>
      <Marco usuario={usuario}>{children}</Marco>
    </ProveedorNotificaciones>
  );
}

function Marco({ usuario, children }: { usuario: Usuario; children: ReactNode }) {
  const { salir, salirSoporte } = useSesion();
  const marca = useMarca();
  const { sinLeer } = useNotificacionesVivas();
  const navigate = useNavigate();
  const location = useLocation();
  const [cajon, setCajon] = useState(false);

  useEffect(() => {
    setCajon(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!cajon) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [cajon]);

  const rol = usuario.rol;
  const items = navegacion(rol);

  function cerrar() {
    const destino = puertaDeSesion(usuario);
    salir();
    navigate(destino);
  }

  async function volver() {
    try {
      await salirSoporte();
      navigate("/admin/tenants");
    } catch {
      /* La sesión de soporte sigue abierta si la API rechaza la salida. */
    }
  }

  const nav = (
    <nav className="space-y-1">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end ?? false} className={enlace} onClick={() => setCajon(false)}>
          <span className="flex items-center justify-between gap-2">
            {item.label}
            {item.to === "/notificaciones" && sinLeer > 0 ? (
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-label={`${sinLeer} sin leer`} />
            ) : null}
          </span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-app">
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface/95 px-3 backdrop-blur sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={() => setCajon(true)}
            aria-label="Abrir menú"
            aria-expanded={cajon}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line text-muted transition hover:bg-surface-muted hover:text-ink lg:hidden"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <img src="/logo.png" alt={marca.nombre} className="h-8 w-auto max-w-[11rem] object-contain sm:max-w-[14rem]" />
          {usuario.tenantNombre ? <p className="min-w-0 truncate text-xs text-muted">{usuario.tenantNombre}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {veCampana(usuario) ? <Campana /> : null}
          <ThemeToggle />
          <MenuUsuario nombre={usuario.nombre} correo={usuario.correo} rol={rol} ambito={usuario.ambito} onSalir={cerrar} />
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-14 z-20 hidden w-60 flex-col overflow-y-auto border-r border-line bg-sidebar p-3 lg:flex">{nav}</aside>

      <div className={`fixed inset-0 z-40 lg:hidden ${cajon ? "" : "pointer-events-none"}`} aria-hidden={!cajon}>
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setCajon(false)}
          className={`absolute inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 ${cajon ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className={`absolute left-0 top-0 flex h-full w-72 max-w-[88vw] flex-col border-r border-line bg-sidebar shadow-[var(--app-shadow)] transition-transform duration-300 ease-out ${
            cajon ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
        >
          <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
            <div className="flex min-w-0 items-center gap-3">
              <Marca sigla={marca.sigla} />
              <p className="truncate text-sm font-semibold text-ink">{marca.nombre}</p>
            </div>
            <button
              type="button"
              onClick={() => setCajon(false)}
              aria-label="Cerrar menú"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-surface-muted hover:text-ink"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{nav}</div>
        </aside>
      </div>

      <main className="mt-14 min-h-[calc(100vh-3.5rem)] w-full max-w-none overflow-x-hidden px-3 py-4 sm:px-5 lg:ml-60 lg:w-[calc(100%-15rem)] lg:px-6 lg:py-5 2xl:px-8">
        {usuario.ambito === "soporte" ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-accent-soft px-4 py-3">
            <p className="text-sm text-ink">
              Sesión de soporte en <span className="font-medium">{usuario.tenantNombre ?? "este tenant"}</span>. Ves la flota como su administrador.
            </p>
            <button
              type="button"
              onClick={() => void volver()}
              className="min-h-10 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-ink transition hover:bg-surface-muted"
            >
              Volver al panel global
            </button>
          </div>
        ) : null}
        {children}
      </main>
    </div>
  );
}
