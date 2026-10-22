import { useEffect, useState } from "react";
import { api, tokenGuardado } from "../api";
import { Alert, Badge, Button, Cargando, Input, Modal, PageHeader, Select, Textarea } from "../componentes/ui";

const SISTEMAS = ["windows", "linux", "darwin"] as const;
const NOMBRES: Record<(typeof SISTEMAS)[number], string> = { windows: "Windows", linux: "Linux", darwin: "Mac" };
const MARCAS: Record<(typeof SISTEMAS)[number], string> = { windows: "GOBBIN01", linux: "GOBLIN01", darwin: "GOBMAC01" };

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
  const [aviso, setAviso] = useState("");
  const [publicar, setPublicar] = useState(false);
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
      <PageHeader
        title="Actualizadores"
        subtitle="Los tokens suben paquetes. Quedan pendientes hasta que los apruebes."
        action={<Button onClick={() => setPublicar(true)}>Publicar</Button>}
      />
      {aviso ? <Alert type="success" message={aviso} onClose={() => setAviso("")} /> : null}
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
                  {NOMBRES[sistema]}
                </label>
              ))}
            </div>
            <Button type="submit" disabled={ocupado === "crear" || sistemas.length === 0}>{ocupado === "crear" ? "Creando..." : "Crear acceso"}</Button>
          </form>
          {accesos.map((acceso) => (
            <div key={acceso.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface p-4">
              <div>
                <p className="font-medium text-ink">{acceso.nombre}</p>
                <p className="text-sm text-muted">{acceso.sistemas.map((sistema) => NOMBRES[sistema as (typeof SISTEMAS)[number]] ?? sistema).join(", ") || "sin sistemas"}</p>
              </div>
              {acceso.revocado ? <Badge>Revocado</Badge> : (
                <Button variant="danger" disabled={ocupado === acceso.id} onClick={() => void revocar(acceso.id)}>Revocar</Button>
              )}
            </div>
          ))}
        </div>
      ) : null}
      <PublicarModal
        abierto={publicar}
        versiones={versiones ?? []}
        onCerrar={() => setPublicar(false)}
        onListo={async (texto) => {
          setAviso(texto);
          setPublicar(false);
          await cargar();
        }}
      />
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
        <p className="font-medium text-ink">{NOMBRES[fila.sistema as (typeof SISTEMAS)[number]] ?? fila.sistema} {fila.version}</p>
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

function versionSiguiente(versiones: string[]) {
  const validas = versiones.filter((version) => /^\d+\.\d+\.\d+$/.test(version));
  if (validas.length === 0) return "0.1.0";
  const mayor = validas.reduce((mejor, actual) => (comparar(actual, mejor) > 0 ? actual : mejor));
  const [a, b, c] = mayor.split(".").map((parte) => Number.parseInt(parte, 10) || 0);
  return `${a}.${b}.${c + 1}`;
}

function comparar(izquierda: string, derecha: string) {
  const a = izquierda.split(".").map((parte) => Number.parseInt(parte, 10) || 0);
  const b = derecha.split(".").map((parte) => Number.parseInt(parte, 10) || 0);
  const largo = Math.max(a.length, b.length);
  for (let i = 0; i < largo; i += 1) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0) ? -1 : 1;
  }
  return 0;
}

function terminaCon(bytes: Uint8Array, marca: string) {
  const aguja = new TextEncoder().encode(marca);
  if (bytes.length < aguja.length) return false;
  const inicio = bytes.length - aguja.length;
  for (let i = 0; i < aguja.length; i += 1) if (bytes[inicio + i] !== aguja[i]) return false;
  return true;
}

function contiene(bytes: Uint8Array, texto: string) {
  const aguja = new TextEncoder().encode(texto);
  for (let i = 0; i + aguja.length <= bytes.length; i += 1) {
    let igual = true;
    for (let j = 0; j < aguja.length; j += 1) {
      if (bytes[i + j] !== aguja[j]) {
        igual = false;
        break;
      }
    }
    if (!igual) continue;
    const antes = i === 0 ? 0 : bytes[i - 1];
    const despues = i + aguja.length >= bytes.length ? 0 : bytes[i + aguja.length];
    const digito = (byte: number) => byte >= 48 && byte <= 57;
    if (!digito(antes) && !digito(despues)) return true;
  }
  return false;
}

function contieneUtf16(bytes: Uint8Array, texto: string) {
  const aguja = new Uint8Array(texto.length * 2);
  for (let i = 0; i < texto.length; i += 1) {
    aguja[i * 2] = texto.charCodeAt(i);
    aguja[i * 2 + 1] = 0;
  }
  for (let i = 0; i + aguja.length <= bytes.length; i += 1) {
    let igual = true;
    for (let j = 0; j < aguja.length; j += 1) {
      if (bytes[i + j] !== aguja[j]) {
        igual = false;
        break;
      }
    }
    if (igual) return true;
  }
  return false;
}

function paqueteTraeVersion(sistema: (typeof SISTEMAS)[number], bytes: Uint8Array, version: string) {
  if (!terminaCon(bytes, MARCAS[sistema])) return false;
  if (sistema === "windows") return contieneUtf16(bytes, `${version}.0`);
  return contiene(bytes, version);
}

async function archivoDe(archivo: File) {
  const buffer = await archivo.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binario = "";
  const bloque = 0x8000;
  for (let i = 0; i < bytes.length; i += bloque) {
    binario += String.fromCharCode(...bytes.subarray(i, i + bloque));
  }
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  const sha256 = [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return { nombre: archivo.name, sha256, base64: btoa(binario), bytes };
}

function PublicarModal({
  abierto,
  versiones,
  onCerrar,
  onListo,
}: {
  abierto: boolean;
  versiones: Version[];
  onCerrar: () => void;
  onListo: (texto: string) => Promise<void>;
}) {
  const [sistema, setSistema] = useState<(typeof SISTEMAS)[number]>("windows");
  const [cambios, setCambios] = useState("");
  const [actualizador, setActualizador] = useState<File | null>(null);
  const [instalador, setInstalador] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const version = versionSiguiente(versiones.filter((fila) => fila.sistema === sistema).map((fila) => fila.version));

  async function publicar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!actualizador || !instalador) {
      setError("Elegí el instalador y el actualizador");
      return;
    }
    if (actualizador.name === instalador.name) {
      setError("El instalador y el actualizador tienen que llamarse distinto");
      return;
    }
    setOcupado(true);
    setError("");
    try {
      const paquete = await archivoDe(actualizador);
      if (!paqueteTraeVersion(sistema, paquete.bytes, version)) {
        setError(`El actualizador no es un paquete de ${NOMBRES[sistema]} con la versión ${version}`);
        return;
      }
      const setup = await archivoDe(instalador);
      await api("/v1/actualizaciones", {
        method: "POST",
        body: JSON.stringify({
          sistema,
          version,
          cambios: cambios.trim(),
          sha256: paquete.sha256,
          archivoNombre: paquete.nombre,
          archivoBase64: paquete.base64,
          instaladorNombre: setup.nombre,
          instaladorSha256: setup.sha256,
          instaladorBase64: setup.base64,
        }),
      });
      setCambios("");
      setActualizador(null);
      setInstalador(null);
      await onListo(`Versión ${version} de ${NOMBRES[sistema]} publicada.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo publicar la versión");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Modal
      open={abierto}
      onClose={onCerrar}
      title="Publicar agente"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" form="form-publicar" disabled={ocupado}>{ocupado ? "Publicando..." : "Publicar"}</Button>
        </div>
      }
    >
      <form id="form-publicar" onSubmit={publicar} className="space-y-4">
        <p className="text-sm text-muted">Sube el instalador para un cliente nuevo y el paquete que el agente se aplica solo. Publicar no lo manda a la flota.</p>
        {error ? <Alert inline message={error} /> : null}
        <Select label="Sistema" value={sistema} onChange={(evento) => setSistema(evento.target.value as (typeof SISTEMAS)[number])}>
          {SISTEMAS.map((item) => <option key={item} value={item}>{NOMBRES[item]}</option>)}
        </Select>
        <p className="text-sm text-ink">Versión {version}</p>
        <Textarea label="Cambios de la versión" value={cambios} onChange={(evento) => setCambios(evento.target.value)} required />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-muted">Instalador</span>
          <input type="file" className="block w-full text-sm text-ink" onChange={(evento) => setInstalador(evento.target.files?.[0] ?? null)} required />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-muted">Actualizador automático</span>
          <input type="file" className="block w-full text-sm text-ink" onChange={(evento) => setActualizador(evento.target.files?.[0] ?? null)} required />
        </label>
      </form>
    </Modal>
  );
}
