import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ErrorApi } from "./api";
import { puertaDeSesion, useSesion } from "./sesion";

export function fecha(iso: string | null) {
  if (!iso) return "Sin contacto";
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

export function useLista<T>(ruta: string, intervaloMs = 0) {
  const { salir, usuario } = useSesion();
  const navigate = useNavigate();
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback((silencioso?: boolean) => {
    if (!ruta) {
      setDatos(null);
      setCargando(false);
      setError("");
      return;
    }
    if (silencioso !== true) setCargando(true);
    setError("");
    api<T>(ruta)
      .then(setDatos)
      .catch((err: unknown) => {
        if (err instanceof ErrorApi && err.status === 401) {
          const destino = puertaDeSesion(usuario);
          salir();
          navigate(destino);
          return;
        }
        setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => setCargando(false));
  }, [ruta, salir, navigate, usuario?.rol]);

  useEffect(() => {
    recargar();
    if (!intervaloMs) return;
    const id = setInterval(() => recargar(true), intervaloMs);
    return () => clearInterval(id);
  }, [recargar, intervaloMs]);

  return { datos, error, cargando, recargar };
}
