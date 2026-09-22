import type { UserSession } from './types';

const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') as string | undefined;

export const hasApi = Boolean(baseUrl);

export async function login(email: string, password: string): Promise<UserSession> {
  if (!baseUrl) throw new Error('No hay un servidor de autenticación configurado. Usa el modo de demostración.');
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo: email, contrasena: password }),
  });
  if (!response.ok) throw new Error(response.status === 401 ? 'Correo o contraseña incorrectos.' : 'No se pudo iniciar sesión.');
  const data: unknown = await response.json();
  if (!data || typeof data !== 'object') throw new Error('La respuesta del servidor no es válida.');
  const payload = data as { token?: unknown; usuario?: { nombre?: unknown; correo?: unknown } };
  if (typeof payload.token !== 'string' || !payload.usuario || typeof payload.usuario.nombre !== 'string') {
    throw new Error('El servidor no devolvió la sesión esperada.');
  }
  return {
    name: payload.usuario.nombre,
    email: typeof payload.usuario.correo === 'string' ? payload.usuario.correo : email,
    token: payload.token,
    mode: 'api',
  };
}

export async function askAssistant(question: string, module: string, token?: string): Promise<string> {
  if (!baseUrl) throw new Error('El asistente requiere un backend de IA. Configura VITE_API_BASE_URL para conectarlo.');
  const response = await fetch(`${baseUrl}/asistente/preguntas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ pregunta: question, moduloRelacionado: module }),
  });
  if (!response.ok) throw new Error('No se pudo obtener una respuesta del asistente.');
  const data: unknown = await response.json();
  const answer = (data as { respuesta?: unknown })?.respuesta;
  if (typeof answer !== 'string') throw new Error('La respuesta del asistente no tiene el formato esperado.');
  return answer;
}
