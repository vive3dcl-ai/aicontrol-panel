import { useState } from "react";
import { api } from "../api";
import { etiquetaRol, useSesion, type Usuario } from "../sesion";
import { Alert, Button, Card, Input, PageHeader } from "../componentes/ui";

export function Cuenta() {
  const { usuario, fijarUsuario } = useSesion();
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [codigo, setCodigo] = useState("");
  const [claveMfa, setClaveMfa] = useState("");
  const [esperandoCodigo, setEsperandoCodigo] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState("");

  async function cambiarClave(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    setOcupado("clave");
    try {
      const datos = await api<{ usuario: Usuario }>("/v1/cuenta/clave", {
        method: "POST",
        body: JSON.stringify({ actual, nueva }),
      });
      fijarUsuario(datos.usuario);
      setActual("");
      setNueva("");
      setAviso("La clave quedó actualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la clave");
    } finally {
      setOcupado("");
    }
  }

  async function pedirMfa() {
    setError("");
    setOcupado("pedir");
    try {
      await api("/v1/cuenta/mfa/pedir", { method: "POST" });
      setEsperandoCodigo(true);
      setAviso("Enviamos un código de 6 dígitos a tu correo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el código");
    } finally {
      setOcupado("");
    }
  }

  async function activarMfa(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    setOcupado("mfa");
    try {
      const datos = await api<{ usuario: Usuario }>("/v1/cuenta/mfa", {
        method: "POST",
        body: JSON.stringify({ codigo }),
      });
      fijarUsuario(datos.usuario);
      setCodigo("");
      setEsperandoCodigo(false);
      setAviso("El doble factor quedó activo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar el doble factor");
    } finally {
      setOcupado("");
    }
  }

  async function apagarMfa(evento: React.FormEvent) {
    evento.preventDefault();
    setError("");
    setOcupado("apagar");
    try {
      const datos = await api<{ usuario: Usuario }>("/v1/cuenta/mfa/apagar", {
        method: "POST",
        body: JSON.stringify({ clave: claveMfa }),
      });
      fijarUsuario(datos.usuario);
      setClaveMfa("");
      setAviso("El doble factor quedó desactivado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desactivar el doble factor");
    } finally {
      setOcupado("");
    }
  }

  return (
    <section>
      <PageHeader title="Mi cuenta" subtitle={usuario?.tenantNombre ?? "Plataforma"} />
      {usuario?.debeCambiarClave ? (
        <div className="mb-4"><Alert inline message="Tienes que elegir una clave nueva antes de usar el panel." /></div>
      ) : null}
      {aviso ? <Alert type="success" message={aviso} onClose={() => setAviso("")} /> : null}
      {error ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      <Card>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted">Nombre</dt>
            <dd className="mt-1 font-medium text-ink">{usuario?.nombre}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Email</dt>
            <dd className="mt-1 font-medium text-ink">{usuario?.correo}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Rol</dt>
            <dd className="mt-1 font-medium text-ink">{usuario ? etiquetaRol(usuario.rol) : ""}</dd>
          </div>
        </dl>
      </Card>
      <form onSubmit={cambiarClave} className="mt-4 max-w-xl space-y-4 rounded-md border border-line bg-surface p-4 sm:p-5">
        <h2 className="font-medium text-ink">Cambiar contraseña</h2>
        <Input label="Clave actual" type="password" autoComplete="current-password" value={actual} onChange={(evento) => setActual(evento.target.value)} required />
        <Input label="Clave nueva" type="password" autoComplete="new-password" value={nueva} onChange={(evento) => setNueva(evento.target.value)} required />
        <Button type="submit" disabled={ocupado === "clave"}>{ocupado === "clave" ? "Guardando..." : "Guardar clave"}</Button>
      </form>
      <div className="mt-4 max-w-xl space-y-4 rounded-md border border-line bg-surface p-4 sm:p-5">
        <h2 className="font-medium text-ink">Doble factor</h2>
        <p className="text-sm text-muted">
          {usuario?.mfaActivo ? "El ingreso pide un código de 6 dígitos que llega al correo." : "Puedes pedir un código al correo en cada ingreso."}
        </p>
        {usuario?.mfaActivo ? (
          <form onSubmit={apagarMfa} className="space-y-4">
            <Input label="Clave actual" type="password" value={claveMfa} onChange={(evento) => setClaveMfa(evento.target.value)} required />
            <Button type="submit" variant="secondary" disabled={ocupado === "apagar"}>{ocupado === "apagar" ? "Desactivando..." : "Desactivar"}</Button>
          </form>
        ) : esperandoCodigo ? (
          <form onSubmit={activarMfa} className="space-y-4">
            <Input label="Código de 6 dígitos" inputMode="numeric" value={codigo} onChange={(evento) => setCodigo(evento.target.value)} required />
            <Button type="submit" disabled={ocupado === "mfa"}>{ocupado === "mfa" ? "Activando..." : "Activar"}</Button>
          </form>
        ) : (
          <Button type="button" onClick={() => void pedirMfa()} disabled={ocupado === "pedir"}>
            {ocupado === "pedir" ? "Enviando..." : "Activar doble factor"}
          </Button>
        )}
      </div>
    </section>
  );
}
