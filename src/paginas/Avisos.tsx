import { useState } from "react";
import { api } from "../api";
import { fecha, useLista } from "../datos";
import { useSesion } from "../sesion";
import { Alert, Button, Card, Cargando, Input, PageHeader, Textarea } from "../componentes/ui";

type Aviso = { id: string; titulo: string; cuerpo: string; creadoEn: string };

export function Avisos() {
  const { usuario } = useSesion();
  const { datos, error, cargando, recargar } = useLista<{ avisos: Aviso[] }>("/v1/avisos");
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [aviso, setAviso] = useState("");
  const [mensaje, setMensaje] = useState("");
  const puede = usuario?.rol === "responsable_seguridad" || usuario?.ambito === "soporte";

  async function publicar(evento: React.FormEvent) {
    evento.preventDefault();
    setAviso("");
    try {
      await api("/v1/avisos", {
        method: "POST",
        body: JSON.stringify({ contrato: 1, titulo, cuerpo }),
      });
      setTitulo("");
      setCuerpo("");
      setMensaje("Aviso publicado.");
      recargar();
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No se pudo publicar");
    }
  }

  return (
    <section>
      <PageHeader title="Avisos" subtitle="Mensajes de la organización para las cuentas del tenant." />
      {error ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {aviso ? <Alert message={aviso} onClose={() => setAviso("")} /> : null}
      {cargando ? <Cargando /> : null}
      <div className="space-y-3">
        {datos?.avisos.map((item) => (
          <Card key={item.id}>
            <h2 className="font-medium text-ink">{item.titulo}</h2>
            <p className="mt-1 text-sm text-ink">{item.cuerpo}</p>
            <p className="mt-2 text-xs text-muted">{fecha(item.creadoEn)}</p>
          </Card>
        ))}
        {!cargando && datos?.avisos.length === 0 ? <p className="text-sm text-muted">No hay avisos.</p> : null}
      </div>
      {puede ? (
        <Card className="mt-6">
          <form onSubmit={publicar} className="space-y-3">
            <Input label="Título" value={titulo} onChange={(evento) => setTitulo(evento.target.value)} required />
            <Textarea label="Texto del aviso" value={cuerpo} onChange={(evento) => setCuerpo(evento.target.value)} required rows={4} />
            <Button type="submit">Publicar aviso</Button>
          </form>
        </Card>
      ) : null}
    </section>
  );
}
