import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ErrorApi, tokenGuardado } from "./api";
import { puertaDeSesion, useSesion, type Usuario } from "./sesion";

export type Notificacion = {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  equipo: string | null;
  leida: boolean;
  creadoEn: string;
};

type ContextoAvisos = {
  lista: Notificacion[];
  sinLeer: number;
  error: string;
  cargando: boolean;
  activo: boolean;
  leer: (id: string) => Promise<void>;
  leerTodas: () => Promise<void>;
  limpiar: () => Promise<void>;
};

const Contexto = createContext<ContextoAvisos | null>(null);

export function veCampana(usuario: Usuario | null) {
  if (!usuario || usuario.rol === "user") return false;
  return usuario.ambito !== "plataforma";
}

function abrirFlujo(
  alEvento: (nombre: string, datos: string) => void,
  alCerrar: () => void,
): () => void {
  const control = new AbortController();
  const token = tokenGuardado();
  let terminado = false;
  void (async () => {
    try {
      const respuesta = await fetch("/v1/notificaciones/flujo", {
        headers: {
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: control.signal,
      });
      if (respuesta.status === 401) {
        terminado = true;
        alEvento("sesion", "");
        return;
      }
      if (!respuesta.ok || !respuesta.body) return;
      const lector = respuesta.body.getReader();
      const decodificar = new TextDecoder();
      let buffer = "";
      while (!control.signal.aborted) {
        const parte = await lector.read();
        if (parte.done) break;
        buffer += decodificar.decode(parte.value, { stream: true });
        const bloques = buffer.split("\n\n");
        buffer = bloques.pop() ?? "";
        for (const bloque of bloques) {
          let nombre = "message";
          const datos: string[] = [];
          for (const linea of bloque.split("\n")) {
            if (linea.startsWith(":")) continue;
            if (linea.startsWith("event:")) nombre = linea.slice(6).trim();
            else if (linea.startsWith("data:")) datos.push(linea.slice(5).trim());
          }
          if (datos.length) alEvento(nombre, datos.join("\n"));
        }
      }
    } catch {
      if (control.signal.aborted) return;
    } finally {
      if (!control.signal.aborted && !terminado) alCerrar();
    }
  })();
  return () => control.abort();
}

export function ProveedorNotificaciones({ children }: { children: React.ReactNode }) {
  const { usuario, salir } = useSesion();
  const navigate = useNavigate();
  const navegar = useRef(navigate);
  navegar.current = navigate;
  const activo = Boolean(usuario && usuario.rol !== "user");
  const [lista, setLista] = useState<Notificacion[]>([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(activo);

  const salirSiVencio = useCallback((err: unknown) => {
    if (err instanceof ErrorApi && err.status === 401) {
      const destino = puertaDeSesion(usuario);
      salir();
      navigate(destino);
      return true;
    }
    return false;
  }, [navigate, salir, usuario]);

  const cargar = useCallback(async (silencioso = false) => {
    if (!activo) {
      setLista([]);
      setCargando(false);
      return;
    }
    if (!silencioso) setCargando(true);
    try {
      const datos = await api<{ notificaciones: Notificacion[] }>("/v1/notificaciones");
      setLista(datos.notificaciones);
      setError("");
    } catch (err) {
      if (!salirSiVencio(err)) setError(err instanceof Error ? err.message : "Error");
    } finally {
      setCargando(false);
    }
  }, [activo, salirSiVencio]);

  useEffect(() => {
    if (!activo) {
      setLista([]);
      setCargando(false);
      return;
    }
    let cancelado = false;
    let cerrar = () => {};
    let espera = 1000;
    let timer = 0;

    const avisarNavegador = (aviso: Notificacion) => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      if (!document.hidden) return;
      const tarjeta = new Notification(aviso.titulo, { body: aviso.cuerpo, tag: aviso.id });
      tarjeta.onclick = () => {
        window.focus();
        navegar.current(`/notificaciones?aviso=${aviso.id}`);
        tarjeta.close();
      };
    };

    const ciclo = () => {
      if (cancelado) return;
      void cargar(true);
      cerrar = abrirFlujo((nombre, datos) => {
        if (nombre === "sesion") {
          const destino = puertaDeSesion(usuario);
          salir();
          navegar.current(destino);
          return;
        }
        espera = 1000;
        if (nombre === "aviso") {
          const aviso = JSON.parse(datos) as Notificacion;
          setLista((previa) => (previa.some((item) => item.id === aviso.id) ? previa : [aviso, ...previa].slice(0, 200)));
          avisarNavegador(aviso);
          return;
        }
        if (nombre === "cambio" || nombre === "listo") void cargar(true);
      }, () => {
        if (cancelado) return;
        timer = window.setTimeout(ciclo, espera);
        espera = Math.min(espera * 2, 15_000);
      });
    };

    void cargar(false).finally(() => {
      if (!cancelado) ciclo();
    });

    return () => {
      cancelado = true;
      cerrar();
      window.clearTimeout(timer);
    };
  }, [activo, cargar, salir, usuario]);

  const leer = useCallback(async (id: string) => {
    await api(`/v1/notificaciones/${id}/leer`, { method: "POST" });
    setLista((previa) => previa.map((aviso) => (aviso.id === id ? { ...aviso, leida: true } : aviso)));
  }, []);

  const leerTodas = useCallback(async () => {
    await api("/v1/notificaciones/leer-todas", { method: "POST" });
    setLista((previa) => previa.map((aviso) => ({ ...aviso, leida: true })));
  }, []);

  const limpiar = useCallback(async () => {
    await api("/v1/notificaciones", { method: "DELETE" });
    setLista([]);
  }, []);

  const sinLeer = lista.filter((aviso) => !aviso.leida).length;
  const valor = useMemo<ContextoAvisos>(() => ({
    lista,
    sinLeer,
    error,
    cargando,
    activo,
    leer,
    leerTodas,
    limpiar,
  }), [lista, sinLeer, error, cargando, activo, leer, leerTodas, limpiar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useNotificacionesVivas() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("Notificaciones fuera de contexto");
  return valor;
}
