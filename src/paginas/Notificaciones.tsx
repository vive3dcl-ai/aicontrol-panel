import { api } from "../api";
import { fecha, useLista } from "../datos";
import { Alert, Badge, Button, Card, Cargando, PageHeader } from "../componentes/ui";

type Notificacion = {
  id: string;
  tipo: string;
  titulo: string;
  cuerpo: string;
  equipo: string | null;
  leida: boolean;
  creadoEn: string;
};

const tipos: Record<string, string> = {
  desconexion: "Desconexión",
  desinstalacion: "Desinstalación",
};

export function Notificaciones() {
  const { datos, error, cargando, recargar } = useLista<{ notificaciones: Notificacion[] }>("/v1/notificaciones");

  async function leer(id: string) {
    try {
      await api(`/v1/notificaciones/${id}/leer`, { method: "POST" });
      recargar();
    } catch {
      recargar();
    }
  }

  return (
    <section>
      <PageHeader
        title="Notificaciones"
        subtitle="Desconexiones y desinstalaciones de los equipos de esta organización."
        action={<Button variant="secondary" onClick={recargar}>Actualizar</Button>}
      />
      {error ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {cargando ? <Cargando texto="Cargando notificaciones..." /> : null}
      <div className="space-y-3">
        {datos?.notificaciones.map((aviso) => (
          <Card key={aviso.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-medium text-ink">{aviso.titulo}</h2>
                <p className="mt-1 text-sm text-ink">{aviso.cuerpo}</p>
                <p className="mt-2 text-xs text-muted">
                  {aviso.equipo ? `${aviso.equipo} · ` : ""}
                  {fecha(aviso.creadoEn)}
                </p>
              </div>
              <Badge color={aviso.leida ? "slate" : "yellow"}>{tipos[aviso.tipo] ?? aviso.tipo}</Badge>
            </div>
            {aviso.leida ? null : (
              <div className="mt-3">
                <Button variant="secondary" onClick={() => void leer(aviso.id)}>Marcar leída</Button>
              </div>
            )}
          </Card>
        ))}
        {!cargando && datos?.notificaciones.length === 0 ? (
          <p className="text-sm text-muted">No hay notificaciones.</p>
        ) : null}
      </div>
    </section>
  );
}
