import type { CalculationResult, EvaluationAnswer, EvaluationAttempt, EvaluationDetail, EvaluationSummary, HistoryRecord, ModuleId, UserSession } from './types';
const baseUrl: string | undefined = (import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL)?.replace(/\/$/, '');
export const hasApi = Boolean(baseUrl);
const KEY = 'lab-session-v1';
export function readSession(): UserSession | null {
  try {
    const data: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    if (data && typeof data === 'object' && 'mode' in data && data.mode === 'api' && 'name' in data && typeof data.name === 'string' && 'token' in data && typeof data.token === 'string') return data as UserSession;
    return null;
  } catch { return null; }
}
export function storeSession(session: UserSession | null) {
  if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
  else sessionStorage.removeItem(KEY);
}
export async function request<T>(path: string, options: RequestInit = {}, token = readSession()?.token): Promise<T> {
  if (!baseUrl) throw new Error('Configura VITE_API_URL para conectar el backend.');
  const abort = new AbortController();
  const timeout = globalThis.setTimeout(() => abort.abort(), 45000);
  try {
    const response = await fetch(`${baseUrl}${path}`, { ...options, signal: abort.signal, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
    if (response.status === 401 && token && token === readSession()?.token) { storeSession(null); window.dispatchEvent(new Event('lab-session-expired')); }
    if (!response.ok) {
      const data: unknown = await response.json().catch(() => null);
      const detail = data && typeof data === 'object' && 'detail' in data && typeof data.detail === 'string' ? data.detail : `Error HTTP ${response.status}`;
      const fields = data && typeof data === 'object' && 'errors' in data && Array.isArray(data.errors) ? data.errors.map((error: unknown) => error && typeof error === 'object' && 'field' in error && typeof error.field === 'string' ? error.field : '').filter(Boolean).join(', ') : '';
      throw new Error(fields ? `${detail}: ${fields}` : detail);
    }
    return response.status === 204 ? undefined as T : await response.json() as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('El servidor tardó demasiado en responder.');
    if (error instanceof TypeError) throw new Error('No se pudo conectar con el servidor.');
    throw error;
  } finally { globalThis.clearTimeout(timeout); }
}
interface SessionPayload { token: string; usuario: { id: number; nombre: string; correo: string; rol: string }; }
function sessionFrom(payload: SessionPayload): UserSession {
  if (typeof payload.token !== 'string' || !payload.token.trim() || !payload.usuario || typeof payload.usuario.nombre !== 'string' || typeof payload.usuario.correo !== 'string') throw new Error('El servidor devolvió una sesión inválida.');
  return { name: payload.usuario.nombre, email: payload.usuario.correo, mode: 'api', token: payload.token };
}
export async function login(email: string, password: string): Promise<UserSession> {
  return sessionFrom(await request<SessionPayload>('/auth/login', { method: 'POST', body: JSON.stringify({ correo: email, contrasena: password }) }, ''));
}
export async function register(name: string, email: string, password: string): Promise<UserSession> {
  return sessionFrom(await request<SessionPayload>('/auth/register', { method: 'POST', body: JSON.stringify({ nombre: name, correo: email, contrasena: password }) }, ''));
}
export function me(token: string) { return request<SessionPayload['usuario']>('/auth/me', {}, token); }
export async function askAssistant(question: string, module: string, token?: string): Promise<string> {
  if (!token) throw new Error('Inicia sesión con una cuenta para consultar el asistente.');
  return (await request<{ respuesta: string }>('/asistente/preguntar', { method: 'POST', body: JSON.stringify({ pregunta: question, moduloRelacionado: module }) }, token)).respuesta;
}
export function calculationPath(module: ModuleId, input: unknown): string {
  return module === 'estadistica' && input && typeof input === 'object' && 'method' in input && input.method !== 'descriptiva' ? 'distribuciones' : module;
}
export function saveCalculation(module: ModuleId, method: string, input: unknown, result: CalculationResult, token: string): Promise<HistoryRecord> {
  return request(`/${calculationPath(module, input)}`, { method: 'POST', body: JSON.stringify({ method, input, result }) }, token);
}
export function remoteHistory(offset = 0, limit = 50) { return request<HistoryRecord[]>(`/historial?offset=${offset}&limit=${limit}`); }
export function deleteCalculation(id: string) {
  const [module, recordId] = id.split(':');
  if (!['logica', 'finanzas', 'computacionales', 'estadistica', 'distribuciones'].includes(module) || !/^\d+$/.test(recordId)) throw new Error('ID de cálculo inválido.');
  return request<void>(`/${module}/${recordId}`, { method: 'DELETE' });
}
export interface AssistantRecord { id: number; pregunta: string; respuesta: string; moduloRelacionado: string; fecha: string; }
export function assistantHistory(token: string) { return request<AssistantRecord[]>('/asistente/historial', {}, token); }
export function listEvaluations(token: string) { return request<EvaluationSummary[]>('/evaluaciones', {}, token); }
export function getEvaluation(id: number, token: string) { return request<EvaluationDetail>(`/evaluaciones/${id}`, {}, token); }
export function submitEvaluation(id: number, answers: EvaluationAnswer[], token: string) {
  return request<EvaluationAttempt>(`/evaluaciones/${id}/intentos`, { method: 'POST', body: JSON.stringify({ answers }) }, token);
}
export function evaluationHistory(token: string) { return request<EvaluationAttempt[]>('/evaluaciones/historial', {}, token); }
