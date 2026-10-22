import { useEffect, useState } from "react";
import { api } from "../api";
import { guardarMarca } from "../marca";
import { Alert, Button, Cargando, Input, PageHeader } from "../componentes/ui";

type Ajustes = { nombre: string; sigla: string; hostPanel: string; hostAgentes: string };

export function AjustesSistema() {
  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    api<Ajustes>("/v1/plataforma/ajustes")
      .then(setAjustes)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudieron leer los ajustes"));
  }, []);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!ajustes) return;
    setError("");
    setGuardando(true);
    try {
      const datos = await api<Ajustes>("/v1/plataforma/ajustes", { method: "PUT", body: JSON.stringify(ajustes) });
      setAjustes(datos);
      guardarMarca({ nombre: datos.nombre, sigla: datos.sigla });
      setMensaje("Ajustes guardados.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron guardar los ajustes");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section>
      <PageHeader
        title="Ajustes"
        subtitle="Marca del panel y direcciones públicas. El panel y los agentes usan hosts distintos para poder actualizar uno sin cortar el otro."
      />
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {error ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {!ajustes && !error ? <Cargando /> : null}
      {ajustes ? (
        <form onSubmit={guardar} className="max-w-xl space-y-4 rounded-md border border-line bg-surface p-4 sm:p-5">
          <Input label="Nombre" value={ajustes.nombre} onChange={(evento) => setAjustes({ ...ajustes, nombre: evento.target.value })} required />
          <Input label="Sigla" value={ajustes.sigla} maxLength={2} onChange={(evento) => setAjustes({ ...ajustes, sigla: evento.target.value })} required />
          <Input label="Host del panel" value={ajustes.hostPanel} onChange={(evento) => setAjustes({ ...ajustes, hostPanel: evento.target.value })} required />
          <Input label="Host de los agentes" value={ajustes.hostAgentes} onChange={(evento) => setAjustes({ ...ajustes, hostAgentes: evento.target.value })} required />
          <Button type="submit" disabled={guardando}>{guardando ? "Guardando..." : "Guardar"}</Button>
        </form>
      ) : null}
    </section>
  );
}
