import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api";
import { useMarca } from "../marca";
import { destinoInicio, useSesion } from "../sesion";
import { Alert, Button, Card, Input, Marca } from "../componentes/ui";
import { cuentaLocalInicial, cuentasLocales, type CuentaLocal } from "../local";
import { slugDeNombre } from "../slug";

export function LoginCliente() {
  return <Acceso ambito="cliente" subtitulo="Inicia sesión en tu cuenta" />;
}

export function LoginPlataforma() {
  return (
    <Acceso
      ambito="plataforma"
      subtitulo="Inicia sesión para gestionar la plataforma"
      pie={
        <p className="mt-4 text-center text-sm text-muted">
          <Link to="/login" className="text-ink hover:underline">
            Volver
          </Link>
        </p>
      }
    />
  );
}

function Acceso({
  ambito,
  subtitulo,
  pie,
}: {
  ambito: "cliente" | "plataforma";
  subtitulo: string;
  pie?: React.ReactNode;
}) {
  const { usuario, listo, entrar } = useSesion();
  const marca = useMarca();
  const inicial = cuentaLocalInicial(ambito);
  const [correo, setCorreo] = useState(inicial.correo);
  const [clave, setClave] = useState(inicial.clave);
  const [codigo, setCodigo] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [paso, setPaso] = useState<"clave" | "mfa" | "recuperar" | "nueva" | "registro">("clave");
  const [organizacion, setOrganizacion] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTocado, setSlugTocado] = useState(false);
  const [nombrePersona, setNombrePersona] = useState("");
  const [claveRegistro, setClaveRegistro] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [cargando, setCargando] = useState(false);

  if (!listo) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Cargando...</div>;
  }
  if (usuario) return <Navigate to={usuario.debeCambiarClave ? "/cuenta" : destinoInicio(usuario.rol)} replace />;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    setCargando(true);
    try {
      const resultado = await entrar(
        correo.trim(),
        clave,
        ambito === "plataforma" ? "plataforma" : undefined,
        paso === "mfa" ? codigo : undefined,
      );
      if (resultado === "mfa") setPaso("mfa");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
    } finally {
      setCargando(false);
    }
  }

  async function pedirCodigo(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    setCargando(true);
    try {
      await api("/v1/sesion/recuperar", { method: "POST", body: JSON.stringify({ correo: correo.trim() }) });
      setAviso("Si el correo está registrado, enviamos un código de 6 dígitos.");
      setPaso("nueva");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el código");
    } finally {
      setCargando(false);
    }
  }

  async function confirmarClave(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    setCargando(true);
    try {
      await api("/v1/sesion/recuperar/confirmar", {
        method: "POST",
        body: JSON.stringify({ correo: correo.trim(), codigo, clave: claveNueva }),
      });
      setClave("");
      setCodigo("");
      setClaveNueva("");
      setAviso("La clave quedó actualizada. Entra con la nueva.");
      setPaso("clave");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la clave");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Marca logo sigla={marca.sigla} />
        <p className="mt-1 text-center text-sm text-muted">{subtitulo}</p>
        {paso === "clave" || paso === "mfa" ? (
          <form onSubmit={enviar} className="mt-6 space-y-4">
            {aviso ? <Alert type="success" message={aviso} onClose={() => setAviso("")} /> : null}
            {error ? <Alert message={error} /> : null}
            <Input label="Email" type="email" autoComplete="username" value={correo} onChange={(evento) => setCorreo(evento.target.value)} required />
            <Input label="Contraseña" type="password" autoComplete="current-password" value={clave} onChange={(evento) => setClave(evento.target.value)} required />
            {paso === "mfa" ? (
              <Input label="Código de 6 dígitos" inputMode="numeric" autoComplete="one-time-code" value={codigo} onChange={(evento) => setCodigo(evento.target.value)} required />
            ) : null}
            <Button type="submit" disabled={cargando} className="w-full">
              {cargando ? "Entrando..." : "Entrar"}
            </Button>
            {paso === "clave" ? (
              <div className="space-y-2 text-center">
                <button type="button" className="w-full text-sm text-muted hover:text-ink" onClick={() => { setError(""); setPaso("recuperar"); }}>
                  Recuperar contraseña
                </button>
                {ambito === "cliente" ? (
                  <button type="button" className="w-full text-sm text-ink hover:underline" onClick={() => { setError(""); setAviso(""); setPaso("registro"); }}>
                    Crear una organización
                  </button>
                ) : null}
              </div>
            ) : null}
          </form>
        ) : null}
        {paso === "recuperar" ? (
          <form onSubmit={pedirCodigo} className="mt-6 space-y-4">
            {error ? <Alert message={error} /> : null}
            <Input label="Email" type="email" value={correo} onChange={(evento) => setCorreo(evento.target.value)} required />
            <Button type="submit" disabled={cargando} className="w-full">{cargando ? "Enviando..." : "Enviar código"}</Button>
            <button type="button" className="w-full text-center text-sm text-muted hover:text-ink" onClick={() => setPaso("clave")}>Volver</button>
          </form>
        ) : null}
        {paso === "registro" ? (
          <form
            onSubmit={(evento) => {
              evento.preventDefault();
              setError("");
              if (claveRegistro.length < 8) {
                setError("La clave tiene que tener al menos 8 caracteres");
                return;
              }
              setCargando(true);
              void api("/v1/registro", {
                method: "POST",
                body: JSON.stringify({
                  nombre: organizacion.trim(),
                  slug: slug.trim().toLowerCase(),
                  correo: correo.trim(),
                  ...(nombrePersona.trim() ? { nombreAdmin: nombrePersona.trim() } : {}),
                  clave: claveRegistro,
                }),
              })
                .then(() => entrar(correo.trim(), claveRegistro))
                .catch((err: unknown) => setError(err instanceof Error ? err.message : "No se pudo crear la organización"))
                .finally(() => setCargando(false));
            }}
            className="mt-6 space-y-4"
          >
            {error ? <Alert message={error} /> : null}
            <Input label="Organización" value={organizacion} onChange={(evento) => { setOrganizacion(evento.target.value); if (!slugTocado) setSlug(slugDeNombre(evento.target.value)); }} required />
            <Input label="Slug" value={slug} onChange={(evento) => { setSlugTocado(true); setSlug(evento.target.value); }} required autoComplete="off" />
            <Input label="Tu nombre" value={nombrePersona} onChange={(evento) => setNombrePersona(evento.target.value)} />
            <Input label="Email" type="email" value={correo} onChange={(evento) => setCorreo(evento.target.value)} required />
            <Input label="Contraseña" type="password" autoComplete="new-password" minLength={8} value={claveRegistro} onChange={(evento) => setClaveRegistro(evento.target.value)} required />
            <p className="text-sm text-muted">La organización entra al plan demo. El plan se cambia después, en Ajustes.</p>
            <Button type="submit" disabled={cargando} className="w-full">{cargando ? "Creando..." : "Crear organización"}</Button>
            <button type="button" className="w-full text-center text-sm text-muted hover:text-ink" onClick={() => setPaso("clave")}>Volver</button>
          </form>
        ) : null}
        {paso === "nueva" ? (
          <form onSubmit={confirmarClave} className="mt-6 space-y-4">
            {aviso ? <Alert type="success" message={aviso} /> : null}
            {error ? <Alert message={error} /> : null}
            <Input label="Código" inputMode="numeric" value={codigo} onChange={(evento) => setCodigo(evento.target.value)} required />
            <Input label="Clave nueva" type="password" autoComplete="new-password" value={claveNueva} onChange={(evento) => setClaveNueva(evento.target.value)} required />
            <Button type="submit" disabled={cargando} className="w-full">{cargando ? "Guardando..." : "Guardar clave"}</Button>
          </form>
        ) : null}
        {paso === "clave" ? (
          <CuentasLocales
            ambito={ambito}
            entrar={entrar}
            alPedirMfa={(cuenta) => {
              setCorreo(cuenta.correo);
              setClave(cuenta.clave);
              setPaso("mfa");
            }}
          />
        ) : null}
        {pie}
      </Card>
    </div>
  );
}

function CuentasLocales({
  ambito,
  entrar,
  alPedirMfa,
}: {
  ambito: "cliente" | "plataforma";
  entrar: (correo: string, clave: string, puerta?: "plataforma") => Promise<"ok" | "mfa">;
  alPedirMfa: (cuenta: CuentaLocal) => void;
}) {
  const cuentas = cuentasLocales(ambito);
  const [error, setError] = useState("");
  if (cuentas.length === 0) return null;

  async function usar(cuenta: CuentaLocal) {
    setError("");
    try {
      const resultado = await entrar(cuenta.correo, cuenta.clave, ambito === "plataforma" ? "plataforma" : undefined);
      if (resultado === "mfa") alPedirMfa(cuenta);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
    }
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="text-xs text-muted">Cuentas locales. No salen en el build de producción.</p>
      {error ? (
        <div className="mt-2">
          <Alert message={error} />
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {cuentas.map((cuenta) => (
          <button
            key={cuenta.correo}
            type="button"
            className="rounded-md border border-line px-2 py-1 text-xs text-ink hover:bg-app"
            onClick={() => void usar(cuenta)}
          >
            {cuenta.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}
