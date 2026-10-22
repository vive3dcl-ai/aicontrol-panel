import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useLista } from "../datos";
import { useSesion } from "../sesion";
import { Alert, Button, Cargando, Input, Modal, PageHeader, Table } from "../componentes/ui";

type Tenant = { id: string; nombre: string; slug: string };

export function Tenants() {
  const { usuario, entrarSoporte } = useSesion();
  const navigate = useNavigate();
  const lista = useLista<{ tenants: Tenant[] }>("/v1/tenants");
  const puedeEntrar = usuario?.rol === "superadmin" && usuario.ambito !== "soporte";
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [editando, setEditando] = useState<Tenant | null>(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    try {
      await api("/v1/tenants", {
        method: "POST",
        body: JSON.stringify({ contrato: 1, nombre: nombre.trim(), slug: slug.trim().toLowerCase() }),
      });
      setAbierto(false);
      setNombre("");
      setSlug("");
      setMensaje("Tenant creado.");
      lista.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el tenant");
    }
  }

  async function renombrar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!editando) return;
    setError("");
    try {
      await api(`/v1/tenants/${editando.id}`, {
        method: "PATCH",
        body: JSON.stringify({ nombre: nombreEdit.trim() }),
      });
      setEditando(null);
      setMensaje("Tenant actualizado.");
      lista.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el tenant");
    }
  }

  return (
    <section>
      <PageHeader
        title="Tenants"
        subtitle="Cada organización tiene su flota y su admin. El superadmin puede entrar para dar soporte."
        action={<Button onClick={() => { setError(""); setAbierto(true); }}>Nuevo tenant</Button>}
      />
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {error && !abierto && !editando ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {lista.error ? <div className="mb-4"><Alert inline message={lista.error} /></div> : null}
      {lista.cargando ? <Cargando /> : null}
      {!lista.cargando && lista.datos?.tenants.length === 0 ? <p className="text-sm text-muted">No hay tenants.</p> : null}
      {lista.datos && lista.datos.tenants.length > 0 ? (
        <Table headers={["Nombre", "Slug", ""]}>
          {lista.datos.tenants.map((tenant) => (
            <tr key={tenant.id}>
              <td className="px-4 py-3 font-medium text-ink">{tenant.nombre}</td>
              <td className="px-4 py-3 text-muted">{tenant.slug}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  {puedeEntrar ? (
                    <Button
                      onClick={() => {
                        setError("");
                        void entrarSoporte(tenant.id)
                          .then(() => navigate("/flota"))
                          .catch((err: unknown) => {
                            setError(err instanceof Error ? err.message : "No se pudo entrar al tenant");
                          });
                      }}
                    >
                      Entrar
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setError("");
                      setEditando(tenant);
                      setNombreEdit(tenant.nombre);
                    }}
                  >
                    Editar
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : null}

      <Modal
        open={abierto}
        onClose={() => setAbierto(false)}
        title="Nuevo tenant"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button type="submit" form="form-tenant">Crear</Button>
          </div>
        }
      >
        <form id="form-tenant" onSubmit={crear} className="space-y-4">
          {error && abierto ? <Alert inline message={error} /> : null}
          <Input label="Nombre" value={nombre} onChange={(evento) => setNombre(evento.target.value)} required />
          <Input label="Slug" value={slug} onChange={(evento) => setSlug(evento.target.value)} required autoComplete="off" />
        </form>
      </Modal>

      <Modal
        open={Boolean(editando)}
        onClose={() => setEditando(null)}
        title="Editar tenant"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditando(null)}>Cancelar</Button>
            <Button type="submit" form="form-tenant-edit">Guardar</Button>
          </div>
        }
      >
        <form id="form-tenant-edit" onSubmit={renombrar} className="space-y-4">
          {error && editando ? <Alert inline message={error} /> : null}
          <Input label="Nombre" value={nombreEdit} onChange={(evento) => setNombreEdit(evento.target.value)} required />
          <p className="text-sm text-muted">Slug: {editando?.slug}</p>
        </form>
      </Modal>
    </section>
  );
}
