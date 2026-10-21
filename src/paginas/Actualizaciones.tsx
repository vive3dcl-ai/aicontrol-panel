import { useState } from "react";
import { api, tokenGuardado } from "../api";
import { useLista } from "../datos";
import { Alert, Badge, Button, Card, Cargando, PageHeader } from "../componentes/ui";

type Sistema = {
  sistema: "windows" | "linux" | "darwin";
  nombre: string;
  publicada: { version: string; cambios: string; publicadaEn: string; tieneInstalador?: boolean } | null;
  rollout: { version: string; cambios: string; pedidoEn: string } | null;
  flota: { equipos: number; alDia: number; atrasados: number; pendienteReinicio: number; enCurso: number; enEspera: number; desconectados: number };
  hayActualizacion: boolean;
};

export function Actualizaciones() {
  const lista = useLista<{ sistemas: Sistema[] }>("/v1/actualizaciones", 2000);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [ocupado, setOcupado] = useState("");

  async function actualizar(sistema: string) {
    setError("");
    setMensaje("");
    setOcupado(sistema);
    try {
      const vista = await api<{ sistemas: Sistema[] }>("/v1/actualizaciones/aplicar", { method: "POST", body: JSON.stringify({ sistema }) });
      const pedido = vista.sistemas.find((item) => item.sistema === sistema);
      const flota = pedido?.flota;
      setMensaje(
        flota
          ? `Se está enviando a ${flota.enCurso} equipos. ${flota.enEspera} esperan el siguiente bloque. ${flota.desconectados} desconectados la reciben al volver.`
          : "Se envió la actualización.",
      );
      lista.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo pedir la actualización");
    } finally {
      setOcupado("");
    }
  }

  async function descargar(sistema: string) {
    setError("");
    setMensaje("");
    setOcupado(`bajar:${sistema}`);
    try {
      const token = tokenGuardado();
      const respuesta = await fetch(`/v1/actualizaciones/instalador?sistema=${encodeURIComponent(sistema)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!respuesta.ok) {
        const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
        throw new Error(datos.error ?? "No se pudo descargar el instalador");
      }
      const blob = await respuesta.blob();
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(blob);
      const disposicion = respuesta.headers.get("content-disposition") ?? "";
      const respaldo = sistema === "darwin" ? "AIcontrol.pkg" : sistema === "linux" ? "AIcontrol-setup.deb" : "AIcontrol-setup.exe";
      enlace.download = disposicion.match(/filename="([^"]+)"/)?.[1] ?? respaldo;
      enlace.click();
      URL.revokeObjectURL(enlace.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el instalador");
    } finally {
      setOcupado("");
    }
  }

  return (
    <section>
      <PageHeader
        title="Actualizaciones"
        subtitle="Se envía de a 5 equipos. El resto espera su bloque. Un equipo desconectado la recibe al volver a conectar."
      />
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {error ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {lista.error ? <div className="mb-4"><Alert inline message={lista.error} /></div> : null}
      {lista.cargando ? <Cargando /> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {lista.datos?.sistemas.map((sistema) => {
          const notas = sistema.publicada?.cambios || sistema.rollout?.cambios;
          const version = sistema.publicada?.version || sistema.rollout?.version;
          return (
            <Card key={sistema.sistema}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-ink">{sistema.nombre}</h2>
                {sistema.hayActualizacion ? <Badge color="yellow">Actualización disponible</Badge> : sistema.publicada ? <Badge color="green">Al día</Badge> : <Badge>Sin versión</Badge>}
              </div>
              {sistema.publicada ? (
                <p className="mt-3 text-sm text-ink">Versión {version}</p>
              ) : (
                <p className="mt-3 text-sm text-muted">No hay una versión publicada.</p>
              )}
              <p className="mt-2 text-sm text-muted">
                {sistema.flota.equipos} en la flota
                {sistema.publicada ? ` · ${sistema.flota.alDia} al día · ${sistema.flota.atrasados} atrás` : ""}
                {sistema.flota.enCurso > 0 ? ` · ${sistema.flota.enCurso} actualizando` : ""}
                {sistema.flota.enEspera > 0 ? ` · ${sistema.flota.enEspera} en espera` : ""}
                {sistema.flota.desconectados > 0 ? ` · ${sistema.flota.desconectados} actualizan al conectar` : ""}
              </p>
              {notas ? (
                <pre className="mt-3 whitespace-pre-wrap rounded-md bg-surface-muted p-3 text-sm text-ink">{notas}</pre>
              ) : null}
              <div className="mt-4 flex items-center justify-between gap-3">
                <Button disabled={!sistema.hayActualizacion || ocupado === sistema.sistema} onClick={() => actualizar(sistema.sistema)}>
                  {ocupado === sistema.sistema ? "Pidiendo..." : "Actualizar"}
                </Button>
                <Button
                  variant="secondary"
                  disabled={!sistema.publicada?.tieneInstalador || ocupado === `bajar:${sistema.sistema}`}
                  onClick={() => descargar(sistema.sistema)}
                >
                  {ocupado === `bajar:${sistema.sistema}` ? "Descargando..." : "Descargar"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
