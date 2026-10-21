import { etiquetaRol, useSesion } from "../sesion";
import { Card, PageHeader } from "../componentes/ui";

export function Cuenta() {
  const { usuario } = useSesion();
  return (
    <section>
      <PageHeader title="Mi cuenta" subtitle={usuario?.tenantNombre ?? "Plataforma"} />
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
    </section>
  );
}
