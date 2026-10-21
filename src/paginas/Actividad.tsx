import { useState } from "react";
import { fecha, useLista } from "../datos";
import { Alert, Button, Cargando, Modal, PageHeader, Table } from "../componentes/ui";

type Evento = {
  id: string;
  hostname: string;
  usuarioSesion: string;
  proveedor: string;
  superficie: string;
  modelo: string | null;
  consulta: string | null;
  respuesta: string | null;
  tokensEntrada: number | null;
  tokensSalida: number | null;
  costoEstimadoUsd: number | null;
  archivo: { nombre: string; tipo: string | null; tamano: number | null } | null;
  ocurridoEn: string;
};

function textoTokens(entrada: number | null, salida: number | null) {
  if (entrada == null && salida == null) return "—";
  const a = entrada ?? 0;
  const b = salida ?? 0;
  return `${a} + ${b} = ${a + b}`;
}

function textoCosto(valor: number | null) {
  if (valor == null) return "—";
  return `USD ${valor.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
}

function unaLinea(texto: string | null) {
  const limpio = (texto ?? "").replace(/\s+/g, " ").trim();
  return limpio || "—";
}

export function Actividad() {
  const { datos, error, cargando } = useLista<{ eventos: Evento[] }>("/v1/eventos-ia");
  const [detalle, setDetalle] = useState<Evento | null>(null);
  return (
    <section>
      <PageHeader title="Actividad" subtitle="Entrada, salida y costo de cada consulta. El costo suma lo que la respuesta informa de input y de output." />
      {error ? <div className="mb-4"><Alert inline message={error} /></div> : null}
      {cargando ? <Cargando texto="Cargando eventos..." /> : null}
      {!cargando && datos?.eventos.length === 0 ? <p className="text-sm text-muted">Todavía no hay consultas de IA.</p> : null}
      {datos && datos.eventos.length > 0 ? (
        <Table headers={["Cuándo", "Equipo", "Sesión", "Proveedor", "Modelo", "Entrada", "Salida", "Tokens", "Costo", "Archivo"]}>
          {datos.eventos.map((evento) => (
            <tr key={evento.id} className="cursor-pointer align-middle hover:bg-surface-raised" onClick={() => setDetalle(evento)}>
              <td className="whitespace-nowrap px-4 py-3 text-ink">{fecha(evento.ocurridoEn)}</td>
              <td className="px-4 py-3 text-ink">{evento.hostname}</td>
              <td className="whitespace-nowrap px-4 py-3 text-ink">{evento.usuarioSesion}</td>
              <td className="whitespace-nowrap px-4 py-3 text-ink">{evento.proveedor} · {evento.superficie}</td>
              <td className="whitespace-nowrap px-4 py-3 text-ink">{evento.modelo ?? "—"}</td>
              <td className="max-w-48 px-4 py-3 text-ink">
                <span className="block truncate">{unaLinea(evento.consulta)}</span>
              </td>
              <td className="max-w-48 px-4 py-3 text-ink">
                <span className="block truncate">{unaLinea(evento.respuesta)}</span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-ink">{textoTokens(evento.tokensEntrada, evento.tokensSalida)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-ink">{textoCosto(evento.costoEstimadoUsd)}</td>
              <td className="max-w-32 truncate px-4 py-3 text-ink">{evento.archivo?.nombre ?? "—"}</td>
            </tr>
          ))}
        </Table>
      ) : null}
      <Modal
        open={detalle !== null}
        onClose={() => setDetalle(null)}
        title="Detalle de la consulta"
        footer={<div className="flex justify-end"><Button variant="secondary" onClick={() => setDetalle(null)}>Cerrar</Button></div>}
      >
        {detalle ? <Detalle evento={detalle} /> : null}
      </Modal>
    </section>
  );
}

function Detalle({ evento }: { evento: Evento }) {
  const campos = [
    ["Cuándo", fecha(evento.ocurridoEn)],
    ["Equipo", evento.hostname],
    ["Sesión", evento.usuarioSesion],
    ["Proveedor", evento.proveedor],
    ["Superficie", evento.superficie],
    ["Modelo", evento.modelo ?? "—"],
    ["Entrada", evento.consulta ?? "—"],
    ["Salida", evento.respuesta ?? "—"],
    ["Tokens", textoTokens(evento.tokensEntrada, evento.tokensSalida)],
    ["Costo", textoCosto(evento.costoEstimadoUsd)],
    ["Archivo", evento.archivo ? `${evento.archivo.nombre}${evento.archivo.tipo ? ` · ${evento.archivo.tipo}` : ""}${evento.archivo.tamano != null ? ` · ${evento.archivo.tamano} bytes` : ""}` : "—"],
  ];
  return (
    <dl className="space-y-3">
      {campos.map(([nombre, valor]) => (
        <div key={nombre}>
          <dt className="text-xs font-medium text-muted">{nombre}</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}
