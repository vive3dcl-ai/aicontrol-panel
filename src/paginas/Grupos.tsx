import { useState } from "react";
import { api } from "../api";
import { useLista } from "../datos";
import { ControlesListado, tituloOrden, useListado } from "../listado";
import { Alert, Button, Cargando, Input, Modal, PageHeader } from "../componentes/ui";

type Miembro = { id: string; usuarioId: string; nombre: string; correo: string; usuarioSesion: string | null };
type Grupo = { id: string; nombre: string; miembros: Miembro[] };
type Cuenta = { id: string; nombre: string; correo: string; usuarioSesion?: string | null };

export function Grupos() {
  const grupos = useLista<{ grupos: Grupo[] }>("/v1/grupos");
  const cuentas = useLista<{ usuarios: Cuenta[] }>("/v1/usuarios");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [editando, setEditando] = useState<Grupo | null>(null);
  const [nombre, setNombre] = useState("");
  const [marcados, setMarcados] = useState<string[]>([]);
  const lista = useListado(grupos.datos?.grupos ?? [], (grupo) => `${grupo.nombre} ${grupo.miembros.map((miembro) => miembro.nombre).join(" ")}`, (grupo) => grupo.nombre);

  function abrir(grupo: Grupo) {
    setError("");
    setEditando(grupo);
    setNombre(grupo.nombre);
    setMarcados(grupo.miembros.map((miembro) => miembro.usuarioId));
  }

  function alternar(id: string) {
    setMarcados((actual) => (actual.includes(id) ? actual.filter((item) => item !== id) : [...actual, id]));
  }

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    try {
      await api("/v1/grupos", { method: "POST", body: JSON.stringify({ nombre: nombreNuevo }) });
      setCreando(false);
      setNombreNuevo("");
      setMensaje("Grupo creado.");
      grupos.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el grupo");
    }
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!editando) return;
    setError("");
    try {
      await api(`/v1/grupos/${editando.id}`, {
        method: "PUT",
        body: JSON.stringify({ nombre, usuarios: marcados }),
      });
      setEditando(null);
      setMensaje("Grupo actualizado.");
      grupos.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el grupo");
    }
  }

  async function quitar(grupo: Grupo) {
    setError("");
    try {
      await api(`/v1/grupos/${grupo.id}`, { method: "DELETE" });
      setMensaje("Grupo quitado.");
      grupos.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar el grupo");
    }
  }

  return (
    <section>
      <PageHeader
        title="Grupos"
        subtitle="Reúnen usuarios de la organización para aplicarles una política de una vez. El agente reconoce a quien coincide con el usuario de sesión del equipo."
        action={<Button onClick={() => { setError(""); setCreando(true); }}>Nuevo grupo</Button>}
      />
      {grupos.error ? <div className="mb-4"><Alert inline message={grupos.error} /></div> : null}
      {grupos.cargando ? <Cargando /> : null}
      {!grupos.cargando ? (
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
                  <th className="px-4 py-3 text-left font-medium text-muted">
                    <button type="button" className="hover:text-ink" onClick={() => lista.cambiarOrden("nombre", (grupo) => grupo.nombre)}>
                      {tituloOrden("Nombre", lista.orden === "nombre" || lista.orden === "inicial", lista.direccion)}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted">
                    <button type="button" className="hover:text-ink" onClick={() => lista.cambiarOrden("cantidad", (grupo) => String(grupo.miembros.length).padStart(4, "0"))}>
                      {tituloOrden("Usuarios", lista.orden === "cantidad", lista.direccion)}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lista.filas.map((grupo) => (
                  <tr key={grupo.id}>
                    <td className="px-4 py-3 font-medium text-ink">{grupo.nombre}</td>
                    <td className="px-4 py-3 text-muted">{grupo.miembros.length}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => abrir(grupo)}>Editar</Button>
                        <Button variant="secondary" onClick={() => void quitar(grupo)}>Quitar</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lista.total === 0 ? <p className="mt-3 text-sm text-muted">No hay grupos.</p> : null}
        </>
      ) : null}

      <Modal
        open={creando}
        onClose={() => setCreando(false)}
        title="Nuevo grupo"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCreando(false)}>Cancelar</Button>
            <Button type="submit" form="form-grupo-nuevo">Crear</Button>
          </div>
        }
      >
        <form id="form-grupo-nuevo" onSubmit={crear} className="space-y-4">
          {error && creando ? <Alert inline message={error} /> : null}
          <Input label="Nombre" value={nombreNuevo} onChange={(evento) => setNombreNuevo(evento.target.value)} required />
        </form>
      </Modal>

      <Modal
        open={Boolean(editando)}
        onClose={() => setEditando(null)}
        title="Editar grupo"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button type="submit" form="form-grupo">Guardar</Button>
          </div>
        }
      >
        <form id="form-grupo" onSubmit={guardar} className="space-y-4">
          {error && editando ? <Alert inline message={error} /> : null}
          <Input label="Nombre" value={nombre} onChange={(evento) => setNombre(evento.target.value)} required />
          <fieldset>
            <legend className="text-sm font-medium text-muted">Usuarios del grupo</legend>
            <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
              {(cuentas.datos?.usuarios ?? []).map((cuenta) => (
                <li key={cuenta.id} className="flex items-start gap-3 rounded-md border border-line px-3 py-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={marcados.includes(cuenta.id)}
                    onChange={() => alternar(cuenta.id)}
                    aria-label={cuenta.nombre}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{cuenta.nombre}</span>
                    <span className="block text-xs text-muted">{cuenta.correo}{cuenta.usuarioSesion ? ` · sesión ${cuenta.usuarioSesion}` : ""}</span>
                  </span>
                </li>
              ))}
              {!cuentas.cargando && (cuentas.datos?.usuarios.length ?? 0) === 0 ? <li className="text-sm text-muted">No hay usuarios en la organización.</li> : null}
            </ul>
          </fieldset>
        </form>
      </Modal>
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {error && !creando && !editando ? <Alert message={error} onClose={() => setError("")} /> : null}
    </section>
  );
}
