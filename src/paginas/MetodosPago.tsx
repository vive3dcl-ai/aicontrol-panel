import { useEffect, useState } from "react";
import { api } from "../api";
import { Alert, Button, Cargando, Input, PageHeader } from "../componentes/ui";

type Medios = {
  mercadopago: boolean;
  mpTokenGuardado: boolean;
  mpClavePublica: string;
  paypal: boolean;
  paypalCliente: string;
  paypalSecretoGuardado: boolean;
  paypalPrueba: boolean;
};

export function MetodosPago() {
  const [medios, setMedios] = useState<Medios | null>(null);
  const [mpToken, setMpToken] = useState("");
  const [paypalSecreto, setPaypalSecreto] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    api<Medios>("/v1/plataforma/medios")
      .then(setMedios)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudieron leer los medios"));
  }, []);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!medios) return;
    setError("");
    try {
      const datos = await api<Medios>("/v1/plataforma/medios", {
        method: "PUT",
        body: JSON.stringify({
          mercadopago: medios.mercadopago,
          paypal: medios.paypal,
          paypalPrueba: medios.paypalPrueba,
          mpClavePublica: medios.mpClavePublica,
          paypalCliente: medios.paypalCliente,
          ...(mpToken.trim() ? { mpToken } : {}),
          ...(paypalSecreto.trim() ? { paypalSecreto } : {}),
        }),
      });
      setMedios(datos);
      setMpToken("");
      setPaypalSecreto("");
      setMensaje("Medios de pago guardados.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los medios");
    }
  }

  return (
    <section>
      <PageHeader
        title="Métodos de pago"
        subtitle="Mercado Pago Checkout Pro cobra en pesos al dólar observado. PayPal Checkout cobra el total en dólares."
      />
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {error ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {!medios && !error ? <Cargando /> : null}
      {medios ? (
        <form onSubmit={guardar} className="max-w-xl space-y-4 rounded-md border border-line bg-surface p-4 sm:p-5">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={medios.mercadopago} onChange={(evento) => setMedios({ ...medios, mercadopago: evento.target.checked })} />
            Mercado Pago activo
          </label>
          <Input label="Clave pública de Mercado Pago" value={medios.mpClavePublica} onChange={(evento) => setMedios({ ...medios, mpClavePublica: evento.target.value })} autoComplete="off" />
          <Input label={medios.mpTokenGuardado ? "Access token de Mercado Pago (vacío lo conserva)" : "Access token de Mercado Pago"} type="password" value={mpToken} onChange={(evento) => setMpToken(evento.target.value)} autoComplete="off" />
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={medios.paypal} onChange={(evento) => setMedios({ ...medios, paypal: evento.target.checked })} />
            PayPal activo
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={medios.paypalPrueba} onChange={(evento) => setMedios({ ...medios, paypalPrueba: evento.target.checked })} />
            PayPal en modo de prueba
          </label>
          <Input label="Client ID de PayPal" value={medios.paypalCliente} onChange={(evento) => setMedios({ ...medios, paypalCliente: evento.target.value })} autoComplete="off" />
          <Input label={medios.paypalSecretoGuardado ? "Secreto de PayPal (vacío lo conserva)" : "Secreto de PayPal"} type="password" value={paypalSecreto} onChange={(evento) => setPaypalSecreto(evento.target.value)} autoComplete="off" />
          <Button type="submit">Guardar</Button>
        </form>
      ) : null}
    </section>
  );
}
