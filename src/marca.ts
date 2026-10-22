import { useEffect, useState } from "react";

export type MarcaPublica = { nombre: string; sigla: string };

const defecto: MarcaPublica = { nombre: "AIcontrol", sigla: "G" };
let cache: MarcaPublica | null = null;

export function guardarMarca(marca: MarcaPublica) {
  cache = marca;
}

export function useMarca() {
  const [marca, setMarca] = useState<MarcaPublica>(cache ?? defecto);

  useEffect(() => {
    if (cache) {
      setMarca(cache);
      return;
    }
    fetch("/v1/marca")
      .then((respuesta) => respuesta.json() as Promise<MarcaPublica>)
      .then((datos) => {
        if (!datos?.nombre || !datos.sigla) return;
        cache = datos;
        setMarca(datos);
      })
      .catch(() => undefined);
  }, []);

  return marca;
}
