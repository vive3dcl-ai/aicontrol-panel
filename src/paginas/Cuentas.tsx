import { useState } from "react";
import { api } from "../api";
import { useLista } from "../datos";
import { etiquetaRol, useSesion, type Usuario } from "../sesion";
import { Alert, Badge, Button, Cargando, Input, Modal, PageHeader, Select, Table } from "../componentes/ui";

type Tenant = { id: string; nombre: string; slug: string };

const rolesTenant = [
  ["user", "Usuario"],
  ["analista", "Analista"],
  ["operador", "Operador"],
  ["responsable_seguridad", "Responsable de seguridad"],
] as const;

const rolesAdmin = [["admin", "Admin"]] as const;
const rolesSuperadmin = [
  ["admin", "Admin"],
  ["superadmin", "Superadmin"],
] as const;

function esCuentaPlataforma(rol: string) {
  return rol === "admin" || rol === "superadmin";
}

export function Cuentas() {
  const { usuario } = useSesion();
  const esPlataforma = usuario?.ambito === "plataforma";
  const esSuperadmin = usuario?.rol === "superadmin";
  const [ver, setVer] = useState("plataforma");
  const ruta = esPlataforma
    ? ver === "plataforma"
      ? "/v1/usuarios"
      : `/v1/usuarios?tenantId=${ver}`
    : "/v1/usuarios";
  const cuentas = useLista<{ usuarios: Usuario[] }>(ruta);
  const tenants = useLista<{ tenants: Tenant[] }>("/v1/tenants");
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [edicion, setEdicion] = useState({ correo: "", nombre: "", clave: "", rol: "user", usuarioSesion: "", grupoIds: [] as string[] });
  const [form, setForm] = useState({ correo: "", nombre: "", clave: "", rol: esPlataforma ? "admin" : "user", tenantId: "" });
  const grupos = useLista<{ grupos: { id: string; nombre: string }[] }>(esPlataforma ? "" : "/v1/grupos");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const rolesPlataforma = esSuperadmin ? rolesSuperadmin : rolesAdmin;
  const viendoTenant = esPlataforma && ver !== "plataforma";
  const opciones = esPlataforma && !viendoTenant ? rolesPlataforma : rolesTenant;

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    const tenantId = viendoTenant ? ver : form.tenantId;
    try {
      await api("/v1/usuarios", {
        method: "POST",
        body: JSON.stringify({
          contrato: 1,
          correo: form.correo.trim(),
          nombre: form.nombre.trim(),
          clave: form.clave,
          rol: form.rol,
          ...(esPlataforma && !esCuentaPlataforma(form.rol) ? { tenantId } : {}),
        }),
      });
      setAbierto(false);
      setForm({ correo: "", nombre: "", clave: "", rol: esPlataforma && !viendoTenant ? "admin" : "user", tenantId: "" });
      setMensaje("Cuenta creada.");
      cuentas.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    }
  }

  async function cambiar(id: string, cuerpo: { rol?: string; activo?: boolean }) {
    setMensaje("");
    setError("");
    try {
      await api(`/v1/usuarios/${id}`, { method: "PATCH", body: JSON.stringify(cuerpo) });
      cuentas.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la cuenta");
    }
  }

  function abrirEdicion(cuenta: Usuario) {
    setError("");
    setEditando(cuenta);
    setEdicion({
      correo: cuenta.correo,
      nombre: cuenta.nombre,
      clave: "",
      rol: cuenta.rol,
      usuarioSesion: cuenta.usuarioSesion ?? "",
      grupoIds: (cuenta.grupos ?? []).map((grupo) => grupo.id),
    });
  }

  async function guardarEdicion(evento: React.FormEvent) {
    evento.preventDefault();
    if (!editando) return;
    setError("");
    try {
      await api(`/v1/usuarios/${editando.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          correo: edicion.correo.trim(),
          nombre: edicion.nombre.trim(),
          rol: edicion.rol,
          ...(edicion.clave ? { clave: edicion.clave } : {}),
          ...(editando.tenantId ? { usuarioSesion: edicion.usuarioSesion } : {}),
          ...(editando.tenantId && !esPlataforma ? { grupoIds: edicion.grupoIds } : {}),
        }),
      });
      setEditando(null);
      setMensaje("Usuario actualizado.");
      cuentas.recargar();
      grupos.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo editar el usuario");
    }
  }

  function nombreTenant(id: string | null) {
    if (!id) return "Plataforma";
    return tenants.datos?.tenants.find((tenant) => tenant.id === id)?.nombre ?? id;
  }

  function opcionesDe(cuenta: Usuario) {
    if (cuenta.tenantId) return rolesTenant;
    return rolesPlataforma;
  }

  return (
    <section>
      <PageHeader
        title="Usuarios"
        subtitle={esPlataforma ? "Usuarios de la plataforma. Cada tenant administra los suyos." : "Usuarios de tu organización."}
        action={
          <Button
            onClick={() => {
              setError("");
              setForm({ correo: "", nombre: "", clave: "", rol: esPlataforma && !viendoTenant ? "admin" : "user", tenantId: "" });
              setAbierto(true);
            }}
          >
            Nuevo usuario
          </Button>
        }
      />
      {esPlataforma ? (
        <div className="mb-4 max-w-sm">
          <Select label="Ver usuarios de" value={ver} onChange={(evento) => setVer(evento.target.value)}>
            <option value="plataforma">Plataforma</option>
            {tenants.datos?.tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>{tenant.nombre}</option>
            ))}
          </Select>
        </div>
      ) : null}
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {error && !abierto ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {cuentas.error ? <div className="mb-4"><Alert inline message={cuentas.error} /></div> : null}
      {cuentas.cargando ? <Cargando /> : null}
      {!cuentas.cargando && cuentas.datos?.usuarios.length === 0 ? <p className="text-sm text-muted">No hay usuarios.</p> : null}
      {cuentas.datos && cuentas.datos.usuarios.length > 0 ? (
        <Table headers={["Nombre", "Email", "Rol", "Organización", "Estado", ""]}>
          {cuentas.datos.usuarios.map((cuenta) => {
            const propia = cuenta.id === usuario?.id;
            const bloqueada = propia || (cuenta.rol === "superadmin" && !esSuperadmin);
            const rolesFila = opcionesDe(cuenta);
            return (
              <tr key={cuenta.id}>
                <td className="px-4 py-3 font-medium text-ink">{cuenta.nombre}</td>
                <td className="px-4 py-3 text-ink">{cuenta.correo}</td>
                <td className="px-4 py-3 text-ink">
                  {bloqueada ? (
                    etiquetaRol(cuenta.rol)
                  ) : (
                    <select
                      aria-label={`Rol de ${cuenta.nombre}`}
                      className="min-h-10 rounded-md border border-line-strong bg-surface px-2 text-sm text-ink"
                      value={cuenta.rol}
                      onChange={(evento) => cambiar(cuenta.id, { rol: evento.target.value })}
                    >
                      {rolesFila.map(([valor, etiqueta]) => (
                        <option key={valor} value={valor}>{etiqueta}</option>
                      ))}
                      {!rolesFila.some(([valor]) => valor === cuenta.rol) ? (
                        <option value={cuenta.rol}>{etiquetaRol(cuenta.rol)}</option>
                      ) : null}
                    </select>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{nombreTenant(cuenta.tenantId)}</td>
                <td className="px-4 py-3">
                  <Badge color={cuenta.activo ? "green" : "red"}>{cuenta.activo ? "Activa" : "Suspendida"}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => abrirEdicion(cuenta)}>Editar</Button>
                    {propia || bloqueada ? null : (
                      <Button variant="secondary" onClick={() => cambiar(cuenta.id, { activo: !cuenta.activo })}>
                        {cuenta.activo ? "Suspender" : "Activar"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      ) : null}

      <Modal
        open={abierto}
        onClose={() => setAbierto(false)}
        title="Nuevo usuario"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button type="submit" form="form-cuenta">Crear</Button>
          </div>
        }
      >
        <form id="form-cuenta" onSubmit={crear} className="space-y-4">
          {error && abierto ? <Alert inline message={error} /> : null}
          <Input label="Nombre" value={form.nombre} onChange={(evento) => setForm({ ...form, nombre: evento.target.value })} required />
          <Input label="Email" type="email" value={form.correo} onChange={(evento) => setForm({ ...form, correo: evento.target.value })} required />
          <Input label="Contraseña" type="password" minLength={8} value={form.clave} onChange={(evento) => setForm({ ...form, clave: evento.target.value })} required />
          <Select label="Rol" value={form.rol} onChange={(evento) => setForm({ ...form, rol: evento.target.value })}>
            {opciones.map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </Select>
          {esPlataforma && !viendoTenant && !esCuentaPlataforma(form.rol) ? (
            <Select label="Tenant" value={form.tenantId} onChange={(evento) => setForm({ ...form, tenantId: evento.target.value })} required>
              <option value="">Elige un tenant</option>
              {tenants.datos?.tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>{tenant.nombre}</option>
              ))}
            </Select>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(editando)}
        onClose={() => setEditando(null)}
        title="Editar usuario"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button type="submit" form="form-editar-usuario">Guardar</Button>
          </div>
        }
      >
        <form id="form-editar-usuario" onSubmit={guardarEdicion} className="space-y-4">
          {error && editando ? <Alert inline message={error} /> : null}
          <Input label="Nombre" value={edicion.nombre} onChange={(evento) => setEdicion({ ...edicion, nombre: evento.target.value })} required />
          <Input label="Email" type="email" value={edicion.correo} onChange={(evento) => setEdicion({ ...edicion, correo: evento.target.value })} required />
          <Input label="Contraseña nueva" type="password" value={edicion.clave} onChange={(evento) => setEdicion({ ...edicion, clave: evento.target.value })} placeholder="Vacío para no cambiarla" />
          <Select label="Rol" value={edicion.rol} onChange={(evento) => setEdicion({ ...edicion, rol: evento.target.value })} disabled={editando?.id === usuario?.id}>
            {(editando ? opcionesDe(editando) : opciones).map(([valor, etiqueta]) => (
              <option key={valor} value={valor}>{etiqueta}</option>
            ))}
          </Select>
          {editando?.tenantId ? (
            <>
              <Input
                label="Usuario de sesión"
                value={edicion.usuarioSesion}
                onChange={(evento) => setEdicion({ ...edicion, usuarioSesion: evento.target.value })}
                placeholder="El nombre con el que entra al equipo"
              />
              {!esPlataforma ? <fieldset>
                <legend className="text-sm font-medium text-muted">Grupos</legend>
                <ul className="mt-2 space-y-2">
                  {(grupos.datos?.grupos ?? []).map((grupo) => (
                    <li key={grupo.id}>
                      <label className="flex items-center gap-2 text-sm text-ink">
                        <input
                          type="checkbox"
                          checked={edicion.grupoIds.includes(grupo.id)}
                          onChange={() => setEdicion({
                            ...edicion,
                            grupoIds: edicion.grupoIds.includes(grupo.id)
                              ? edicion.grupoIds.filter((id) => id !== grupo.id)
                              : [...edicion.grupoIds, grupo.id],
                          })}
                        />
                        {grupo.nombre}
                      </label>
                    </li>
                  ))}
                  {(grupos.datos?.grupos.length ?? 0) === 0 ? <li className="text-sm text-muted">Todavía no hay grupos.</li> : null}
                </ul>
              </fieldset> : null}
            </>
          ) : null}
        </form>
      </Modal>
    </section>
  );
}
