import { useState } from "react";
import { api } from "../api";
import { useLista } from "../datos";
import { Alert, Badge, Button, Card, Cargando, Input, Modal, PageHeader, Select } from "../componentes/ui";

type Replica = {
  id: string;
  nombre: string;
  rol: string;
  url: string;
  peso: number;
  activa: boolean;
  ok: boolean;
  ms: number;
  detalle: string;
};

type Cluster = {
  proceso: { modo: string; segundos: number; ok: boolean };
  postgres: { ok: boolean; ms: number; detalle: string };
  carga: { equipos: number; equiposVivos: number };
  hosts: { panel: string; agentes: string };
  replicas: Replica[];
};

const modos: Record<string, string> = { unico: "Único", panel: "Panel", agentes: "Agentes" };

export function Cluster() {
  const lista = useLista<Cluster>("/v1/plataforma/cluster", 10000);
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("agentes");
  const [url, setUrl] = useState("");
  const [peso, setPeso] = useState("100");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const datos = lista.datos;

  async function agregar(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    try {
      await api("/v1/plataforma/cluster/replicas", {
        method: "POST",
        body: JSON.stringify({ nombre: nombre.trim(), rol, url: url.trim(), peso: Number(peso) }),
      });
      setAbierto(false);
      setNombre("");
      setUrl("");
      setPeso("100");
      setMensaje("Réplica registrada. La salud se consulta en /salud.");
      lista.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la réplica");
    }
  }

  async function quitar(id: string) {
    setError("");
    try {
      await api(`/v1/plataforma/cluster/replicas/${id}`, { method: "DELETE" });
      setMensaje("Réplica quitada del ingreso.");
      lista.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar la réplica");
    }
  }

  return (
    <section>
      <PageHeader
        title="Cluster"
        subtitle="Salud del proceso, de Postgres y de las réplicas de panel y de agentes. Al actualizar, el proxy deja fuera la copia que no responde /salud."
        action={<Button onClick={() => { setError(""); setAbierto(true); }}>Agregar réplica</Button>}
      />
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {error && !abierto ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {lista.error ? <div className="mb-4"><Alert inline message={lista.error} /></div> : null}
      {lista.cargando && !datos ? <Cargando texto="Consultando el cluster..." /> : null}
      {datos ? (
        <>
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Tarjeta titulo="Este proceso" ok={datos.proceso.ok} detalle={`${modos[datos.proceso.modo] ?? datos.proceso.modo} · ${datos.proceso.segundos}s en marcha`} />
            <Tarjeta titulo="Postgres" ok={datos.postgres.ok} detalle={`${datos.postgres.detalle} · ${datos.postgres.ms} ms`} />
            <Tarjeta titulo="Agentes en contacto" ok={datos.carga.equiposVivos > 0 || datos.carga.equipos === 0} detalle={`${datos.carga.equiposVivos} de ${datos.carga.equipos} en los últimos 2 minutos`} />
            <Card>
              <p className="text-sm font-medium text-ink">Direcciones públicas</p>
              <p className="mt-2 text-xs text-muted">Panel</p>
              <p className="truncate font-mono text-sm text-ink">{datos.hosts.panel}</p>
              <p className="mt-2 text-xs text-muted">Agentes</p>
              <p className="truncate font-mono text-sm text-ink">{datos.hosts.agentes}</p>
            </Card>
          </div>
          <div className="overflow-x-auto rounded-md border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-raised">
                  {["Nombre", "Rol", "URL interna", "Peso", "Salud", ""].map((titulo) => (
                    <th key={titulo} className="px-4 py-3 text-left font-medium text-muted">{titulo}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {datos.replicas.map((replica) => (
                  <tr key={replica.id}>
                    <td className="px-4 py-3 font-medium text-ink">{replica.nombre}</td>
                    <td className="px-4 py-3 text-muted">{replica.rol === "panel" ? "Panel" : "Agentes"}</td>
                    <td className="px-4 py-3 font-mono text-muted">{replica.url}</td>
                    <td className="px-4 py-3 text-muted">{replica.peso}</td>
                    <td className="px-4 py-3"><Badge color={replica.ok ? "green" : "red"}>{replica.ok ? `Lista · ${replica.ms} ms` : replica.detalle}</Badge></td>
                    <td className="px-4 py-3 text-right"><Button variant="secondary" onClick={() => void quitar(replica.id)}>Quitar</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {datos.replicas.length === 0 ? <p className="mt-3 text-sm text-muted">Todavía no hay réplicas registradas. Este proceso atiende panel y agentes juntos.</p> : null}
        </>
      ) : null}
      <Modal
        open={abierto}
        onClose={() => setAbierto(false)}
        title="Agregar réplica"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setAbierto(false)}>Cancelar</Button><Button type="submit" form="form-replica">Registrar</Button></div>}
      >
        <form id="form-replica" onSubmit={agregar} className="space-y-4">
          {error && abierto ? <Alert inline message={error} /> : null}
          <Input label="Nombre" value={nombre} onChange={(evento) => setNombre(evento.target.value)} placeholder="agentes-2" required />
          <Select label="Rol" value={rol} onChange={(evento) => setRol(evento.target.value)}>
            <option value="agentes">Agentes</option>
            <option value="panel">Panel</option>
          </Select>
          <Input label="URL interna" value={url} onChange={(evento) => setUrl(evento.target.value)} placeholder="http://127.0.0.1:7591" required />
          <Input label="Peso" type="number" min={1} max={1000} value={peso} onChange={(evento) => setPeso(evento.target.value)} required />
        </form>
      </Modal>
    </section>
  );
}

function Tarjeta({ titulo, ok, detalle }: { titulo: string; ok: boolean; detalle: string }) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">{titulo}</p>
        <Badge color={ok ? "green" : "red"}>{ok ? "Bien" : "Falla"}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted">{detalle}</p>
    </Card>
  );
}
