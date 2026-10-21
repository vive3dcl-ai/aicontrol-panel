import { useEffect, useState } from "react";
import { api } from "../api";
import { useLista } from "../datos";
import { Alert, Button, Card, Cargando, Input, PageHeader } from "../componentes/ui";

type AjustesTenant = {
  ambito: "tenant";
  claveEnrolamientoDefinida: boolean;
  claveAutorizacion: string;
  expira: string;
  feedIaActivo: boolean;
};

export function Ajustes() {
  const [ajustes, setAjustes] = useState<AjustesTenant | null>(null);
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    setError("");
    try {
      setAjustes(await api<AjustesTenant>("/v1/ajustes"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron leer los ajustes");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    setMensaje("");
    try {
      setAjustes(await api<AjustesTenant>("/v1/ajustes", {
        method: "PUT",
        body: JSON.stringify({ clave }),
      }));
      setClave("");
      setMensaje("Clave de enrolamiento guardada. No se vuelve a mostrar.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la clave");
    }
  }

  async function renovar() {
    setError("");
    setMensaje("");
    try {
      setAjustes(await api<AjustesTenant>("/v1/ajustes/clave-autorizacion", { method: "POST" }));
      setMensaje("Clave de Config renovada. Los agentes la reciben en el próximo contacto.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo renovar la clave");
    }
  }

  async function cambiarFeed(activo: boolean) {
    setError("");
    setMensaje("");
    try {
      setAjustes(await api<AjustesTenant>("/v1/ajustes/feed-ia", { method: "PUT", body: JSON.stringify({ activo }) }));
      setMensaje(activo ? "Lista dinámica de dominios IA activada." : "Lista dinámica de dominios IA desactivada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la lista dinámica");
    }
  }

  return (
    <section>
      <PageHeader
        title="Ajustes"
        subtitle="La clave de enrolamiento da de alta el equipo y enlaza o cambia la cuenta. La Clave de Config abre los ajustes del agente."
      />
      {error ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {cargando ? <Cargando /> : null}
      {!cargando && ajustes ? (
        <div className="space-y-4">
          <Card>
            <form onSubmit={guardar} className="max-w-lg space-y-4">
              <Input
                label={ajustes.claveEnrolamientoDefinida ? "Nueva clave de enrolamiento" : "Clave de enrolamiento"}
                type="password"
                value={clave}
                onChange={(evento) => setClave(evento.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                minLength={8}
              />
              <p className="text-sm text-muted">
                Una sola clave para toda la organización. Sirve para el alta del equipo y para registrar o cambiar la cuenta en el agente.
              </p>
              <Button type="submit">Guardar</Button>
            </form>
          </Card>
          <Card>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">Lista dinámica de dominios IA</h2>
                <p className="mt-1 text-sm text-muted">Actualiza automáticamente el catálogo web desde el feed de LatinRouter. Está activa por defecto.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-3">
                <input type="checkbox" className="h-5 w-5 accent-current" checked={ajustes.feedIaActivo} onChange={(evento) => void cambiarFeed(evento.target.checked)} />
                <span className="text-sm font-medium text-ink">{ajustes.feedIaActivo ? "Activa" : "Inactiva"}</span>
              </label>
            </div>
          </Card>
          <Card>
            <p className="text-sm text-muted">Clave de Config</p>
            <p className="mt-2 font-mono text-lg tracking-wide">{ajustes.claveAutorizacion}</p>
            <p className="mt-2 text-sm text-muted">
              Se envía a los agentes después del alta. Abre ajustes y el desinstalador. Vigente hasta {new Date(ajustes.expira).toLocaleString()}.
            </p>
            <div className="mt-4">
              <Button type="button" onClick={() => void renovar()}>Renovar ahora</Button>
            </div>
          </Card>
          <PuntosRedireccion />
        </div>
      ) : null}
    </section>
  );
}

function PuntosRedireccion() {
  const lista = useLista<{ puntos: { id: string; nombre: string; url: string }[] }>("/v1/puntos-redireccion");
  const [nombre, setNombre] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    try {
      await api("/v1/puntos-redireccion", { method: "POST", body: JSON.stringify({ nombre, url }) });
      setNombre("");
      setUrl("");
      setMensaje("Punto de redirección agregado.");
      lista.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el punto");
    }
  }

  async function quitar(id: string) {
    setError("");
    try {
      await api(`/v1/puntos-redireccion/${id}`, { method: "DELETE" });
      setMensaje("Punto de redirección quitado.");
      lista.recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar el punto");
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-ink">Puntos de redirección</h2>
      <p className="mt-1 text-sm text-muted">
        Sitios https a los que puede ir el tráfico de una IA bloqueada. Las políticas eligen uno de estos puntos.
      </p>
      <ul className="mt-4 space-y-2">
        {lista.datos?.puntos.map((punto) => (
          <li key={punto.id} className="flex flex-col gap-2 rounded-md border border-line px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <span><span className="font-medium text-ink">{punto.nombre}</span> <span className="text-sm text-muted">{punto.url}</span></span>
            <Button variant="secondary" onClick={() => void quitar(punto.id)}>Quitar</Button>
          </li>
        ))}
        {!lista.cargando && lista.datos?.puntos.length === 0 ? <li className="text-sm text-muted">Todavía no hay puntos.</li> : null}
      </ul>
      <form onSubmit={crear} className="mt-4 grid gap-3 md:grid-cols-2">
        <Input label="Nombre" value={nombre} onChange={(evento) => setNombre(evento.target.value)} required />
        <Input label="URL https" value={url} onChange={(evento) => setUrl(evento.target.value)} placeholder="https://chatgpt.com" required />
        <div className="md:col-span-2">
          <Button type="submit">Agregar punto</Button>
        </div>
      </form>
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {error ? <Alert message={error} onClose={() => setError("")} /> : null}
    </Card>
  );
}
