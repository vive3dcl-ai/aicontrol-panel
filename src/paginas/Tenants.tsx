import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { slugDeNombre } from "../slug";
import { useLista } from "../datos";
import { useSesion } from "../sesion";
import { Alert, Button, Cargando, Input, Modal, PageHeader, Select, Table } from "../componentes/ui";

type Tenant = {
  id: string;
  nombre: string;
  slug: string;
  plan?: string | null;
  asientos?: number | null;
  asientosUsados?: number | null;
  modo?: string;
  habilitadoEn?: string | null;
  servicioSuspendido?: boolean;
};

type Plan = { id: string; nombre: string; demo: boolean };
type Cobro = {
  planId: string | null;
  modo: string;
  prorrogaHasta: string | null;
  razonSocial: string;
  rut: string;
  giro: string;
  direccion: string;
  correo: string;
  asientos: number | null;
  asientosUsados: number;
  habilitadoEn: string | null;
};

export function Tenants() {
  const { usuario, entrarSoporte } = useSesion();
  const navigate = useNavigate();
  const lista = useLista<{ tenants: Tenant[] }>("/v1/tenants");
  const puedeEntrar = usuario?.rol === "superadmin" && usuario.ambito !== "soporte";
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [correoAdmin, setCorreoAdmin] = useState("");
  const [nombreAdmin, setNombreAdmin] = useState("");
  const [activacion, setActivacion] = useState<"correo" | "manual">("correo");
  const [claveEntregada, setClaveEntregada] = useState<{ correo: string; clave: string } | null>(null);
  const [editando, setEditando] = useState<Tenant | null>(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [cobro, setCobro] = useState<Cobro | null>(null);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    try {
      const respuesta = await api<{ claveTemporal?: string; admin: { correo: string } }>("/v1/tenants", {
        method: "POST",
        body: JSON.stringify({
          contrato: 1,
          nombre: nombre.trim(),
          slug: slug.trim().toLowerCase(),
          correo: correoAdmin.trim(),
          ...(nombreAdmin.trim() ? { nombreAdmin: nombreAdmin.trim() } : {}),
          activacion,
        }),
      });
      setAbierto(false);
      setNombre("");
      setSlug("");
      setSlugTocado(false);
      setCorreoAdmin("");
      setNombreAdmin("");
      if (respuesta.claveTemporal) {
        setClaveEntregada({ correo: respuesta.admin.correo, clave: respuesta.claveTemporal });
        setMensaje("");
      } else {
        setClaveEntregada(null);
        setMensaje(`Enviamos la clave temporal a ${respuesta.admin.correo}.`);
      }
      lista.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el tenant");
    }
  }

  async function abrirCobro(tenant: Tenant) {
    setError("");
    try {
      const [detalle, catalogo] = await Promise.all([
        api<{ cobro: Cobro }>(`/v1/tenants/${tenant.id}/cobro`),
        api<{ planes: Plan[] }>("/v1/planes"),
      ]);
      setCobro({ ...detalle.cobro, planId: detalle.cobro.planId });
      setPlanes(catalogo.planes);
      setEditando(tenant);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el cobro");
    }
  }

  async function guardarCobro(evento: React.FormEvent) {
    evento.preventDefault();
    if (!editando || !cobro) return;
    setError("");
    try {
      await api(`/v1/tenants/${editando.id}/cobro`, {
        method: "PATCH",
        body: JSON.stringify({
          planId: cobro.planId,
          modo: cobro.modo,
          prorrogaHasta: cobro.prorrogaHasta ? cobro.prorrogaHasta.slice(0, 10) : "",
          razonSocial: cobro.razonSocial,
          rut: cobro.rut,
          giro: cobro.giro,
          direccion: cobro.direccion,
          correo: cobro.correo,
        }),
      });
      setEditando(null);
      setCobro(null);
      setMensaje("Cobro del tenant actualizado.");
      lista.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el cobro");
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
        action={<Button onClick={() => { setError(""); setSlugTocado(false); setAbierto(true); }}>Nuevo tenant</Button>}
      />
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {claveEntregada ? (
        <Alert
          type="success"
          message={`Activación manual de ${claveEntregada.correo}. Clave temporal ${claveEntregada.clave}. Hay que cambiarla al entrar.`}
          onClose={() => setClaveEntregada(null)}
        />
      ) : null}
      {error && !abierto && !editando ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {lista.error ? <div className="mb-4"><Alert inline message={lista.error} /></div> : null}
      {lista.cargando ? <Cargando /> : null}
      {!lista.cargando && lista.datos?.tenants.length === 0 ? <p className="text-sm text-muted">No hay tenants.</p> : null}
      {lista.datos && lista.datos.tenants.length > 0 ? (
        <Table headers={["Nombre", "Slug", "Plan", "Asientos", "Acciones"]}>
          {lista.datos.tenants.map((tenant) => (
            <tr key={tenant.id}>
              <td className="px-4 py-3 font-medium text-ink">{tenant.nombre}</td>
              <td className="px-4 py-3 text-muted">{tenant.slug}</td>
              <td className="px-4 py-3 text-ink">{tenant.plan ?? "—"}{tenant.servicioSuspendido ? " · suspendido" : ""}</td>
              <td className="px-4 py-3 text-ink">{tenant.asientosUsados ?? 0} de {tenant.asientos ?? "—"}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={() => void abrirCobro(tenant)}>Cobro</Button>
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
                      setCobro(null);
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
          <Input label="Nombre" value={nombre} onChange={(evento) => { setNombre(evento.target.value); if (!slugTocado) setSlug(slugDeNombre(evento.target.value)); }} required />
          <Input label="Slug" value={slug} onChange={(evento) => { setSlugTocado(true); setSlug(evento.target.value); }} required autoComplete="off" />
          <p className="text-sm text-muted">El slug sale del nombre y se puede cambiar.</p>
          <Input label="Correo del admin" type="email" value={correoAdmin} onChange={(evento) => setCorreoAdmin(evento.target.value)} required />
          <Input label="Nombre del admin" value={nombreAdmin} onChange={(evento) => setNombreAdmin(evento.target.value)} placeholder="Si queda vacío, usa el nombre de la organización" />
          <Select label="Activación" value={activacion} onChange={(evento) => setActivacion(evento.target.value === "manual" ? "manual" : "correo")}>
            <option value="correo">Enviar invitación por correo</option>
            <option value="manual">Activación manual</option>
          </Select>
          <p className="text-sm text-muted">
            {activacion === "correo"
              ? "El correo lleva una clave temporal de 6 caracteres. Al entrar hay que cambiarla."
              : "La clave temporal se muestra acá y no se envía. Al entrar hay que cambiarla."}
          </p>
        </form>
      </Modal>

      <Modal
        open={Boolean(editando)}
        onClose={() => { setEditando(null); setCobro(null); }}
        title={cobro ? "Cobro del tenant" : "Editar tenant"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setEditando(null); setCobro(null); }}>Cancelar</Button>
            <Button type="submit" form="form-tenant-edit">Guardar</Button>
          </div>
        }
      >
        <form id="form-tenant-edit" onSubmit={cobro ? guardarCobro : renombrar} className="space-y-4">
          {error && editando ? <Alert inline message={error} /> : null}
          {cobro ? (
            <>
              <p className="text-sm text-muted">{editando?.nombre}. {cobro.asientosUsados} de {cobro.asientos ?? "—"} asientos.{cobro.habilitadoEn ? ` Habilitado ${cobro.habilitadoEn.slice(0, 10)}.` : ""}</p>
              <Select label="Plan" value={cobro.planId ?? ""} onChange={(evento) => setCobro({ ...cobro, planId: evento.target.value })}>
                {planes.map((plan) => <option key={plan.id} value={plan.id}>{plan.nombre}{plan.demo ? " (demo)" : ""}</option>)}
              </Select>
              <Select label="Modo" value={cobro.modo} onChange={(evento) => setCobro({ ...cobro, modo: evento.target.value })}>
                <option value="postpago">Postpago</option>
                <option value="prepago">Prepago</option>
              </Select>
              <Input label="Prórroga hasta" type="date" value={cobro.prorrogaHasta?.slice(0, 10) ?? ""} onChange={(evento) => setCobro({ ...cobro, prorrogaHasta: evento.target.value || null })} />
              <Input label="Razón social" value={cobro.razonSocial} onChange={(evento) => setCobro({ ...cobro, razonSocial: evento.target.value })} />
              <Input label="RUT" value={cobro.rut} onChange={(evento) => setCobro({ ...cobro, rut: evento.target.value })} />
              <Input label="Giro" value={cobro.giro} onChange={(evento) => setCobro({ ...cobro, giro: evento.target.value })} />
              <Input label="Dirección" value={cobro.direccion} onChange={(evento) => setCobro({ ...cobro, direccion: evento.target.value })} />
              <Input label="Correo de facturación" type="email" value={cobro.correo} onChange={(evento) => setCobro({ ...cobro, correo: evento.target.value })} />
            </>
          ) : (
            <>
              <Input label="Nombre" value={nombreEdit} onChange={(evento) => setNombreEdit(evento.target.value)} required />
              <p className="text-sm text-muted">Slug: {editando?.slug}</p>
            </>
          )}
        </form>
      </Modal>
    </section>
  );
}
