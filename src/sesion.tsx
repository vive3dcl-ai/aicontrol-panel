import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, guardarToken, tokenGuardado, type Ambito } from "./api";

export type AmbitoSesion = "plataforma" | "tenant" | "soporte";

export type Usuario = {
  id: string;
  correo: string;
  nombre: string;
  rol: string;
  activo: boolean;
  tenantId: string | null;
  tenantNombre?: string | null;
  tenantSlug?: string | null;
  ambito?: AmbitoSesion;
  usuarioSesion?: string | null;
  grupos?: { id: string; nombre: string }[];
  debeCambiarClave?: boolean;
  mfaActivo?: boolean;
};

type Sesion = {
  usuario: Usuario | null;
  listo: boolean;
  entrar: (correo: string, clave: string, ambito?: Ambito, codigo?: string) => Promise<"ok" | "mfa">;
  fijarUsuario: (usuario: Usuario) => void;
  entrarSoporte: (tenantId: string) => Promise<void>;
  salirSoporte: () => Promise<void>;
  salir: () => void;
};

const Contexto = createContext<Sesion | null>(null);

export function ProveedorSesion({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    if (usuario) sessionStorage.setItem("gobernanza-puerta", puertaDeSesion(usuario));
  }, [usuario]);

  useEffect(() => {
    if (!tokenGuardado()) {
      setListo(true);
      return;
    }
    api<{ usuario: Usuario }>("/v1/sesion/yo")
      .then((datos) => setUsuario(datos.usuario))
      .catch(() => guardarToken(null))
      .finally(() => setListo(true));
  }, []);

  const valor = useMemo<Sesion>(
    () => ({
      usuario,
      listo,
      async entrar(correo: string, clave: string, ambito?: Ambito, codigo?: string) {
        const datos = await api<{ token?: string; usuario?: Usuario; mfaRequerido?: boolean }>("/v1/sesion/login", {
          method: "POST",
          body: JSON.stringify({
            correo,
            clave,
            ...(ambito ? { ambito } : {}),
            ...(codigo ? { codigo } : {}),
          }),
        });
        if (datos.mfaRequerido) return "mfa";
        if (!datos.token || !datos.usuario) throw new Error("No se pudo entrar");
        guardarToken(datos.token);
        setUsuario(datos.usuario);
        return "ok";
      },
      fijarUsuario: setUsuario,
      async entrarSoporte(tenantId: string) {
        const datos = await api<{ token: string; usuario: Usuario }>("/v1/sesion/soporte", {
          method: "POST",
          body: JSON.stringify({ tenantId }),
        });
        guardarToken(datos.token);
        setUsuario(datos.usuario);
      },
      async salirSoporte() {
        const datos = await api<{ token: string; usuario: Usuario }>("/v1/sesion/soporte/salir", { method: "POST" });
        guardarToken(datos.token);
        setUsuario(datos.usuario);
      },
      salir() {
        guardarToken(null);
        setUsuario(null);
      },
    }),
    [usuario, listo],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("Sesión fuera de contexto");
  return valor;
}

export function etiquetaRol(rol: string, ambito?: string) {
  if (ambito === "soporte") return "Soporte";
  const nombres: Record<string, string> = {
    responsable_seguridad: "Responsable de seguridad",
    analista: "Analista",
    operador: "Operador",
    user: "Usuario",
    superadmin: "Superadmin",
    admin: "Admin",
  };
  return nombres[rol] ?? rol;
}

export function esRolPlataforma(rol: string) {
  return rol === "superadmin" || rol === "admin";
}

export function puertaDeSesion(usuario: { rol: string; ambito?: string } | null) {
  if (!usuario) return "/login";
  if (usuario.ambito === "plataforma" || usuario.ambito === "soporte" || esRolPlataforma(usuario.rol)) {
    return "/admin/login";
  }
  return "/login";
}

export function destinoInicio(rol: string) {
  if (esRolPlataforma(rol)) return "/admin/tenants";
  if (rol === "user") return "/inicio";
  return "/flota";
}

export function navegacion(rol: string) {
  if (esRolPlataforma(rol)) {
    return [
      { to: "/admin/tenants", label: "Tenants" },
      { to: "/admin/cluster", label: "Cluster" },
      { to: "/admin/base-ia", label: "Base de IA" },
      { to: "/admin/ajustes", label: "Ajustes" },
      { to: "/admin/actualizadores", label: "Actualizadores" },
      { to: "/admin/registros", label: "Registros" },
      { to: "/flota", label: "Flota" },
      { to: "/usuarios", label: "Usuarios" },
    ];
  }
  if (rol === "user") {
    return [
      { to: "/inicio", label: "Inicio", end: true },
      { to: "/avisos", label: "Avisos" },
    ];
  }
  const items: { to: string; label: string; end?: boolean }[] = [
    { to: "/flota", label: "Flota" },
    { to: "/actividad", label: "Actividad" },
  ];
  if (rol !== "operador") items.push({ to: "/politicas", label: "Políticas" });
  items.push({ to: "/notificaciones", label: "Notificaciones" });
  items.push({ to: "/avisos", label: "Avisos" });
  if (rol === "responsable_seguridad") {
    items.push({ to: "/usuarios", label: "Usuarios" });
    items.push({ to: "/grupos", label: "Grupos" });
    items.push({ to: "/base-ia", label: "Base de IA" });
    items.push({ to: "/actualizaciones", label: "Actualizaciones" });
    items.push({ to: "/ajustes", label: "Ajustes" });
  }
  return items;
}

export function puedeGestionarCuentas(rol: string) {
  return esRolPlataforma(rol) || rol === "responsable_seguridad";
}
