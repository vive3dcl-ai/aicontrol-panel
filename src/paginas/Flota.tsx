import { useEffect, useState } from "react";
import { api } from "../api";
import { fecha, useLista } from "../datos";
import { useSesion } from "../sesion";
import { Alert, Badge, Button, Card, Cargando, Input, Modal, PageHeader } from "../componentes/ui";

export type Dispositivo = {
  id: string;
  hostname: string;
  sistema: string;
  versionSo: string;
  versionAgente: string;
  cpu: string;
  ramMb: number;
  usuarioSesion: string;
  machineId?: string | null;
  enlazado?: boolean;
  cuenta?: { nombre: string; correo: string } | null;
  ultimoContacto: string | null;
  estado: string;
  ultimaIa: { proveedor: string; modelo: string | null; ocurridoEn: string } | null;
  organizacion?: string;
  solicitudAjustes?: string;
  desinstalado?: boolean;
  alertaSilencio?: boolean;
  actualizacion?: { estado: "espera" | "descargando" | "aplicando" | "desconectado"; porcentaje: number | null; version: string | null } | null;
};

type ProgresoGlobal = {
  listos: number;
  total: number;
  porcentaje: number;
  enCurso: number;
  enEspera: number;
};

const sistemas: Record<string, string> = { windows: "Windows", macos: "macOS", darwin: "macOS", linux: "Linux" };
const estados: Record<string, string> = {
  enrolado: "Enrolado",
  activo: "Activo",
  mudo: "Mudo",
  pausado: "Pausado",
  reenrolamiento_pendiente: "Reenrolamiento pedido",
};

function ram(mb: number) {
  if (mb >= 1024 && mb % 1024 === 0) return `${mb / 1024} GB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

function textoActualizacion(actualizacion: NonNullable<Dispositivo["actualizacion"]>) {
  if (actualizacion.estado === "descargando") return `Actualizando ${actualizacion.porcentaje ?? 0}%`;
  if (actualizacion.estado === "aplicando") return `Aplicando ${actualizacion.porcentaje ?? 95}%`;
  if (actualizacion.estado === "desconectado") return "Desconectado. Actualiza al conectar.";
  return "En espera del siguiente bloque";
}

function colorEstado(estado: string): "green" | "yellow" | "red" | "slate" {
  if (estado === "activo") return "green";
  if (estado === "mudo" || estado === "reenrolamiento_pendiente") return "yellow";
  if (estado === "pausado") return "red";
  return "slate";
}

export function Flota() {
  const { usuario } = useSesion();
  const { datos, error, cargando, recargar } = useLista<{ dispositivos: Dispositivo[]; actualizacionGlobal?: ProgresoGlobal | null }>("/v1/dispositivos", 2000);
  const [aviso, setAviso] = useState("");
  const [quitar, setQuitar] = useState<Dispositivo | null>(null);
  const [detalle, setDetalle] = useState<Dispositivo | null>(null);
  const [suma, setSuma] = useState({ a: 4, b: 7 });
  const [respuesta, setRespuesta] = useState("");
  const [errorQuitar, setErrorQuitar] = useState("");
  const puedeReenrolar = usuario?.rol === "superadmin" || usuario?.rol === "admin" || usuario?.rol === "responsable_seguridad" || usuario?.rol === "operador";
  const flotaGlobal = usuario?.ambito === "plataforma";

  function abrirQuitar(equipo: Dispositivo) {
    setQuitar(equipo);
    setSuma({ a: 2 + Math.floor(Math.random() * 8), b: 2 + Math.floor(Math.random() * 8) });
    setRespuesta("");
    setErrorQuitar("");
  }

  async function confirmarQuitar() {
    if (!quitar) return;
    if (Number(respuesta) !== suma.a + suma.b) {
      setErrorQuitar("La suma no coincide.");
      return;
    }
    setErrorQuitar("");
    try {
      await api(`/v1/dispositivos/${quitar.id}`, { method: "DELETE" });
      setAviso("Equipo borrado de la flota.");
      setQuitar(null);
      recargar();
    } catch (err) {
      setErrorQuitar(err instanceof Error ? err.message : "No se pudo quitar el equipo");
    }
  }

  async function autorizar(id: string) {
    setAviso("");
    try {
      await api(`/v1/dispositivos/${id}/ajustes/autorizar`, { method: "POST" });
      setAviso("Ajustes del agente autorizados por 15 minutos.");
      recargar();
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No se pudo autorizar");
    }
  }

  return (
    <section>
      <PageHeader
        title="Flota"
        subtitle={flotaGlobal ? "Cada organización lista sus equipos. El alta guarda la identidad de la máquina." : "Esta organización lista solo sus equipos. El alta guarda la identidad de la máquina."}
        action={<Button variant="secondary" onClick={() => recargar()}>Actualizar</Button>}
      />
      {aviso ? (
        <Alert
          type={aviso.startsWith("No se") ? "error" : "success"}
          message={aviso}
          onClose={() => setAviso("")}
        />
      ) : null}
      {error ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {datos?.actualizacionGlobal ? (
        <Card className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-ink">Actualización en curso</h2>
            <span className="text-sm font-medium text-ink">{datos.actualizacionGlobal.porcentaje}%</span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {datos.actualizacionGlobal.listos} de {datos.actualizacionGlobal.total} equipos actualizados.
            {datos.actualizacionGlobal.enCurso > 0 ? ` ${datos.actualizacionGlobal.enCurso} en curso.` : ""}
            {datos.actualizacionGlobal.enEspera > 0 ? ` ${datos.actualizacionGlobal.enEspera} esperan el siguiente bloque.` : ""}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full bg-ink" style={{ width: `${Math.max(0, Math.min(100, datos.actualizacionGlobal.porcentaje))}%` }} />
          </div>
        </Card>
      ) : null}
      {cargando ? <Cargando texto="Cargando equipos..." /> : null}
      {!cargando && datos?.dispositivos.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No hay equipos con cuenta enlazada.</p>
        </Card>
      ) : null}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {datos?.dispositivos.map((equipo) => (
          <Card key={equipo.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">{equipo.hostname}</h2>
                <p className="text-sm text-ink">Usuario ahora: {equipo.usuarioSesion}</p>
                <p className={`text-sm ${equipo.enlazado ? "text-ink" : "font-medium text-amber-700 dark:text-amber-300"}`}>
                  {equipo.enlazado && equipo.cuenta ? `Cuenta: ${equipo.cuenta.nombre}` : "Esperando activación"}
                </p>
                <p className="font-mono text-xs text-muted">ID {equipo.machineId || "aún sin identidad"}</p>
                {flotaGlobal && equipo.organizacion ? <p className="text-xs text-muted">{equipo.organizacion}</p> : null}
              </div>
              <Badge color={equipo.desinstalado ? "red" : colorEstado(equipo.estado)}>
                {equipo.desinstalado ? "Desinstalado" : estados[equipo.estado] ?? equipo.estado}
              </Badge>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-muted">Sistema</dt>
                <dd className="text-ink">{sistemas[equipo.sistema] ?? equipo.sistema} {equipo.versionSo}</dd>
              </div>
              <div>
                <dt className="text-muted">Versión del agente</dt>
                <dd className="text-ink">{equipo.versionAgente}</dd>
              </div>
              {equipo.actualizacion ? (
                <div className="col-span-2">
                  <dt className="text-muted">Actualización</dt>
                  <dd className="text-ink">{textoActualizacion(equipo.actualizacion)}</dd>
                  {equipo.actualizacion.estado === "descargando" || equipo.actualizacion.estado === "aplicando" ? (
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                      <div className="h-full bg-ink" style={{ width: `${Math.max(0, Math.min(100, equipo.actualizacion.porcentaje ?? 0))}%` }} />
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div>
                <dt className="text-muted">CPU</dt>
                <dd className="text-ink">{equipo.cpu}</dd>
              </div>
              <div>
                <dt className="text-muted">RAM</dt>
                <dd className="text-ink">{ram(equipo.ramMb)}</dd>
              </div>
              <div>
                <dt className="text-muted">Último contacto</dt>
                <dd className="text-ink">{fecha(equipo.ultimoContacto)}</dd>
              </div>
            </dl>
            {equipo.desinstalado ? (
              <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">Este equipo desinstaló el agente.</p>
            ) : null}
            {equipo.alertaSilencio ? (
              <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                Sin contacto desde hace más de 5 minutos.
              </p>
            ) : null}
            {equipo.ultimaIa ? (
              <p className="mt-3 text-sm text-muted">
                Última IA: {equipo.ultimaIa.proveedor}
                {equipo.ultimaIa.modelo ? ` · ${equipo.ultimaIa.modelo}` : ""} · {fecha(equipo.ultimaIa.ocurridoEn)}
              </p>
            ) : null}
            {equipo.solicitudAjustes === "pendiente" ? (
              <p className="mt-3 text-sm font-medium text-ink">Solicitando autorización para abrir los ajustes del agente.</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => setDetalle(equipo)}>Detalles</Button>
              {puedeReenrolar && equipo.solicitudAjustes === "pendiente" ? (
                <Button onClick={() => autorizar(equipo.id)}>Autorizar ajustes</Button>
              ) : null}
              {puedeReenrolar && equipo.desinstalado && equipo.estado !== "activo" ? (
                <Button onClick={() => abrirQuitar(equipo)}>Borrar</Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
      <Modal
        open={quitar !== null}
        onClose={() => setQuitar(null)}
        title="Borrar equipo"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setQuitar(null)}>Cancelar</Button>
            <Button onClick={() => void confirmarQuitar()} disabled={Number(respuesta) !== suma.a + suma.b}>Borrar</Button>
          </div>
        }
      >
        <p className="text-sm text-ink">
          Vas a borrar {quitar?.hostname} de la flota. El agente ya está desinstalado en ese equipo. Esta acción no se deshace.
        </p>
        <div className="mt-4">
          <Input
            label={`Escribe el resultado de ${suma.a} + ${suma.b}`}
            inputMode="numeric"
            value={respuesta}
            onChange={(evento) => setRespuesta(evento.target.value)}
            autoFocus
          />
        </div>
        {errorQuitar ? <p className="mt-3 text-sm text-red-600">{errorQuitar}</p> : null}
      </Modal>
      <Modal
        open={detalle !== null}
        onClose={() => setDetalle(null)}
        title={detalle ? `Consumo de ${detalle.hostname}` : "Consumo"}
        footer={<div className="flex justify-end"><Button variant="secondary" onClick={() => setDetalle(null)}>Cerrar</Button></div>}
      >
        {detalle ? <Consumo id={detalle.id} /> : null}
      </Modal>
    </section>
  );
}

type Muestra = { cpuPorcentaje: number; ramMb: number; capturadoEn: string };

function Consumo({ id }: { id: string }) {
  const [muestras, setMuestras] = useState<Muestra[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      try {
        const datos = await api<{ muestras: Muestra[] }>(`/v1/dispositivos/${id}/consumo`);
        if (vivo) {
          setMuestras(datos.muestras);
          setError("");
        }
      } catch (err) {
        if (vivo) setError(err instanceof Error ? err.message : "No se pudo leer el consumo");
      }
    }
    void cargar();
    const reloj = window.setInterval(() => void cargar(), 5000);
    return () => {
      vivo = false;
      window.clearInterval(reloj);
    };
  }, [id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (muestras.length === 0) return <p className="text-sm text-muted">El agente todavía no envió consumo. El gráfico se actualiza cada 5 segundos.</p>;
  return (
    <div className="space-y-5">
      <Serie titulo="CPU del agente" unidad="%" color="#16a34a" valores={muestras.map((muestra) => muestra.cpuPorcentaje)} />
      <Serie titulo="RAM del agente" unidad="MB" color="#38bdf8" valores={muestras.map((muestra) => muestra.ramMb)} />
      <p className="text-xs text-muted">Últimos 15 minutos. Se actualiza cada 5 segundos.</p>
    </div>
  );
}

function Serie({ titulo, unidad, color, valores }: { titulo: string; unidad: string; color: string; valores: number[] }) {
  const ancho = 520;
  const alto = 140;
  const maximo = Math.max(1, ...valores);
  const puntos = valores.map((valor, indice) => {
    const x = valores.length === 1 ? ancho / 2 : (indice / (valores.length - 1)) * (ancho - 8) + 4;
    const y = alto - 12 - (valor / maximo) * (alto - 28);
    return `${x},${y}`;
  }).join(" ");
  const ultimo = valores[valores.length - 1] ?? 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-ink">{titulo}</p>
        <p className="text-sm text-ink">{ultimo.toLocaleString("es-CL", { maximumFractionDigits: 1 })} {unidad}</p>
      </div>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="mt-2 h-36 w-full" role="img" aria-label={titulo}>
        <polyline fill="none" stroke={color} strokeWidth="2" points={puntos} />
      </svg>
    </div>
  );
}
