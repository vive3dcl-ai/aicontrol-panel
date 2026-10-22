import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fecha } from "../datos";
import { useNotificacionesVivas, type Notificacion } from "../notificaciones-vivo";
import { Alert, Badge, Button, Card, Cargando, PageHeader } from "../componentes/ui";

const tipos: Record<string, string> = {
  desconexion: "Desconexión",
  desinstalacion: "Desinstalación",
};

export function Notificaciones() {
  const { lista, error, cargando, leer, leerTodas, limpiar, sinLeer } = useNotificacionesVivas();
  const [params] = useSearchParams();
  const [confirmar, setConfirmar] = useState(false);
  const avisoId = params.get("aviso");
  const elegida = lista.find((aviso) => aviso.id === avisoId) ?? null;

  useEffect(() => {
    if (!avisoId) return;
    document.getElementById(`aviso-${avisoId}`)?.scrollIntoView({ block: "center" });
  }, [avisoId, lista]);

  async function leerUna(id: string) {
    try {
      await leer(id);
    } catch {
      /* El flujo en vivo vuelve a pedir la lista si el servidor rechaza la lectura. */
    }
  }

  return (
    <section>
      <PageHeader
        title="Notificaciones"
        subtitle="Desconexiones y desinstalaciones de los equipos de esta organización."
        action={(
          <>
            <Button variant="secondary" disabled={sinLeer === 0} onClick={() => void leerTodas()}>Leer todas</Button>
            <Button
              variant="secondary"
              disabled={lista.length === 0}
              onClick={() => {
                if (!confirmar) {
                  setConfirmar(true);
                  return;
                }
                setConfirmar(false);
                void limpiar();
              }}
            >
              {confirmar ? "Confirmar limpieza" : "Limpiar"}
            </Button>
          </>
        )}
      />
      {error ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {avisoId && !cargando && !elegida ? (
        <div className="mb-4"><Alert inline type="warning" message="Esa notificación ya no está." /></div>
      ) : null}
      {elegida ? <Detalle aviso={elegida} /> : null}
      {cargando && lista.length === 0 ? <Cargando texto="Cargando notificaciones..." /> : null}
      <div className="space-y-3">
        {lista.map((aviso) => (
          <Card key={aviso.id} className={aviso.id === avisoId ? "ring-2 ring-amber-500" : ""}>
            <div id={`aviso-${aviso.id}`} className="flex items-start justify-between gap-3">
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
                <Button variant="secondary" onClick={() => void leerUna(aviso.id)}>Marcar leída</Button>
              </div>
            )}
          </Card>
        ))}
        {!cargando && lista.length === 0 ? (
          <p className="text-sm text-muted">No hay notificaciones.</p>
        ) : null}
      </div>
    </section>
  );
}

function Detalle({ aviso }: { aviso: Notificacion }) {
  return (
    <Card className="mb-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">Detalle</p>
      <h2 className="mt-1 text-lg font-semibold text-ink">{aviso.titulo}</h2>
      <p className="mt-2 text-sm text-ink">{aviso.cuerpo}</p>
      <p className="mt-3 text-sm text-muted">
        {tipos[aviso.tipo] ?? aviso.tipo}
        {aviso.equipo ? ` · ${aviso.equipo}` : ""}
        {` · ${fecha(aviso.creadoEn)}`}
        {aviso.leida ? " · Leída" : " · Sin leer"}
      </p>
    </Card>
  );
}
