import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { fecha } from "../datos";
import { useSesion } from "../sesion";
import { Alert, Button, Cargando, PageHeader, Table } from "../componentes/ui";

type Factura = {
  id: string;
  numero: number;
  desde: string;
  hasta: string;
  vence: string;
  subtotal: string;
  iva: string;
  total: string;
  documento: string;
  estado: string;
  tasa: string | null;
  totalClp: number | null;
};

type Respuesta = {
  cobro: { suspendido: boolean; gracia: boolean; asientos: number | null; asientosUsados: number; habilitadoEn: string | null };
  medios: { mercadopagoListo: boolean; paypalListo: boolean };
  facturas: Factura[];
};

export function Facturacion() {
  const { usuario } = useSesion();
  const [params] = useSearchParams();
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const puedePagar = usuario?.rol === "responsable_seguridad";

  function cargar() {
    api<Respuesta>("/v1/facturacion")
      .then(setDatos)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudo leer la facturación"));
  }

  useEffect(() => {
    cargar();
    if (params.get("pago") === "recibido") setAviso("Si el medio confirmó el pago, la factura queda pagada. Si sigue pendiente, el aviso todavía no llegó.");
    if (params.get("pago") === "error") setError("El medio no confirmó el pago.");
  }, [params]);

  async function pagar(id: string, medio: "mercadopago" | "paypal") {
    setError("");
    try {
      const respuesta = await api<{ url: string }>(`/v1/facturas/${id}/cobrar`, {
        method: "POST",
        body: JSON.stringify({ medio }),
      });
      window.location.href = respuesta.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir el cobro");
    }
  }

  return (
    <section>
      <PageHeader
        title="Facturación"
        subtitle="El periodo dura 30 días desde la habilitación. Después hay 9 días de gracia."
      />
      {aviso ? <Alert type="success" message={aviso} onClose={() => setAviso("")} /> : null}
      {usuario?.servicioSuspendido || datos?.cobro.suspendido ? (
        <div className="mb-4"><Alert inline message="El servicio está suspendido. Pagar la factura pendiente lo habilita de nuevo." /></div>
      ) : null}
      {datos?.cobro.gracia ? <div className="mb-4"><Alert inline message="La factura está vencida y el servicio sigue en los días de gracia." /></div> : null}
      {error ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {!datos && !error ? <Cargando /> : null}
      {datos ? (
        <p className="mb-4 text-sm text-muted">
          {datos.cobro.asientosUsados} de {datos.cobro.asientos ?? "—"} asientos.
          {datos.cobro.habilitadoEn ? ` Habilitado el ${fecha(datos.cobro.habilitadoEn)}.` : ""}
        </p>
      ) : null}
      {datos && datos.facturas.length === 0 ? <p className="text-sm text-muted">No hay facturas emitidas.</p> : null}
      {datos && datos.facturas.length > 0 ? (
        <div className="space-y-4">
          {datos.facturas.map((factura) => (
            <div key={factura.id} className="rounded-md border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink">{factura.documento === "factura" ? "Factura" : "Boleta"} {factura.numero}</h2>
                  <p className="text-sm text-muted">{fecha(factura.desde)} a {fecha(factura.hasta)}. Vence {fecha(factura.vence)}.</p>
                </div>
                <p className="text-sm font-medium text-ink">{factura.estado}</p>
              </div>
              <Table headers={["Concepto", "USD"]}>
                <tr><td className="px-4 py-2 text-ink">Subtotal</td><td className="px-4 py-2 text-ink">{factura.subtotal}</td></tr>
                <tr><td className="px-4 py-2 text-ink">IVA</td><td className="px-4 py-2 text-ink">{factura.iva}</td></tr>
                <tr><td className="px-4 py-2 font-medium text-ink">Total</td><td className="px-4 py-2 font-medium text-ink">{factura.total}</td></tr>
              </Table>
              {factura.totalClp ? <p className="mt-2 text-sm text-muted">Mercado Pago usó {factura.totalClp} CLP a una tasa de {factura.tasa}.</p> : null}
              {puedePagar && factura.estado === "pendiente" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {datos.medios.mercadopagoListo ? <Button onClick={() => void pagar(factura.id, "mercadopago")}>Pagar con Mercado Pago</Button> : null}
                  {datos.medios.paypalListo ? <Button variant="secondary" onClick={() => void pagar(factura.id, "paypal")}>Pagar con PayPal</Button> : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
