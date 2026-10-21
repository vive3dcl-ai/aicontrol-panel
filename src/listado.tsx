import { useMemo, useState } from "react";
import { Button, Select } from "./componentes/ui";

export function useListado<T>(filas: T[], texto: (fila: T) => string, ordenInicial: (fila: T) => string = () => "") {
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState("inicial");
  const [direccion, setDireccion] = useState<"asc" | "desc">("asc");
  const [tamano, setTamano] = useState(10);
  const [pagina, setPagina] = useState(1);
  const [claveOrden, setClaveOrden] = useState<(fila: T) => string>(() => ordenInicial);

  function cambiarOrden(id: string, clave: (fila: T) => string) {
    setClaveOrden(() => clave);
    setPagina(1);
    if (orden === id) {
      setDireccion((actual) => (actual === "asc" ? "desc" : "asc"));
      return;
    }
    setOrden(id);
    setDireccion("asc");
  }

  const visibles = useMemo(() => {
    const consulta = busqueda.trim().toLowerCase();
    const filtradas = consulta ? filas.filter((fila) => texto(fila).toLowerCase().includes(consulta)) : [...filas];
    filtradas.sort((a, b) => {
      const resultado = claveOrden(a).localeCompare(claveOrden(b), "es", { numeric: true, sensitivity: "base" });
      return direccion === "asc" ? resultado : -resultado;
    });
    return filtradas;
  }, [filas, busqueda, texto, claveOrden, direccion]);

  const paginas = Math.max(1, Math.ceil(visibles.length / tamano));
  const actual = Math.min(pagina, paginas);
  const desde = (actual - 1) * tamano;
  const paginaFilas = visibles.slice(desde, desde + tamano);

  return {
    busqueda,
    setBusqueda: (valor: string) => {
      setBusqueda(valor);
      setPagina(1);
    },
    orden,
    direccion,
    cambiarOrden,
    tamano,
    setTamano: (valor: number) => {
      setTamano(valor);
      setPagina(1);
    },
    pagina: actual,
    setPagina,
    paginas,
    total: visibles.length,
    filas: paginaFilas,
  };
}

export function ControlesListado({
  busqueda,
  onBusqueda,
  tamano,
  onTamano,
  pagina,
  paginas,
  total,
  onPagina,
}: {
  busqueda: string;
  onBusqueda: (valor: string) => void;
  tamano: number;
  onTamano: (valor: number) => void;
  pagina: number;
  paginas: number;
  total: number;
  onPagina: (valor: number) => void;
}) {
  return (
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <label className="block min-w-0 flex-1 space-y-1.5">
        <span className="text-sm font-medium text-muted">Buscar</span>
        <input
          value={busqueda}
          onChange={(evento) => onBusqueda(evento.target.value)}
          placeholder="Filtrar la lista"
          className="min-h-10 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-focus"
        />
      </label>
      <div className="w-full sm:w-40">
        <Select label="Por página" value={String(tamano)} onChange={(evento) => onTamano(Number(evento.target.value))}>
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </Select>
      </div>
      <div className="flex items-center gap-2 pb-0.5">
        <Button variant="secondary" disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}>Anterior</Button>
        <span className="text-sm text-muted">{pagina} / {paginas} · {total}</span>
        <Button variant="secondary" disabled={pagina >= paginas} onClick={() => onPagina(pagina + 1)}>Siguiente</Button>
      </div>
    </div>
  );
}

export function tituloOrden(etiqueta: string, activo: boolean, direccion: "asc" | "desc") {
  if (!activo) return etiqueta;
  return `${etiqueta} ${direccion === "asc" ? "↑" : "↓"}`;
}
