import { useState } from "react";
import { fecha, useLista } from "../datos";
import { Alert, Badge, Cargando, PageHeader } from "../componentes/ui";

type Linea = {
  id: number;
  nivel: "info" | "error";
  metodo: string;
  ruta: string;
  estado: number;
  mensaje: string;
  en: string;
};

export function Registros() {
  const [vista, setVista] = useState<"errores" | "completo">("errores");
  const lista = useLista<{ lineas: Linea[] }>(`/v1/plataforma/registros?vista=${vista}`, 5000);

  return (
    <section>
      <PageHeader
        title="Registros"
        subtitle="Lo que atiende este proceso. Errores separa las respuestas 500. Completo incluye el resto de las peticiones."
      />
      <div className="mb-4 flex gap-1 border-b border-line">
        <Pestaña activa={vista === "errores"} onClick={() => setVista("errores")}>Errores</Pestaña>
        <Pestaña activa={vista === "completo"} onClick={() => setVista("completo")}>Completo</Pestaña>
      </div>
      {lista.error ? <div className="mb-4"><Alert inline message={lista.error} /></div> : null}
      {lista.cargando && !lista.datos ? <Cargando texto="Cargando el registro..." /> : null}
      {lista.datos ? (
        <div className="overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-raised">
                {["Cuándo", "Nivel", "Estado", "Ruta", "Detalle"].map((titulo) => (
                  <th key={titulo} className="px-4 py-3 text-left font-medium text-muted">{titulo}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lista.datos.lineas.map((linea) => (
                <tr key={linea.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{fecha(linea.en)}</td>
                  <td className="px-4 py-3"><Badge color={linea.nivel === "error" ? "red" : "slate"}>{linea.nivel === "error" ? "Error" : "Info"}</Badge></td>
                  <td className="px-4 py-3 text-ink">{linea.estado}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink">{linea.metodo} {linea.ruta}</td>
                  <td className="px-4 py-3 text-muted">{linea.mensaje}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {lista.datos && lista.datos.lineas.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{vista === "errores" ? "No hay errores en este proceso." : "Todavía no hay líneas."}</p>
      ) : null}
    </section>
  );
}

function Pestaña({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${activa ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
      {children}
    </button>
  );
}
