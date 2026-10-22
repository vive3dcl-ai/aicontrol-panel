import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { useLista } from "../datos";
import { useSesion } from "../sesion";
import { Alert, Button, Card, Cargando, Input, Modal, PageHeader, Select } from "../componentes/ui";
import { Agentes } from "./Agentes";
import { ControlesListado, useListado } from "../listado";

type Politica = {
  id: string;
  nombre: string;
  accion: string;
  alcance: string;
  sujeto: string | null;
  destino: string;
  proveedor: string | null;
  endpoint: string | null;
  puntoRedireccion: string | null;
  proveedorId: string | null;
  endpointId: string | null;
  puntoRedireccionId: string | null;
  sujetoId: string | null;
  activa: boolean;
};

type Proveedor = { id: string; slug: string; nombre: string; externo?: boolean; endpoints: { id: string; etiqueta: string; host: string }[] };
type Punto = { id: string; nombre: string };
type Grupo = { id: string; nombre: string };
type Equipo = { id: string; hostname: string };

const vacia = { nombre: "", accion: "bloquear", alcance: "tenant", sujeto: "", proveedorId: "", endpointId: "", puntoId: "", modo: "proveedor" };

export function Politicas() {
  const { usuario } = useSesion();
  const { datos, error, cargando, recargar } = useLista<{ politicas: Politica[] }>("/v1/politicas");
  const [aviso, setAviso] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [editor, setEditor] = useState<Politica | null | false>(false);
  const [quitar, setQuitar] = useState<Politica | null>(null);
  const [pestaña, setPestaña] = useState<"web" | "agentes" | "navegadores">("web");
  const [pedirPrograma, setPedirPrograma] = useState(0);
  const [pedirNavegador, setPedirNavegador] = useState(0);
  const [modoWeb, setModoWeb] = useState<"aceptar" | "bloquear" | null>(null);
  const [modoPendiente, setModoPendiente] = useState<"aceptar" | "bloquear" | null>(null);
  const [confirmaModo, setConfirmaModo] = useState(false);
  const puede = usuario?.rol === "administrador" || usuario?.rol === "responsable_seguridad" || usuario?.ambito === "soporte";
  const lista = useListado(
    datos?.politicas ?? [],
    (politica) => `${politica.nombre} ${politica.accion} ${politica.alcance} ${politica.proveedor ?? ""} ${politica.endpoint ?? ""} ${politica.destino} ${politica.sujeto ?? ""}`,
    (politica) => politica.nombre,
  );

  useEffect(() => {
    api<{ modo: "aceptar" | "bloquear" }>("/v1/politicas/modo-web")
      .then((respuesta) => setModoWeb(respuesta.modo))
      .catch((err) => setAviso(err instanceof Error ? err.message : "No se pudo leer el modo web"));
  }, []);

  function pedirModoWeb(modo: "aceptar" | "bloquear") {
    if (!puede || modo === modoWeb) return;
    setAviso("");
    setConfirmaModo(false);
    setModoPendiente(modo);
  }

  async function cambiarModoWeb() {
    if (!modoPendiente || !confirmaModo) return;
    const modo = modoPendiente;
    setAviso("");
    try {
      const respuesta = await api<{ modo: "aceptar" | "bloquear" }>("/v1/politicas/modo-web", { method: "PUT", body: JSON.stringify({ modo }) });
      setModoWeb(respuesta.modo);
      setModoPendiente(null);
      setConfirmaModo(false);
      setMensaje(modo === "bloquear"
        ? "Modo web Bloquear activado. Las reglas anteriores se quitaron. Los sitios web quedan bloqueados salvo las excepciones que publiques."
        : "Modo web Aceptar activado. Las reglas anteriores se quitaron. Los proveedores quedan permitidos salvo las políticas que publiques.");
      recargar();
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No se pudo cambiar el modo web");
    }
  }

  async function quitarPolitica(politica: Politica) {
    setAviso("");
    try {
      await api(`/v1/politicas/${politica.id}`, { method: "DELETE" });
      setQuitar(null);
      setMensaje("Política quitada.");
      recargar();
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No se pudo quitar");
    }
  }

  async function cambiar(id: string, activa: boolean) {
    setAviso("");
    try {
      await api(`/v1/politicas/${id}`, { method: "PATCH", body: JSON.stringify({ activa }) });
      setMensaje(activa ? "Política activada." : "Política desactivada.");
      recargar();
    } catch (err) {
      setAviso(err instanceof Error ? err.message : "No se pudo actualizar");
    }
  }

  return (
    <section>
      <PageHeader
        title="Políticas"
        subtitle={pestaña === "web"
          ? "Bloquean o redirigen sitios de la base de IA. Un grupo, un usuario de sesión o un equipo pisan la acción de todo el tenant."
          : pestaña === "navegadores"
            ? "Navegadores. Bloquear cierra el proceso a los pocos segundos y avisa en la pantalla."
            : "Programas de escritorio. Bloquear cierra el proceso a los pocos segundos y avisa en la pantalla."}
        action={!puede ? undefined : pestaña === "web"
          ? <Button onClick={() => { setAviso(""); setEditor(null); }}>Nueva política</Button>
          : pestaña === "navegadores"
            ? <Button onClick={() => setPedirNavegador((valor) => valor + 1)}>Nuevo navegador</Button>
            : <Button onClick={() => setPedirPrograma((valor) => valor + 1)}>Nuevo programa</Button>}
      />
      <div className="mb-4 flex gap-1 border-b border-line">
        <Pestaña activa={pestaña === "web"} onClick={() => setPestaña("web")}>Web</Pestaña>
        <Pestaña activa={pestaña === "agentes"} onClick={() => setPestaña("agentes")}>Agentes</Pestaña>
        <Pestaña activa={pestaña === "navegadores"} onClick={() => setPestaña("navegadores")}>Navegadores</Pestaña>
      </div>
      {pestaña === "agentes" ? <Agentes embebido abrir={pedirPrograma} clase="escritorio" /> : null}
      {pestaña === "navegadores" ? <Agentes embebido abrir={pedirNavegador} clase="navegador" /> : null}
      {pestaña === "web" && error ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {pestaña === "web" && cargando ? <Cargando /> : null}
      {pestaña === "web" ? <div className="space-y-3">
        <Card className="py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-ink">Modo de políticas web</p>
              <p className="text-sm text-muted">Aceptar permite por defecto. Bloquear bloquea los endpoints web y deja pasar las excepciones Permitir o Redirigir.</p>
            </div>
            <div className="inline-flex rounded-md border border-line bg-surface-raised p-1">
              <button type="button" disabled={!puede || modoWeb === null} onClick={() => pedirModoWeb("aceptar")} className={`rounded px-3 py-2 text-sm font-medium ${modoWeb === "aceptar" ? "bg-accent-soft text-ink" : "text-muted hover:text-ink"}`}>Aceptar</button>
              <button type="button" disabled={!puede || modoWeb === null} onClick={() => pedirModoWeb("bloquear")} className={`rounded px-3 py-2 text-sm font-medium ${modoWeb === "bloquear" ? "bg-accent-soft text-ink" : "text-muted hover:text-ink"}`}>Bloquear</button>
            </div>
          </div>
        </Card>
        {puede ? <SombraFija onAviso={setAviso} onMensaje={setMensaje} /> : <SombraFija onAviso={setAviso} onMensaje={setMensaje} soloLectura />}
        <ControlesListado
          busqueda={lista.busqueda}
          onBusqueda={lista.setBusqueda}
          tamano={lista.tamano}
          onTamano={lista.setTamano}
          pagina={lista.pagina}
          paginas={lista.paginas}
          total={lista.total}
          onPagina={lista.setPagina}
        />
        {lista.filas.map((politica) => (
          <Card key={politica.id} className="py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p>
                <span className="font-medium text-ink">{politica.nombre}</span>
                <span className="text-muted"> · {politica.accion} · {politica.alcance}</span>
                {politica.proveedor ? <span className="text-muted"> · {politica.proveedor}</span> : null}
                {politica.endpoint ? <span className="text-muted"> · {politica.endpoint}</span> : null}
                {!politica.proveedor && !politica.endpoint ? <span className="text-muted"> · {politica.destino}</span> : null}
                {politica.puntoRedireccion ? <span className="text-muted"> · {politica.puntoRedireccion}</span> : null}
                {politica.sujeto ? <span className="text-muted"> · {politica.sujeto}</span> : null}
                {politica.activa ? null : <span className="text-muted"> · inactiva</span>}
              </p>
              {puede ? (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => void cambiar(politica.id, !politica.activa)}>
                    {politica.activa ? "Desactivar" : "Activar"}
                  </Button>
                  <Button variant="secondary" onClick={() => { setAviso(""); setEditor(politica); }}>Editar</Button>
                  <Button variant="secondary" onClick={() => setQuitar(politica)}>Quitar</Button>
                </div>
              ) : null}
            </div>
          </Card>
        ))}
        {!cargando && lista.total === 0 ? <p className="text-sm text-muted">No hay políticas para ese filtro.</p> : null}
      </div> : null}
      {puede && editor !== false ? (
        <Editor
          politica={editor}
          onCerrar={() => setEditor(false)}
          onAviso={setAviso}
          onLista={() => {
            setMensaje(editor ? "Política actualizada." : "Política publicada.");
            recargar();
          }}
        />
      ) : null}
      {modoPendiente ? (
        <Modal
          open
          onClose={() => setModoPendiente(null)}
          title="Cambiar el modo web"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setModoPendiente(null)}>Cancelar</Button>
              <Button onClick={() => void cambiarModoWeb()} disabled={!confirmaModo}>Continuar</Button>
            </div>
          }
        >
          <p className="text-sm text-ink">
            Vas a pasar a {modoPendiente === "bloquear" ? "Bloquear" : "Aceptar"}. Al modificar el modo, las reglas ya definidas se perderán. Los proveedores quedan en el modo nuevo y las excepciones actuales se borran.
          </p>
          <label className="mt-4 flex items-start gap-2 text-sm text-ink">
            <input type="checkbox" className="mt-0.5" checked={confirmaModo} onChange={(evento) => setConfirmaModo(evento.target.checked)} />
            Confirmo que se perderán las reglas definidas
          </label>
        </Modal>
      ) : null}
      {quitar ? (
        <Modal
          open
          onClose={() => setQuitar(null)}
          title="Quitar política"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setQuitar(null)}>Cancelar</Button>
              <Button onClick={() => void quitarPolitica(quitar)}>Quitar</Button>
            </div>
          }
        >
          <p className="text-sm text-ink">Vas a quitar {quitar.nombre}. El agente deja de aplicar esta regla en el próximo latido.</p>
        </Modal>
      ) : null}
      {mensaje ? <Alert type="success" message={mensaje} onClose={() => setMensaje("")} /> : null}
      {aviso ? <Alert message={aviso} onClose={() => setAviso("")} /> : null}
    </section>
  );
}

function SombraFija({ onAviso, onMensaje, soloLectura = false }: { onAviso: (texto: string) => void; onMensaje: (texto: string) => void; soloLectura?: boolean }) {
  const puntos = useLista<{ puntos: Punto[] }>("/v1/puntos-redireccion");
  const [accion, setAccion] = useState("permitir");
  const [puntoId, setPuntoId] = useState("");
  const [lista, setLista] = useState(false);

  useEffect(() => {
    api<{ accion: string; puntoRedireccionId: string | null }>("/v1/politicas/shadow-ai")
      .then((respuesta) => {
        setAccion(respuesta.accion);
        setPuntoId(respuesta.puntoRedireccionId ?? "");
        setLista(true);
      })
      .catch((err) => onAviso(err instanceof Error ? err.message : "No se pudo leer Shadow AI"));
  }, [onAviso]);

  async function guardar() {
    onAviso("");
    try {
      const respuesta = await api<{ accion: string; puntoRedireccionId: string | null }>("/v1/politicas/shadow-ai", {
        method: "PUT",
        body: JSON.stringify({ accion, ...(accion === "redirigir" ? { puntoRedireccionId: puntoId } : {}) }),
      });
      setAccion(respuesta.accion);
      setPuntoId(respuesta.puntoRedireccionId ?? "");
      onMensaje("Regla Shadow AI guardada. Cubre el feed que todavía no se adoptó.");
    } catch (err) {
      onAviso(err instanceof Error ? err.message : "No se pudo guardar Shadow AI");
    }
  }

  return (
    <Card className="py-3">
      <div className="flex flex-col gap-3">
        <div>
          <p className="font-medium text-ink">Shadow AI</p>
          <p className="text-sm text-muted">Regla fija para todos los dominios del feed dinámico que no fueron adoptados. Quien quiera una excepción adopta el proveedor y crea una política normal.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
          <Select label="Acción" value={accion} disabled={!lista || soloLectura} onChange={(evento) => setAccion(evento.target.value)}>
            <option value="permitir">Permitir</option>
            <option value="bloquear">Bloquear</option>
            <option value="redirigir">Redirigir</option>
          </Select>
          {accion === "redirigir" ? (
            <Select label="Punto de redirección" value={puntoId} disabled={soloLectura} onChange={(evento) => setPuntoId(evento.target.value)} required>
              <option value="">Elegir</option>
              {puntos.datos?.puntos.map((punto) => <option key={punto.id} value={punto.id}>{punto.nombre}</option>)}
            </Select>
          ) : <div />}
          {soloLectura ? null : <Button onClick={() => void guardar()} disabled={!lista}>Guardar</Button>}
        </div>
      </div>
    </Card>
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

function formularioDe(politica: Politica | null) {
  if (!politica) return vacia;
  return {
    nombre: politica.nombre,
    accion: politica.accion,
    alcance: politica.alcance,
    sujeto: politica.sujetoId ?? "",
    proveedorId: politica.proveedorId ?? "",
    endpointId: politica.endpointId ?? "",
    puntoId: politica.puntoRedireccionId ?? "",
    modo: politica.endpointId ? "endpoint" : "proveedor",
  };
}

function Editor({ politica, onCerrar, onAviso, onLista }: { politica: Politica | null; onCerrar: () => void; onAviso: (texto: string) => void; onLista: () => void }) {
  const catalogo = useLista<{ proveedores: Proveedor[] }>("/v1/catalogo");
  const puntos = useLista<{ puntos: Punto[] }>("/v1/puntos-redireccion");
  const grupos = useLista<{ grupos: Grupo[] }>("/v1/grupos");
  const equipos = useLista<{ dispositivos: Equipo[] }>("/v1/dispositivos");
  const [form, setForm] = useState(() => formularioDe(politica));
  const proveedor = catalogo.datos?.proveedores.find((item) => item.id === form.proveedorId);

  async function publicar(evento: FormEvent) {
    evento.preventDefault();
    onAviso("");
    const endpoint = proveedor?.endpoints.find((item) => item.id === form.endpointId);
    const destino = form.modo === "endpoint" ? endpoint?.host : proveedor?.slug;
    if (!destino) {
      onAviso("Elige el proveedor o el endpoint.");
      return;
    }
    try {
      await api(politica ? `/v1/politicas/${politica.id}` : "/v1/politicas", {
        method: politica ? "PUT" : "POST",
        body: JSON.stringify({
          contrato: 1,
          nombre: form.nombre,
          accion: form.accion,
          alcance: form.alcance,
          destino,
          ...(form.modo === "endpoint" ? { endpointId: form.endpointId } : { proveedorId: form.proveedorId }),
          ...(form.accion === "redirigir" ? { puntoRedireccionId: form.puntoId } : {}),
          ...(form.alcance !== "tenant" ? { sujeto: form.sujeto } : {}),
        }),
      });
      setForm(vacia);
      onCerrar();
      onLista();
    } catch (err) {
      onAviso(err instanceof Error ? err.message : "No se pudo publicar");
    }
  }

  return (
    <Modal
      open
      onClose={onCerrar}
      title={politica ? `Editar ${politica.nombre}` : "Nueva política"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" form="form-politica">{politica ? "Guardar" : "Publicar"}</Button>
        </div>
      }
    >
      <form id="form-politica" onSubmit={publicar} className="grid gap-3">
        <Input label="Nombre" value={form.nombre} onChange={(evento) => setForm({ ...form, nombre: evento.target.value })} required />
        <Select label="Acción" value={form.accion} onChange={(evento) => setForm({ ...form, accion: evento.target.value })}>
          <option value="permitir">Permitir</option>
          <option value="bloquear">Bloquear</option>
          <option value="redirigir">Redirigir</option>
        </Select>
        <Select label="Objetivo" value={form.modo} onChange={(evento) => setForm({ ...form, modo: evento.target.value, endpointId: "" })}>
          <option value="proveedor">Proveedor completo</option>
          <option value="endpoint">Un endpoint</option>
        </Select>
        <Select label="Proveedor" value={form.proveedorId} onChange={(evento) => setForm({ ...form, proveedorId: evento.target.value, endpointId: "" })} required>
          <option value="">Elegir</option>
          {catalogo.datos?.proveedores.filter((item) => !item.externo).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
        </Select>
        {form.modo === "endpoint" ? (
          <div className="md:col-span-2">
            <Select label="Endpoint" value={form.endpointId} onChange={(evento) => setForm({ ...form, endpointId: evento.target.value })} required>
              <option value="">Elegir</option>
              {proveedor?.endpoints.map((item) => <option key={item.id} value={item.id}>{item.etiqueta} · {item.host}</option>)}
            </Select>
          </div>
        ) : null}
        {form.accion === "redirigir" ? (
          <div className="md:col-span-2">
            <Select label="Punto de redirección" value={form.puntoId} onChange={(evento) => setForm({ ...form, puntoId: evento.target.value })} required>
              <option value="">Elegir</option>
              {puntos.datos?.puntos.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </Select>
          </div>
        ) : null}
        <Select label="Alcance" value={form.alcance} onChange={(evento) => setForm({ ...form, alcance: evento.target.value, sujeto: "" })}>
          <option value="tenant">Todo el tenant</option>
          <option value="grupo">Grupo de usuarios de sesión</option>
          <option value="usuario">Un usuario de sesión</option>
          <option value="equipo">Un equipo</option>
        </Select>
        {form.alcance === "grupo" ? (
          <Select label="Grupo" value={form.sujeto} onChange={(evento) => setForm({ ...form, sujeto: evento.target.value })} required>
            <option value="">Elegir</option>
            {grupos.datos?.grupos.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nombre}</option>)}
          </Select>
        ) : null}
        {form.alcance === "usuario" ? (
          <Input label="Usuario de sesión" value={form.sujeto} onChange={(evento) => setForm({ ...form, sujeto: evento.target.value })} required />
        ) : null}
        {form.alcance === "equipo" ? (
          <Select label="Equipo" value={form.sujeto} onChange={(evento) => setForm({ ...form, sujeto: evento.target.value })} required>
            <option value="">Elegir</option>
            {equipos.datos?.dispositivos.map((equipo) => <option key={equipo.id} value={equipo.id}>{equipo.hostname}</option>)}
          </Select>
        ) : null}
      </form>
    </Modal>
  );
}
