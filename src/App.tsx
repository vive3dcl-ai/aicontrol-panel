import { Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./componentes/Shell";
import { Cargando } from "./componentes/ui";
import { destinoInicio, useSesion } from "./sesion";
import { LoginCliente, LoginPlataforma } from "./paginas/Login";
import { Flota } from "./paginas/Flota";
import { Actividad } from "./paginas/Actividad";
import { Politicas } from "./paginas/Politicas";
import { Avisos } from "./paginas/Avisos";
import { Notificaciones } from "./paginas/Notificaciones";
import { Cuentas } from "./paginas/Cuentas";
import { Ajustes } from "./paginas/Ajustes";
import { BaseIa } from "./paginas/BaseIa";
import { Grupos } from "./paginas/Grupos";
import { Tenants } from "./paginas/Tenants";
import { Inicio } from "./paginas/Inicio";
import { Cuenta } from "./paginas/Cuenta";
import { Actualizaciones } from "./paginas/Actualizaciones";
import { Cluster } from "./paginas/Cluster";
import { AjustesSistema } from "./paginas/AjustesSistema";
import { Registros } from "./paginas/Registros";

function destinoSinSesion() {
  return sessionStorage.getItem("gobernanza-puerta") || "/login";
}

function Privado({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { usuario, listo } = useSesion();
  if (!listo) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Cargando...</div>;
  }
  if (!usuario) return <Navigate to={destinoSinSesion()} replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to={destinoInicio(usuario.rol)} replace />;
  return <Shell>{children}</Shell>;
}

function Puerta() {
  const { usuario, listo } = useSesion();
  if (!listo) return <Cargando />;
  if (!usuario) return <Navigate to={destinoSinSesion()} replace />;
  return <Navigate to={destinoInicio(usuario.rol)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginCliente />} />
      <Route path="/t/:slug" element={<Navigate to="/login" replace />} />
      <Route path="/admin/login" element={<LoginPlataforma />} />
      <Route path="/" element={<Puerta />} />
      <Route path="/inicio" element={<Privado roles={["user"]}><Inicio /></Privado>} />
      <Route path="/cuenta" element={<Privado><Cuenta /></Privado>} />
      <Route path="/admin/tenants" element={<Privado roles={["superadmin", "admin"]}><Tenants /></Privado>} />
      <Route path="/admin/cluster" element={<Privado roles={["superadmin", "admin"]}><Cluster /></Privado>} />
      <Route path="/admin/base-ia" element={<Privado roles={["superadmin", "admin"]}><BaseIa ambito="plataforma" /></Privado>} />
      <Route path="/admin/ajustes" element={<Privado roles={["superadmin", "admin"]}><AjustesSistema /></Privado>} />
      <Route path="/admin/registros" element={<Privado roles={["superadmin", "admin"]}><Registros /></Privado>} />
      <Route path="/flota" element={<Privado roles={["superadmin", "admin", "responsable_seguridad", "analista", "operador"]}><Flota /></Privado>} />
      <Route path="/actividad" element={<Privado roles={["responsable_seguridad", "analista", "operador"]}><Actividad /></Privado>} />
      <Route path="/politicas" element={<Privado roles={["responsable_seguridad", "analista"]}><Politicas /></Privado>} />
      <Route path="/avisos" element={<Privado roles={["responsable_seguridad", "analista", "operador", "user"]}><Avisos /></Privado>} />
      <Route path="/notificaciones" element={<Privado roles={["superadmin", "admin", "responsable_seguridad", "analista", "operador"]}><Notificaciones /></Privado>} />
      <Route path="/usuarios" element={<Privado roles={["superadmin", "admin", "responsable_seguridad"]}><Cuentas /></Privado>} />
      <Route path="/grupos" element={<Privado roles={["responsable_seguridad"]}><Grupos /></Privado>} />
      <Route path="/cuentas" element={<Navigate to="/usuarios" replace />} />
      <Route path="/ajustes" element={<Privado roles={["responsable_seguridad"]}><Ajustes /></Privado>} />
      <Route path="/actualizaciones" element={<Privado roles={["responsable_seguridad"]}><Actualizaciones /></Privado>} />
      <Route path="/agentes" element={<Navigate to="/politicas" replace />} />
      <Route path="/base-ia" element={<Privado roles={["responsable_seguridad"]}><BaseIa /></Privado>} />
      <Route path="*" element={<Puerta />} />
    </Routes>
  );
}
