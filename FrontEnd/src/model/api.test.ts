import { afterEach, describe, expect, it, vi } from 'vitest';

async function configuredLogin() {
  vi.stubEnv('VITE_API_URL', 'https://backend.example/');
  vi.resetModules();
  return (await import('./api')).login;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('inicio de sesión', () => {
  it('no solicita ni concede acceso sin un backend configurado', async () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('VITE_API_BASE_URL', '');
    vi.resetModules();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { login } = await import('./api');
    await expect(login('alumno@example.com', 'clave')).rejects.toThrow('Configura VITE_API_URL');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envía el contrato acordado y crea una sesión con una respuesta válida', async () => {
    const login = await configuredLogin();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      token: 'token-de-prueba', usuario: { nombre: 'Estudiante', correo: 'alumno@example.com' },
    })));
    vi.stubGlobal('fetch', fetchMock);
    await expect(login('alumno@example.com', ' clave con espacios ')).resolves.toEqual({
      name: 'Estudiante', email: 'alumno@example.com', token: 'token-de-prueba', mode: 'api',
    });
    expect(fetchMock).toHaveBeenCalledWith('https://backend.example/auth/login', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ correo: 'alumno@example.com', contrasena: ' clave con espacios ' }),
    }));
  });

  it('informa credenciales incorrectas sin crear una sesión', async () => {
    const login = await configuredLogin();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Correo o contraseña incorrectos.' }), { status: 401 })));
    await expect(login('alumno@example.com', 'clave')).rejects.toThrow('Correo o contraseña incorrectos');
  });

  it('presenta un mensaje útil cuando falla la conexión', async () => {
    const login = await configuredLogin();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(login('alumno@example.com', 'clave')).rejects.toThrow('No se pudo conectar con el servidor');
  });

  it.each([
    null,
    { token: '', usuario: { nombre: 'Estudiante', correo: 'alumno@example.com' } },
    { token: '   ', usuario: { nombre: 'Estudiante', correo: 'alumno@example.com' } },
    { token: 'token-de-prueba' },
  ])('rechaza una respuesta de sesión incompleta: %j', async (payload) => {
    const login = await configuredLogin();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))));
    await expect(login('alumno@example.com', 'clave')).rejects.toThrow();
  });
});
