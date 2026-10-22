import { useEffect, useState } from "react";
import { api, tokenGuardado } from "../api";
import { Alert, Badge, Button, Cargando, Input, PageHeader } from "../componentes/ui";

const SISTEMAS = ["windows", "linux", "darwin"] as const;

type Acceso = { id: string; nombre: string; sistemas: string[]; revocado: boolean; creadoEn: string };
type Version = {
  id: string;
  sistema: string;
  version: string;
  cambios: string;
  estado: "pendiente" | "aprobada" | "rechazada";
  tieneInstalador: boolean;
  tieneActualizador: boolean;
  creadaEn: string;
};

export function Actualizadores() {
  const [pestaña, setPestaña] = useState<"accesos" | "bandeja" | "historial">("bandeja");
  const [accesos, setAccesos] = useState<Acceso[] | null>(null);
  const [versiones, setVersiones] = useState<Version[] | null>(null);
  const [nombre, setNombre] = useState("");
  const [sistemas, setSistemas] = useState<string[]>([...SISTEMAS]);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState("");

  async function cargar() {
    const [lista, publicadas] = await Promise.all([
      api<{ accesos: Acceso[] }>("/v1/actualizadores"),
      api<{ versiones: Version[] }>("/v1/actualizadores/versiones"),
    ]);
    setAccesos(lista.accesos);
    setVersiones(publicadas.versiones);
  }

  useEffect(() => {
    cargar().catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudo leer la cola"));
  }, []);

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    setToken("");
    setOcupado("crear");
    try {
      const creado = await api<Acceso & { token: string }>("/v1/actualizadores", {
        method: "POST",
        body: JSON.stringify({ nombre, sistemas }),
      });
      setToken(creado.token);
      setNombre("");
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el acceso");
    } finally {
      setOcupado("");
    }
  }

  async function revocar(id: string) {
    setError("");
    setOcupado(id);
    try {
      await api(`/v1/actualizadores/${id}`, { method: "DELETE" });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo revocar el acceso");
    } finally {
      setOcupado("");
    }
  }

  async function decidir(id: string, accion: "aprobar" | "rechazar") {
    setError("");
    setOcupado(id);
    try {
      await api(`/v1/actualizadores/versiones/${id}/${accion}`, { method: "POST" });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la versión");
    } finally {
      setOcupado("");
    }
  }

  async function descargar(id: string, tipo: "instalador" | "actualizador") {
    setError("");
    setOcupado(`${id}:${tipo}`);
    try {
      const sesion = tokenGuardado();
      const respuesta = await fetch(`/v1/actualizadores/versiones/${id}/archivo?tipo=${tipo}`, {
        headers: sesion ? { Authorization: `Bearer ${sesion}` } : {},
      });
      if (!respuesta.ok) {
        const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
        throw new Error(datos.error ?? "No se pudo descargar el archivo");
      }
      const blob = await respuesta.blob();
      const enlace = document.createElement("a");
      enlace.href = URL.createObjectURL(blob);
      const disposicion = respuesta.headers.get("content-disposition") ?? "";
      enlace.download = disposicion.match(/filename="([^"]+)"/)?.[1] ?? tipo;
      enlace.click();
      URL.revokeObjectURL(enlace.href);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el archivo");
    } finally {
      setOcupado("");
    }
  }

  const pendientes = versiones?.filter((fila) => fila.estado === "pendiente") ?? [];

  return (
    <section>
      <PageHeader title="Actualizadores" subtitle="Los tokens suben paquetes. Quedan pendientes hasta que los apruebes." />
      {error ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {token ? <Alert type="success" message={`Copia el token ahora. No se vuelve a mostrar: ${token}`} /> : null}
      <div className="mb-4 flex gap-2 border-b border-line">
        <Pestaña activa={pestaña === "bandeja"} onClick={() => setPestaña("bandeja")}>Bandeja</Pestaña>
        <Pestaña activa={pestaña === "historial"} onClick={() => setPestaña("historial")}>Historial</Pestaña>
        <Pestaña activa={pestaña === "accesos"} onClick={() => setPestaña("accesos")}>Accesos</Pestaña>
      </div>
      {!versiones || !accesos ? <Cargando /> : null}
      {pestaña === "bandeja" && versiones ? (
        <div className="space-y-3">
          {pendientes.length === 0 ? <p className="text-sm text-muted">No hay versiones esperando aprobación.</p> : null}
          {pendientes.map((fila) => (
            <Fila key={fila.id} fila={fila} ocupado={ocupado} onDecidir={decidir} onDescargar={descargar} />
          ))}
        </div>
      ) : null}
      {pestaña === "historial" && versiones ? (
        <div className="space-y-3">
          {versiones.length === 0 ? <p className="text-sm text-muted">Todavía no hay versiones.</p> : null}
          {versiones.map((fila) => (
            <Fila key={fila.id} fila={fila} ocupado={ocupado} onDescargar={descargar} />
          ))}
        </div>
      ) : null}
      {pestaña === "accesos" && accesos ? (
        <div className="space-y-4">
          <form onSubmit={crear} className="max-w-xl space-y-4 rounded-md border border-line bg-surface p-4">
            <Input label="Nombre" value={nombre} onChange={(evento) => setNombre(evento.target.value)} required />
            <div className="flex flex-wrap gap-4 text-sm text-ink">
              {SISTEMAS.map((sistema) => (
                <label key={sistema} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sistemas.includes(sistema)}
                    onChange={(evento) => setSistemas(evento.target.checked ? [...sistemas, sistema] : sistemas.filter((item) => item !== sistema))}
                  />
                  {sistema}
                </label>
              ))}
            </div>
            <Button type="submit" disabled={ocupado === "crear" || sistemas.length === 0}>{ocupado === "crear" ? "Creando..." : "Crear acceso"}</Button>
          </form>
          {accesos.map((acceso) => (
            <div key={acceso.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface p-4">
              <div>
                <p className="font-medium text-ink">{acceso.nombre}</p>
                <p className="text-sm text-muted">{acceso.sistemas.join(", ") || "sin sistemas"}</p>
              </div>
              {acceso.revocado ? <Badge>Revocado</Badge> : (
                <Button variant="danger" disabled={ocupado === acceso.id} onClick={() => void revocar(acceso.id)}>Revocar</Button>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Fila({
  fila,
  ocupado,
  onDecidir,
  onDescargar,
}: {
  fila: Version;
  ocupado: string;
  onDecidir?: (id: string, accion: "aprobar" | "rechazar") => Promise<void>;
  onDescargar: (id: string, tipo: "instalador" | "actualizador") => Promise<void>;
}) {
  const color = fila.estado === "aprobada" ? "green" : fila.estado === "rechazada" ? "red" : "yellow";
  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium text-ink">{fila.sistema} {fila.version}</p>
        <Badge color={color}>{fila.estado}</Badge>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{fila.cambios || "Sin notas"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {fila.tieneActualizador ? <Button variant="secondary" disabled={ocupado === `${fila.id}:actualizador`} onClick={() => void onDescargar(fila.id, "actualizador")}>Actualizador</Button> : null}
        {fila.tieneInstalador ? <Button variant="secondary" disabled={ocupado === `${fila.id}:instalador`} onClick={() => void onDescargar(fila.id, "instalador")}>Instalador</Button> : null}
        {onDecidir && fila.estado === "pendiente" ? (
          <>
            <Button disabled={ocupado === fila.id} onClick={() => void onDecidir(fila.id, "aprobar")}>Aprobar</Button>
            <Button variant="danger" disabled={ocupado === fila.id} onClick={() => void onDecidir(fila.id, "rechazar")}>Rechazar</Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Pestaña({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${activa ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}
    >
      {children}
    </button>
  );
}
