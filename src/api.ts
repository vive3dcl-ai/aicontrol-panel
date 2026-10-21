const CLAVE = "gobernanza-token";

export type Ambito = "plataforma" | "tenant";

export class ErrorApi extends Error {
  status: number;

  constructor(mensaje: string, status: number) {
    super(mensaje);
    this.status = status;
  }
}

export function tokenGuardado() {
  return sessionStorage.getItem(CLAVE);
}

export function guardarToken(token: string | null) {
  if (token) sessionStorage.setItem(CLAVE, token);
  else sessionStorage.removeItem(CLAVE);
}

export async function api<T>(ruta: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  const token = tokenGuardado();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const respuesta = await fetch(ruta, { ...init, headers });
  const datos = (await respuesta.json().catch(() => ({}))) as { error?: string };
  if (respuesta.status === 401) {
    guardarToken(null);
    throw new ErrorApi(datos.error ?? "Sesión inválida", 401);
  }
  if (!respuesta.ok) throw new ErrorApi(datos.error ?? "No se pudo completar la operación", respuesta.status);
  return datos as T;
}
