import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useLista } from "../datos";
import { useSesion } from "../sesion";
import { Alert, Button, Card, Cargando, Input, Modal, PageHeader, Select, Table, Textarea } from "../componentes/ui";

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
      {usuario && usuario.ambito === "plataforma" ? <PublicarAgente onListo={setMensaje} onError={setError} /> : null}
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

function PublicarAgente({ onListo, onError }: { onListo: (texto: string) => void; onError: (texto: string) => void }) {
  const [sistema, setSistema] = useState("windows");
  const [version, setVersion] = useState("0.1.0");
  const [cambios, setCambios] = useState("");
  const [actualizador, setActualizador] = useState<File | null>(null);
  const [instalador, setInstalador] = useState<File | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function archivoDe(archivo: File) {
    const buffer = await archivo.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binario = "";
    const bloque = 0x8000;
    for (let i = 0; i < bytes.length; i += bloque) {
      binario += String.fromCharCode(...bytes.subarray(i, i + bloque));
    }
    const hash = await crypto.subtle.digest("SHA-256", buffer);
    const sha256 = [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    return { nombre: archivo.name, sha256, base64: btoa(binario) };
  }

  async function publicar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!actualizador || !instalador) {
      onError("Elegí el instalador y el actualizador");
      return;
    }
    if (actualizador.name === instalador.name) {
      onError("El instalador y el actualizador tienen que llamarse distinto");
      return;
    }
    setOcupado(true);
    onError("");
    try {
      const paquete = await archivoDe(actualizador);
      const setup = await archivoDe(instalador);
      await api("/v1/actualizaciones", {
        method: "POST",
        body: JSON.stringify({
          sistema,
          version: version.trim(),
          cambios: cambios.trim(),
          sha256: paquete.sha256,
          archivoNombre: paquete.nombre,
          archivoBase64: paquete.base64,
          instaladorNombre: setup.nombre,
          instaladorSha256: setup.sha256,
          instaladorBase64: setup.base64,
        }),
      });
      const nombres: Record<string, string> = { windows: "Windows", linux: "Linux", darwin: "macOS" };
      onListo(`Versión ${version.trim()} de ${nombres[sistema] ?? sistema} publicada.`);
      setCambios("");
      setActualizador(null);
      setInstalador(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo publicar la versión");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Card className="mb-4">
      <h2 className="text-base font-semibold text-ink">Publicar agente</h2>
      <p className="mt-1 text-sm text-muted">Sube el instalador para los clientes y el paquete que el agente se aplica solo. Publicar no instala nada.</p>
      <form onSubmit={publicar} className="mt-4 grid gap-3 md:grid-cols-2">
        <Select label="Sistema" value={sistema} onChange={(evento) => setSistema(evento.target.value)}>
          <option value="windows">Windows</option>
          <option value="linux">Linux</option>
          <option value="darwin">macOS</option>
        </Select>
        <Input label="Versión" value={version} onChange={(evento) => setVersion(evento.target.value)} required />
        <div className="md:col-span-2">
          <Textarea label="Cambios de la versión" value={cambios} onChange={(evento) => setCambios(evento.target.value)} required />
        </div>
        <label className="block space-y-1.5 md:col-span-2">
          <span className="text-sm font-medium text-muted">Instalador</span>
          <input type="file" className="block w-full text-sm text-ink" onChange={(evento) => setInstalador(evento.target.files?.[0] ?? null)} required />
        </label>
        <label className="block space-y-1.5 md:col-span-2">
          <span className="text-sm font-medium text-muted">Actualizador automático</span>
          <input type="file" className="block w-full text-sm text-ink" onChange={(evento) => setActualizador(evento.target.files?.[0] ?? null)} required />
        </label>
        <div>
          <Button type="submit" disabled={ocupado}>{ocupado ? "Publicando..." : "Publicar"}</Button>
        </div>
      </form>
    </Card>
  );
}
