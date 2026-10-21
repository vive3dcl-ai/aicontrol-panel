import { useMemo, useState } from "react";
import { api } from "../api";
import { useLista } from "../datos";
import { ControlesListado, tituloOrden, useListado } from "../listado";
import { Alert, Button, Cargando, Input, Modal, PageHeader, Select } from "../componentes/ui";

type CondicionQuery = { nombre: string; operador: "existe" | "igual"; valor: string };
type Receta = {
  version: 1;
  ruta: { operador: "cualquiera" | "igual" | "prefijo"; valor: string };
  query: CondicionQuery[];
};

type Endpoint = {
  id: string;
  etiqueta: string;
  host: string;
  superficie: string;
  integrado: boolean;
  externo?: boolean;
  receta: Receta;
};

type Proveedor = { id: string; nombre: string; externo?: boolean; endpoints: Endpoint[] };
type Fila = Endpoint & { proveedorId: string; proveedor: string };
type Formulario = { etiqueta: string; host: string; superficie: string; receta: Receta };

const superficies: Record<string, string> = { web: "Web", api: "API", app: "App" };
const recetaCompleta = (): Receta => ({ version: 1, ruta: { operador: "cualquiera", valor: "" }, query: [] });

function formularioDe(endpoint?: Endpoint): Formulario {
  return {
    etiqueta: endpoint?.etiqueta ?? "",
    host: endpoint?.host ?? "",
    superficie: endpoint?.superficie ?? "web",
    receta: endpoint?.receta ?? recetaCompleta(),
  };
}

function resumenReceta(receta: Receta) {
  const partes: string[] = [];
  if (receta.ruta.operador === "igual") partes.push(`ruta = ${receta.ruta.valor}`);
  if (receta.ruta.operador === "prefijo") partes.push(`ruta empieza con ${receta.ruta.valor}`);
  for (const condicion of receta.query) {
    partes.push(condicion.operador === "igual" ? `${condicion.nombre} = ${condicion.valor}` : `${condicion.nombre} existe`);
  }
  return partes.length ? partes.join(" · ") : "Todo el host";
}

export function BaseIa() {
  const catalogo = useLista<{ proveedores: Proveedor[] }>("/v1/catalogo");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [editando, setEditando] = useState<Fila | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(formularioDe());
  const [alta, setAlta] = useState(false);
  const [proveedorNuevo, setProveedorNuevo] = useState("");
  const [pestaña, setPestaña] = useState<"tradicionales" | "shadow">("tradicionales");
  const filas = useMemo(
    () => (catalogo.datos?.proveedores ?? []).flatMap((proveedor) => proveedor.endpoints.map((endpoint) => ({
      ...endpoint,
      proveedorId: proveedor.id,
      proveedor: proveedor.nombre,
    }))),
    [catalogo.datos],
  );
  const visibles = useMemo(
    () => filas.filter((fila) => pestaña === "shadow" ? Boolean(fila.externo) : !fila.externo),
    [filas, pestaña],
  );
  const lista = useListado(
    visibles,
    (fila) => `${fila.proveedor} ${fila.etiqueta} ${fila.host} ${fila.superficie} ${resumenReceta(fila.receta)}`,
    (fila) => fila.proveedor,
  );

  function abrir(fila: Fila) {
    setError("");
    setEditando(fila);
    setFormulario(formularioDe(fila));
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!editando) return;
    setError("");
    try {
      await api(`/v1/catalogo/endpoints/${editando.id}`, { method: "PUT", body: JSON.stringify(formulario) });
      setEditando(null);
      setMensaje("Fórmula de detección actualizada. Los agentes la recibirán en el siguiente heartbeat.");
      catalogo.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la fórmula");
    }
  }

  async function agregar(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    try {
      await api(`/v1/catalogo/proveedores/${proveedorNuevo}/endpoints`, { method: "POST", body: JSON.stringify(formulario) });
      setAlta(false);
      setProveedorNuevo("");
      setFormulario(formularioDe());
      setMensaje("Endpoint y fórmula agregados.");
      catalogo.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar el endpoint");
    }
  }

  async function adoptar(fila: Fila) {
    setError("");
    try {
      await api("/v1/catalogo/shadow/adoptar", { method: "POST", body: JSON.stringify({ host: fila.host }) });
      setMensaje(`${fila.proveedor} pasó a tradicional. Desde Políticas se le puede poner una regla propia.`);
      catalogo.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo adoptar");
    }
  }

  async function quitar(fila: Fila) {
    setError("");
    try {
      await api(`/v1/catalogo/endpoints/${fila.id}`, { method: "DELETE" });
      setMensaje("Endpoint quitado.");
      catalogo.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar el endpoint");
    }
  }

  return (
    <section>
      <PageHeader
        title="Base de IA"
        subtitle={pestaña === "shadow"
          ? "Dominios del feed dinámico que todavía no se adoptaron. Adoptar los pasa a tradicionales para una política propia."
          : "Proveedores de la base propia. Las acciones y alcances se definen en Políticas."}
        action={pestaña === "tradicionales" ? <Button onClick={() => { setError(""); setFormulario(formularioDe()); setProveedorNuevo(""); setAlta(true); }}>Nuevo endpoint</Button> : undefined}
      />
      <div className="mb-4 flex gap-1 border-b border-line">
        <Pestaña activa={pestaña === "tradicionales"} onClick={() => setPestaña("tradicionales")}>Tradicionales</Pestaña>
        <Pestaña activa={pestaña === "shadow"} onClick={() => setPestaña("shadow")}>Shadow AI</Pestaña>
      </div>
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
                  <Th lista={lista} id="proveedor" clave={(fila) => fila.proveedor}>Proveedor</Th>
                  <Th lista={lista} id="endpoint" clave={(fila) => fila.etiqueta}>Endpoint</Th>
                  <Th lista={lista} id="host" clave={(fila) => fila.host}>Host</Th>
                  <Th lista={lista} id="superficie" clave={(fila) => fila.superficie}>Superficie</Th>
                  <Th lista={lista} id="formula" clave={(fila) => resumenReceta(fila.receta)}>Fórmula de detección</Th>
                  <th className="px-4 py-3 text-right font-medium text-muted"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lista.filas.map((fila) => (
                  <tr key={fila.id}>
                    <td className="px-4 py-3 font-medium text-ink">{fila.proveedor}</td>
                    <td className="px-4 py-3 text-ink">{fila.etiqueta}</td>
                    <td className="px-4 py-3 font-mono text-muted">{fila.host}</td>
                    <td className="px-4 py-3 text-muted">{superficies[fila.superficie] ?? fila.superficie}</td>
                    <td className="px-4 py-3 font-mono text-xs text-ink">{resumenReceta(fila.receta)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {fila.externo ? <Button variant="secondary" onClick={() => void adoptar(fila)}>Adoptar</Button> : <Button variant="secondary" onClick={() => abrir(fila)}>Editar fórmula</Button>}
                        {fila.externo || fila.integrado ? null : <Button variant="secondary" onClick={() => void quitar(fila)}>Quitar</Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lista.total === 0 ? <p className="mt-3 text-sm text-muted">{pestaña === "shadow" ? "No hay dominios de Shadow AI para ese filtro." : "No hay endpoints para esa búsqueda."}</p> : null}
        </>
      ) : null}

      <Modal
        open={Boolean(editando)}
        onClose={() => setEditando(null)}
        title={editando ? `Editar fórmula: ${editando.etiqueta}` : "Editar fórmula"}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditando(null)}>Cancelar</Button><Button type="submit" form="form-endpoint">Guardar fórmula</Button></div>}
      >
        <form id="form-endpoint" onSubmit={guardar} className="space-y-4">
          {error && editando ? <Alert inline message={error} /> : null}
          <EditorEndpoint formulario={formulario} onChange={setFormulario} />
        </form>
      </Modal>

      <Modal
        open={alta}
        onClose={() => setAlta(false)}
        title="Nuevo endpoint"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setAlta(false)}>Cancelar</Button><Button type="submit" form="form-alta-endpoint">Agregar</Button></div>}
      >
        <form id="form-alta-endpoint" onSubmit={agregar} className="space-y-4">
          {error && alta ? <Alert inline message={error} /> : null}
          <Select label="Proveedor" value={proveedorNuevo} onChange={(evento) => setProveedorNuevo(evento.target.value)} required>
            <option value="">Elegir</option>
            {catalogo.datos?.proveedores.filter((proveedor) => !proveedor.externo).map((proveedor) => <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</option>)}
          </Select>
          <EditorEndpoint formulario={formulario} onChange={setFormulario} />
        </form>
      </Modal>
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {error && !editando && !alta ? <Alert message={error} onClose={() => setError("")} /> : null}
    </section>
  );
}

function EditorEndpoint({ formulario, onChange }: { formulario: Formulario; onChange: (valor: Formulario) => void }) {
  const receta = formulario.receta;
  function cambiarReceta(nueva: Receta) { onChange({ ...formulario, receta: nueva }); }
  function cambiarCondicion(indice: number, cambio: Partial<CondicionQuery>) {
    const query = receta.query.map((item, actual) => actual === indice ? { ...item, ...cambio } : item);
    cambiarReceta({ ...receta, query });
  }
  return (
    <>
      <Input label="Etiqueta" value={formulario.etiqueta} onChange={(evento) => onChange({ ...formulario, etiqueta: evento.target.value })} required />
      <Input label="Host o patrón de dominio" value={formulario.host} onChange={(evento) => onChange({ ...formulario, host: evento.target.value })} placeholder="www.ejemplo.com" required />
      <Select label="Superficie" value={formulario.superficie} onChange={(evento) => onChange({ ...formulario, superficie: evento.target.value })}>
        <option value="web">Web</option><option value="api">API</option><option value="app">App</option>
      </Select>
      <div className="border-t border-line pt-4">
        <p className="mb-3 text-sm font-medium text-ink">Fórmula HTTP (todas las condiciones deben cumplirse)</p>
        <Select label="Condición de ruta" value={receta.ruta.operador} onChange={(evento) => cambiarReceta({ ...receta, ruta: { ...receta.ruta, operador: evento.target.value as Receta["ruta"]["operador"] } })}>
          <option value="cualquiera">Cualquier ruta</option><option value="igual">Ruta exacta</option><option value="prefijo">Ruta comienza con</option>
        </Select>
        {receta.ruta.operador !== "cualquiera" ? <div className="mt-3"><Input label="Valor de ruta" value={receta.ruta.valor} onChange={(evento) => cambiarReceta({ ...receta, ruta: { ...receta.ruta, valor: evento.target.value } })} placeholder="/search" required /></div> : null}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between"><p className="text-sm font-medium text-ink">Parámetros query</p><Button type="button" variant="secondary" onClick={() => cambiarReceta({ ...receta, query: [...receta.query, { nombre: "", operador: "igual", valor: "" }] })}>Agregar condición</Button></div>
        {receta.query.map((condicion, indice) => (
          <div key={indice} className="grid gap-2 rounded-md border border-line p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
            <Input label="Parámetro" value={condicion.nombre} onChange={(evento) => cambiarCondicion(indice, { nombre: evento.target.value })} placeholder="udm" required />
            <Select label="Comparación" value={condicion.operador} onChange={(evento) => cambiarCondicion(indice, { operador: evento.target.value as CondicionQuery["operador"] })}><option value="igual">Es igual a</option><option value="existe">Existe</option></Select>
            {condicion.operador === "igual" ? <Input label="Valor" value={condicion.valor} onChange={(evento) => cambiarCondicion(indice, { valor: evento.target.value })} placeholder="50" /> : <div />}
            <div className="self-end"><Button type="button" variant="secondary" onClick={() => cambiarReceta({ ...receta, query: receta.query.filter((_, actual) => actual !== indice) })}>Quitar</Button></div>
          </div>
        ))}
        {!receta.query.length ? <p className="text-xs text-muted">Sin condiciones query: la fórmula coincide según host y ruta.</p> : null}
      </div>
    </>
  );
}

function Pestaña({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${activa ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
      {children}
    </button>
  );
}

function Th({ lista, id, clave, children }: { lista: { orden: string; direccion: "asc" | "desc"; cambiarOrden: (id: string, clave: (fila: Fila) => string) => void }; id: string; clave: (fila: Fila) => string; children: string }) {
  return <th className="px-4 py-3 text-left font-medium text-muted"><button type="button" className="hover:text-ink" onClick={() => lista.cambiarOrden(id, clave)}>{tituloOrden(children, lista.orden === id, lista.direccion)}</button></th>;
}
