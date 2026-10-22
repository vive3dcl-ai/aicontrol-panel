import { useEffect, useState } from "react";
import { api } from "../api";
import { guardarMarca } from "../marca";
import { Alert, Button, Cargando, Input, PageHeader, Select } from "../componentes/ui";

type Ajustes = { nombre: string; sigla: string; hostPanel: string; hostAgentes: string };
type Documento = { tipo: "factura" | "boleta"; iva: number };
type Correo = { host: string; puerto: number; usuario: string; desde: string; nombre: string; seguro: boolean; claveGuardada: boolean };

export function AjustesSistema() {
  const [ajustes, setAjustes] = useState<Ajustes | null>(null);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [correo, setCorreo] = useState<Correo | null>(null);
  const [claveSmtp, setClaveSmtp] = useState("");
  const [destinoPrueba, setDestinoPrueba] = useState("");
  const [documento, setDocumento] = useState<Documento | null>(null);

  useEffect(() => {
    api<Ajustes>("/v1/plataforma/ajustes")
      .then(setAjustes)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudieron leer los ajustes"));
    api<Correo>("/v1/plataforma/correo")
      .then(setCorreo)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudo leer el correo"));
    api<Documento>("/v1/plataforma/documento")
      .then(setDocumento)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudo leer el documento"));
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
      {documento ? (
        <form
          className="mt-6 max-w-xl space-y-4 rounded-md border border-line bg-surface p-4 sm:p-5"
          onSubmit={async (evento) => {
            evento.preventDefault();
            setError("");
            try {
              setDocumento(await api<Documento>("/v1/plataforma/documento", { method: "PUT", body: JSON.stringify(documento) }));
              setMensaje("Documento de cobro guardado.");
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudo guardar el documento");
            }
          }}
        >
          <h2 className="text-base font-semibold text-ink">Documento de cobro</h2>
          <Select label="Tipo" value={documento.tipo} onChange={(evento) => setDocumento({ ...documento, tipo: evento.target.value === "factura" ? "factura" : "boleta" })}>
            <option value="boleta">Boleta</option>
            <option value="factura">Factura</option>
          </Select>
          <Input label="IVA %" type="number" min={0} max={100} value={documento.iva} onChange={(evento) => setDocumento({ ...documento, iva: Number(evento.target.value) })} required />
          <p className="text-sm text-muted">El cliente ve el subtotal, el IVA y el total en dólares. Si el tipo es factura, el tenant necesita RUT.</p>
          <Button type="submit">Guardar documento</Button>
        </form>
      ) : null}
      {correo ? <CorreoSmtp correo={correo} clave={claveSmtp} destino={destinoPrueba} onCorreo={setCorreo} onClave={setClaveSmtp} onDestino={setDestinoPrueba} onError={setError} onMensaje={setMensaje} /> : null}
    </section>
  );
}

function CorreoSmtp({
  correo,
  clave,
  destino,
  onCorreo,
  onClave,
  onDestino,
  onError,
  onMensaje,
}: {
  correo: Correo;
  clave: string;
  destino: string;
  onCorreo: (correo: Correo) => void;
  onClave: (valor: string) => void;
  onDestino: (valor: string) => void;
  onError: (valor: string) => void;
  onMensaje: (valor: string) => void;
}) {
  const [ocupado, setOcupado] = useState("");

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    onError("");
    setOcupado("guardar");
    try {
      const datos = await api<Correo>("/v1/plataforma/correo", {
        method: "PUT",
        body: JSON.stringify({ ...correo, puerto: Number(correo.puerto), clave }),
      });
      onCorreo(datos);
      onClave("");
      onMensaje("El correo quedó guardado.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo guardar el correo");
    } finally {
      setOcupado("");
    }
  }

  async function probar() {
    onError("");
    setOcupado("probar");
    try {
      await api("/v1/plataforma/correo/probar", { method: "POST", body: JSON.stringify({ destino }) });
      onMensaje("Enviamos el correo de prueba.");
    } catch (err) {
      onError(err instanceof Error ? err.message : "No se pudo enviar la prueba");
    } finally {
      setOcupado("");
    }
  }

  return (
    <form onSubmit={guardar} className="mt-4 max-w-xl space-y-4 rounded-md border border-line bg-surface p-4 sm:p-5">
      <h2 className="font-medium text-ink">Correo</h2>
      <Input label="Servidor SMTP" value={correo.host} onChange={(evento) => onCorreo({ ...correo, host: evento.target.value })} required />
      <Input label="Puerto" type="number" value={String(correo.puerto)} onChange={(evento) => onCorreo({ ...correo, puerto: Number(evento.target.value) })} required />
      <Input label="Usuario" value={correo.usuario} onChange={(evento) => onCorreo({ ...correo, usuario: evento.target.value })} />
      <Input label={correo.claveGuardada ? "Clave (vacía conserva la guardada)" : "Clave"} type="password" value={clave} onChange={(evento) => onClave(evento.target.value)} autoComplete="new-password" />
      <Input label="Remitente" type="email" value={correo.desde} onChange={(evento) => onCorreo({ ...correo, desde: evento.target.value })} required />
      <Input label="Nombre del remitente" value={correo.nombre} onChange={(evento) => onCorreo({ ...correo, nombre: evento.target.value })} />
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={correo.seguro} onChange={(evento) => onCorreo({ ...correo, seguro: evento.target.checked })} />
        TLS desde el inicio
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={ocupado === "guardar"}>{ocupado === "guardar" ? "Guardando..." : "Guardar correo"}</Button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-56 flex-1">
          <Input label="Correo de prueba" type="email" value={destino} onChange={(evento) => onDestino(evento.target.value)} />
        </div>
        <Button type="button" variant="secondary" disabled={ocupado === "probar" || !destino} onClick={() => void probar()}>
          {ocupado === "probar" ? "Enviando..." : "Enviar prueba"}
        </Button>
      </div>
    </form>
  );
}
