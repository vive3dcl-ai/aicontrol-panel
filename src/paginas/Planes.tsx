import { useState } from "react";
import { api } from "../api";
import { useLista } from "../datos";
import { Alert, Button, Cargando, Input, Modal, PageHeader, Table } from "../componentes/ui";

type Plan = { id: string; nombre: string; asientos: number; precio: string; demo: boolean };

export function Planes() {
  const lista = useLista<{ planes: Plan[] }>("/v1/planes");
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<Plan | null>(null);
  const [nombre, setNombre] = useState("");
  const [asientos, setAsientos] = useState("5");
  const [precio, setPrecio] = useState("10");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  function abrirNuevo() {
    setError("");
    setNombre("");
    setAsientos("5");
    setPrecio("10");
    setAbierto(true);
  }

  function abrirEdicion(plan: Plan) {
    setError("");
    setEditando(plan);
    setNombre(plan.nombre);
    setAsientos(String(plan.asientos));
    setPrecio(plan.precio);
  }

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    try {
      await api("/v1/planes", {
        method: "POST",
        body: JSON.stringify({ nombre, asientos: Number(asientos), precio: Number(precio) }),
      });
      setAbierto(false);
      setMensaje("Plan creado.");
      lista.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el plan");
    }
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!editando) return;
    setError("");
    try {
      await api(`/v1/planes/${editando.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          nombre,
          asientos: Number(asientos),
          ...(editando.demo ? {} : { precio: Number(precio) }),
        }),
      });
      setEditando(null);
      setMensaje("Plan actualizado.");
      lista.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el plan");
    }
  }

  return (
    <section>
      <PageHeader
        title="Planes"
        subtitle="Cada plan limita los equipos enlazados. El demo no se cobra ni se suspende."
        action={<Button onClick={abrirNuevo}>Nuevo plan</Button>}
      />
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {error && !abierto && !editando ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {lista.error ? <div className="mb-4"><Alert inline message={lista.error} /></div> : null}
      {lista.cargando ? <Cargando /> : null}
      {lista.datos && lista.datos.planes.length > 0 ? (
        <Table headers={["Nombre", "Asientos", "Precio mensual", ""]}>
          {lista.datos.planes.map((plan) => (
            <tr key={plan.id}>
              <td className="px-4 py-3 font-medium text-ink">{plan.nombre}{plan.demo ? " · demo" : ""}</td>
              <td className="px-4 py-3 text-ink">{plan.asientos}</td>
              <td className="px-4 py-3 text-ink">{plan.demo ? "0.00 USD" : `${plan.precio} USD`}</td>
              <td className="px-4 py-3 text-right">
                <Button variant="secondary" onClick={() => abrirEdicion(plan)}>Editar</Button>
              </td>
            </tr>
          ))}
        </Table>
      ) : null}
      <Modal
        open={abierto}
        onClose={() => setAbierto(false)}
        title="Nuevo plan"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setAbierto(false)}>Cancelar</Button><Button type="submit" form="form-plan">Crear</Button></div>}
      >
        <form id="form-plan" onSubmit={crear} className="space-y-4">
          {error && abierto ? <Alert inline message={error} /> : null}
          <Input label="Nombre" value={nombre} onChange={(evento) => setNombre(evento.target.value)} required />
          <Input label="Asientos" type="number" min={1} value={asientos} onChange={(evento) => setAsientos(evento.target.value)} required />
          <Input label="Precio mensual en dólares" type="number" min="0.01" step="0.01" value={precio} onChange={(evento) => setPrecio(evento.target.value)} required />
        </form>
      </Modal>
      <Modal
        open={Boolean(editando)}
        onClose={() => setEditando(null)}
        title="Editar plan"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setEditando(null)}>Cancelar</Button><Button type="submit" form="form-plan-edit">Guardar</Button></div>}
      >
        <form id="form-plan-edit" onSubmit={guardar} className="space-y-4">
          {error && editando ? <Alert inline message={error} /> : null}
          <Input label="Nombre" value={nombre} onChange={(evento) => setNombre(evento.target.value)} required />
          <Input label="Asientos" type="number" min={1} value={asientos} onChange={(evento) => setAsientos(evento.target.value)} required />
          {editando?.demo ? <p className="text-sm text-muted">El demo queda en 0 USD.</p> : (
            <Input label="Precio mensual en dólares" type="number" min="0.01" step="0.01" value={precio} onChange={(evento) => setPrecio(evento.target.value)} required />
          )}
        </form>
      </Modal>
    </section>
  );
}
