import { useState } from "react";
import { api } from "../api";
import { fecha, useLista } from "../datos";
import { Alert, Button, Cargando, Input, PageHeader, Table, Textarea } from "../componentes/ui";

type Factura = {
  id: string;
  numero: number;
  organizacion: string;
  total: string;
  vence: string;
  estado: string;
  documento: string;
};

export function Pagos() {
  const lista = useLista<{ facturas: Factura[] }>("/v1/facturas");
  const [elegida, setElegida] = useState("");
  const [monto, setMonto] = useState("");
  const [fechaPago, setFechaPago] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  function elegir(factura: Factura) {
    setElegida(factura.id);
    setMonto(factura.total);
    setError("");
  }

  async function registrar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!elegida) return;
    setError("");
    try {
      await api(`/v1/facturas/${elegida}/pago`, {
        method: "POST",
        body: JSON.stringify({ monto: Number(monto), fecha: fechaPago || undefined, nota }),
      });
      setMensaje("Pago registrado.");
      setNota("");
      setElegida("");
      lista.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el pago");
    }
  }

  const pendientes = lista.datos?.facturas.filter((factura) => factura.estado === "pendiente") ?? [];
  const elegidaFila = pendientes.find((factura) => factura.id === elegida);

  return (
    <section>
      <PageHeader
        title="Pagos"
        subtitle="Un pago manual marca la factura como pagada. Volver de un checkout no la paga: lo confirma el aviso del medio."
      />
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {error ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {lista.error ? <div className="mb-4"><Alert inline message={lista.error} /></div> : null}
      {lista.cargando ? <Cargando /> : null}
      {elegidaFila ? (
        <form onSubmit={registrar} className="mb-6 max-w-xl space-y-4 rounded-md border border-line bg-surface p-4">
          <p className="text-sm text-ink">Factura {elegidaFila.numero} de {elegidaFila.organizacion}, total {elegidaFila.total} USD.</p>
          <Input label="Monto en dólares" type="number" min="0" step="0.01" value={monto} onChange={(evento) => setMonto(evento.target.value)} required />
          <Input label="Fecha del pago" type="date" value={fechaPago} onChange={(evento) => setFechaPago(evento.target.value)} />
          <Textarea label="Nota" value={nota} onChange={(evento) => setNota(evento.target.value)} />
          <div className="flex gap-2">
            <Button type="submit">Registrar pago</Button>
            <Button variant="secondary" onClick={() => setElegida("")}>Cancelar</Button>
          </div>
        </form>
      ) : null}
      {lista.datos ? (
        <Table headers={["Nº", "Organización", "Documento", "Total", "Vence", "Estado", ""]}>
          {lista.datos.facturas.map((factura) => (
            <tr key={factura.id}>
              <td className="px-4 py-3 text-ink">{factura.numero}</td>
              <td className="px-4 py-3 text-ink">{factura.organizacion}</td>
              <td className="px-4 py-3 text-muted">{factura.documento}</td>
              <td className="px-4 py-3 text-ink">{factura.total} USD</td>
              <td className="px-4 py-3 text-muted">{fecha(factura.vence)}</td>
              <td className="px-4 py-3 text-ink">{factura.estado}</td>
              <td className="px-4 py-3 text-right">
                {factura.estado === "pendiente" ? <Button variant="secondary" onClick={() => elegir(factura)}>Pagar</Button> : null}
              </td>
            </tr>
          ))}
        </Table>
      ) : null}
      {lista.datos && lista.datos.facturas.length === 0 ? <p className="text-sm text-muted">Todavía no hay facturas.</p> : null}
    </section>
  );
}
