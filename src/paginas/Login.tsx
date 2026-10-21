import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { destinoInicio, useSesion } from "../sesion";
import { Alert, Button, Card, Input, Marca } from "../componentes/ui";
import { cuentaLocalInicial, cuentasLocales, type CuentaLocal } from "../local";

export function LoginCliente() {
  const { usuario, listo, entrar } = useSesion();
  const inicial = cuentaLocalInicial("cliente");
  const [correo, setCorreo] = useState(inicial.correo);
  const [clave, setClave] = useState(inicial.clave);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  if (!listo) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Cargando...</div>;
  }
  if (usuario) return <Navigate to={destinoInicio(usuario.rol)} replace />;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    setCargando(true);
    try {
      await entrar(correo.trim(), clave);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Marca grande />
        <h1 className="text-xl font-bold text-ink">AIcontrol</h1>
        <p className="mt-1 text-sm text-muted">Inicia sesión en tu cuenta</p>
        <form onSubmit={enviar} className="mt-6 space-y-4">
          {error ? <Alert message={error} /> : null}
          <Input label="Email" type="email" autoComplete="username" value={correo} onChange={(evento) => setCorreo(evento.target.value)} required />
          <Input label="Contraseña" type="password" autoComplete="current-password" value={clave} onChange={(evento) => setClave(evento.target.value)} required />
          <Button type="submit" disabled={cargando} className="w-full">
            {cargando ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <CuentasLocales ambito="cliente" entrar={entrar} />
      </Card>
    </div>
  );
}

export function LoginPlataforma() {
  const { usuario, listo, entrar } = useSesion();
  const inicial = cuentaLocalInicial("plataforma");
  const [correo, setCorreo] = useState(inicial.correo);
  const [clave, setClave] = useState(inicial.clave);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  if (!listo) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Cargando...</div>;
  }
  if (usuario) return <Navigate to={destinoInicio(usuario.rol)} replace />;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    setCargando(true);
    try {
      await entrar(correo.trim(), clave, "plataforma");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo entrar");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Marca grande />
        <h1 className="text-xl font-bold text-ink">AIcontrol Admin</h1>
        <p className="mt-1 text-sm text-muted">Inicia sesión para gestionar la plataforma</p>
        <form onSubmit={enviar} className="mt-6 space-y-4">
          {error ? <Alert message={error} /> : null}
          <Input label="Email" type="email" autoComplete="username" value={correo} onChange={(evento) => setCorreo(evento.target.value)} required />
          <Input label="Contraseña" type="password" autoComplete="current-password" value={clave} onChange={(evento) => setClave(evento.target.value)} required />
          <Button type="submit" disabled={cargando} className="w-full">
            {cargando ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        <CuentasLocales ambito="plataforma" entrar={entrar} />
        <p className="mt-4 text-center text-sm text-muted">
          <Link to="/login" className="text-ink hover:underline">
            Volver
          </Link>
        </p>
      </Card>
    </div>
  );
}

function CuentasLocales({
  ambito,
  entrar,
}: {
  ambito: "cliente" | "plataforma";
  entrar: (correo: string, clave: string, puerta?: "plataforma") => Promise<void>;
}) {
  const cuentas = cuentasLocales(ambito);
  const [error, setError] = useState("");
  if (cuentas.length === 0) return null;

  async function usar(cuenta: CuentaLocal) {
    setError("");
    try {
      await entrar(cuenta.correo, cuenta.clave, ambito === "plataforma" ? "plataforma" : undefined);
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
