/**
 * Cuentas de prueba del `npm run dev`.
 * Vite borra este arreglo en `npm run build` porque `import.meta.env.DEV` queda en false.
 * No despliegues el servidor de desarrollo. Ver gobernanza/README.md.
 */
export type CuentaLocal = {
  etiqueta: string;
  correo: string;
  clave: string;
};

const claveLocal = "gobernanza-local";

export function cuentasLocales(ambito: "cliente" | "plataforma"): CuentaLocal[] {
  if (!import.meta.env.DEV) return [];
  if (ambito === "plataforma") {
    return [
      { etiqueta: "Superadmin", correo: "admin@gobernanza.local", clave: claveLocal },
      { etiqueta: "Admin", correo: "admin.plataforma@gobernanza.local", clave: claveLocal },
    ];
  }
  return [
    { etiqueta: "Responsable", correo: "responsable@laboratorio.local", clave: claveLocal },
    { etiqueta: "Analista", correo: "analista@laboratorio.local", clave: claveLocal },
    { etiqueta: "Operador", correo: "operador@laboratorio.local", clave: claveLocal },
    { etiqueta: "Usuario", correo: "user@laboratorio.local", clave: claveLocal },
  ];
}

export function cuentaLocalInicial(ambito: "cliente" | "plataforma"): { correo: string; clave: string } {
  const primera = cuentasLocales(ambito)[0];
  return primera ? { correo: primera.correo, clave: primera.clave } : { correo: "", clave: "" };
}
