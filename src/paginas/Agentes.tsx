import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import { useLista } from "../datos";
import { ControlesListado, tituloOrden, useListado } from "../listado";
import { Alert, Button, Cargando, Input, Modal, PageHeader, Select } from "../componentes/ui";

type Deteccion = {
  id: string;
  equipo: string;
  pid: number;
  hijos: number[];
  version: string | null;
  ruta: string;
  usuario: string;
  linea: string;
  ocurridoEn: string;
};

type Programa = {
  id: string;
  nombre: string;
  binarioLinux: string | null;
  binarioWindows: string | null;
  binarioMac: string | null;
  accion: string;
  clase?: string;
  activa: boolean;
  detecciones: Deteccion[];
};

type Borrador = {
  nombre: string;
  binarioLinux: string;
  binarioWindows: string;
  binarioMac: string;
  accion: string;
};

const vacio: Borrador = { nombre: "", binarioLinux: "", binarioWindows: "", binarioMac: "", accion: "bloquear" };

const acciones = [
  ["permitir", "Permitir"],
  ["bloquear", "Bloquear"],
] as const;

export function Agentes({ embebido = false, abrir = 0, clase = "escritorio" }: { embebido?: boolean; abrir?: number; clase?: "escritorio" | "navegador" }) {
  const catalogo = useLista<{ programas: Programa[] }>("/v1/programas");
  const etiqueta = clase === "navegador" ? "navegador" : "programa";
  const etiquetaPlural = clase === "navegador" ? "navegadores" : "programas";
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [alta, setAlta] = useState(false);
  const [editando, setEditando] = useState<Programa | null>(null);
  const [viendo, setViendo] = useState<Programa | null>(null);
  const [borrador, setBorrador] = useState<Borrador>(vacio);
  const filas = (catalogo.datos?.programas ?? []).filter((fila) => (fila.clase ?? "escritorio") === clase);
  const lista = useListado(filas, (fila) => `${fila.nombre} ${fila.binarioLinux ?? ""} ${fila.binarioWindows ?? ""} ${fila.binarioMac ?? ""} ${fila.accion}`, (fila) => fila.nombre);
  const detecciones = useMemo(() => viendo?.detecciones ?? [], [viendo]);
  const altaVista = useRef(abrir);

  function abrirAlta() {
    setError("");
    setEditando(null);
    setBorrador(vacio);
    setAlta(true);
  }

  useEffect(() => {
    if (abrir === altaVista.current) return;
    altaVista.current = abrir;
    setError("");
    setEditando(null);
    setBorrador(vacio);
    setAlta(true);
  }, [abrir]);

  function abrirEdicion(programa: Programa) {
    setError("");
    setEditando(programa);
    setBorrador({
      nombre: programa.nombre,
      binarioLinux: programa.binarioLinux ?? "",
      binarioWindows: programa.binarioWindows ?? "",
      binarioMac: programa.binarioMac ?? "",
      accion: programa.accion,
    });
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    const cuerpo = {
      nombre: borrador.nombre,
      binarioLinux: borrador.binarioLinux,
      binarioWindows: borrador.binarioWindows,
      binarioMac: borrador.binarioMac,
      accion: borrador.accion,
      clase,
    };
    try {
      if (editando) {
        await api(`/v1/programas/${editando.id}`, { method: "PUT", body: JSON.stringify(cuerpo) });
        setEditando(null);
        setMensaje(clase === "navegador" ? "Navegador actualizado." : "Programa actualizado.");
      } else {
        await api("/v1/programas", { method: "POST", body: JSON.stringify(cuerpo) });
        setAlta(false);
        setMensaje(clase === "navegador" ? "Navegador agregado." : "Programa agregado.");
      }
      catalogo.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el programa");
    }
  }

  async function cambiar(programa: Programa, activa: boolean) {
    setError("");
    try {
      await api(`/v1/programas/${programa.id}`, { method: "PATCH", body: JSON.stringify({ activa }) });
      setMensaje(activa ? `${etiqueta[0].toUpperCase()}${etiqueta.slice(1)} activado.` : `${etiqueta[0].toUpperCase()}${etiqueta.slice(1)} desactivado.`);
      catalogo.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el programa");
    }
  }

  async function quitar(programa: Programa) {
    setError("");
    try {
      await api(`/v1/programas/${programa.id}`, { method: "DELETE" });
      setMensaje(clase === "navegador" ? "Navegador quitado." : "Programa quitado.");
      catalogo.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar el programa");
    }
  }

  return (
    <section>
      {embebido ? null : (
        <PageHeader
          title={clase === "navegador" ? "Navegadores" : "Agentes"}
          subtitle="Bloquear cierra el proceso a los pocos segundos y avisa en la pantalla. Permitir lo deja correr y guarda la detección."
          action={<Button onClick={abrirAlta}>{clase === "navegador" ? "Nuevo navegador" : "Nuevo programa"}</Button>}
        />
      )}
      {catalogo.error ? <div className="mb-4"><Alert inline message={catalogo.error} /></div> : null}
      {catalogo.cargando ? <Cargando /> : null}
      {!catalogo.cargando ? (
        <>
          <ControlesListado
            busqueda={lista.busqueda}
            onBusqueda={lista.setBusqueda}
            tamano={lista.tamano}
            onTamano={lista.setTamano}
            pagina={lista.pagina}
            paginas={lista.paginas}
            total={lista.total}
            onPagina={lista.setPagina}
          />
          <div className="overflow-x-auto rounded-md border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-raised">
                  <Th lista={lista} id="nombre" clave={(fila) => fila.nombre}>Programa</Th>
                  <Th lista={lista} id="linux" clave={(fila) => fila.binarioLinux ?? ""}>Linux</Th>
                  <Th lista={lista} id="windows" clave={(fila) => fila.binarioWindows ?? ""}>Windows</Th>
                  <Th lista={lista} id="mac" clave={(fila) => fila.binarioMac ?? ""}>macOS</Th>
                  <Th lista={lista} id="accion" clave={(fila) => fila.accion}>Acción</Th>
                  <th className="px-4 py-3 text-right font-medium text-muted"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lista.filas.map((fila) => (
                  <tr key={fila.id}>
                    <td className="px-4 py-3 font-medium text-ink">
                      {fila.nombre}
                      {fila.activa ? null : <span className="font-normal text-muted"> · inactivo</span>}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted">{fila.binarioLinux || "—"}</td>
                    <td className="px-4 py-3 font-mono text-muted">{fila.binarioWindows || "—"}</td>
                    <td className="px-4 py-3 font-mono text-muted">{fila.binarioMac || "—"}</td>
                    <td className="px-4 py-3 text-ink">{etiquetaAccion(fila.accion)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => void cambiar(fila, !fila.activa)}>
                          {fila.activa ? "Desactivar" : "Activar"}
                        </Button>
                        <Button variant="secondary" onClick={() => setViendo(fila)}>Detecciones</Button>
                        <Button variant="secondary" onClick={() => abrirEdicion(fila)}>Editar</Button>
                        <Button variant="secondary" onClick={() => void quitar(fila)}>Quitar</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lista.total === 0 ? <p className="mt-3 text-sm text-muted">No hay {etiquetaPlural} para esa búsqueda.</p> : null}
        </>
      ) : null}

      <Modal
        open={alta || Boolean(editando)}
        onClose={() => { setAlta(false); setEditando(null); }}
        title={editando ? `Editar ${editando.nombre}` : clase === "navegador" ? "Nuevo navegador" : "Nuevo programa"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setAlta(false); setEditando(null); }}>Cancelar</Button>
            <Button type="submit" form="form-programa">Guardar</Button>
          </div>
        }
      >
        <form id="form-programa" onSubmit={guardar} className="space-y-4">
          {error && (alta || editando) ? <Alert inline message={error} /> : null}
          <Input label="Nombre" value={borrador.nombre} onChange={(evento) => setBorrador({ ...borrador, nombre: evento.target.value })} required />
          <Input label="Binario en Linux" value={borrador.binarioLinux} onChange={(evento) => setBorrador({ ...borrador, binarioLinux: evento.target.value })} placeholder="hermes" />
          <Input label="Binario en Windows" value={borrador.binarioWindows} onChange={(evento) => setBorrador({ ...borrador, binarioWindows: evento.target.value })} placeholder="hermes.exe" />
          <Input label="Binario en macOS" value={borrador.binarioMac} onChange={(evento) => setBorrador({ ...borrador, binarioMac: evento.target.value })} placeholder="Hermes" />
          <Select label="Acción" value={borrador.accion} onChange={(evento) => setBorrador({ ...borrador, accion: evento.target.value })}>
            {acciones.map(([id, etiqueta]) => <option key={id} value={id}>{etiqueta}</option>)}
          </Select>
        </form>
      </Modal>

      <Modal
        open={Boolean(viendo)}
        onClose={() => setViendo(null)}
        title={viendo ? `Detecciones de ${viendo.nombre}` : "Detecciones"}
        footer={<div className="flex justify-end"><Button variant="secondary" onClick={() => setViendo(null)}>Cerrar</Button></div>}
      >
        {detecciones.length === 0 ? <p className="text-sm text-muted">Todavía no se abrió en ningún equipo.</p> : (
          <ul className="space-y-3">
            {detecciones.map((deteccion) => (
              <li key={deteccion.id} className="rounded-md border border-line px-3 py-2 text-sm">
                <p className="font-medium text-ink">{deteccion.equipo} · pid {deteccion.pid}</p>
                <p className="text-muted">Hijos: {deteccion.hijos.length ? deteccion.hijos.join(", ") : "ninguno"}</p>
                <p className="text-muted">Versión: {deteccion.version || "sin versión de paquete"}</p>
                <p className="break-all font-mono text-xs text-muted">{deteccion.ruta}</p>
                <p className="text-muted">{new Date(deteccion.ocurridoEn).toLocaleString("es")}</p>
              </li>
            ))}
          </ul>
        )}
      </Modal>
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {error && !alta && !editando ? <Alert message={error} onClose={() => setError("")} /> : null}
    </section>
  );
}

function etiquetaAccion(accion: string) {
  return acciones.find(([id]) => id === accion)?.[1] ?? accion;
}

function Th({
  lista,
  id,
  clave,
  children,
}: {
  lista: { orden: string; direccion: "asc" | "desc"; cambiarOrden: (id: string, clave: (fila: Programa) => string) => void };
  id: string;
  clave: (fila: Programa) => string;
  children: string;
}) {
  return (
    <th className="px-4 py-3 text-left font-medium text-muted">
      <button type="button" className="hover:text-ink" onClick={() => lista.cambiarOrden(id, clave)}>
        {tituloOrden(children, lista.orden === id, lista.direccion)}
      </button>
    </th>
  );
}
