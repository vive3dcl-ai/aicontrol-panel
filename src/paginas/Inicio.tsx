import { etiquetaRol, useSesion } from "../sesion";
import { Card, PageHeader } from "../componentes/ui";

export function Inicio() {
  const { usuario } = useSesion();
  return (
    <section>
      <PageHeader title="Inicio" subtitle="Avisos y datos de tu cuenta en la organización." />
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
          <div>
            <dt className="text-sm text-muted">Organización</dt>
            <dd className="mt-1 font-medium text-ink">{usuario?.tenantNombre ?? "—"}</dd>
          </div>
        </dl>
      </Card>
    </section>
  );
}
