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
  it('registra los datos de la cuenta en la API sin enviar roles ni un token anterior', async () => {
    await configuredLogin();
    const { register } = await import('./api');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      token: 'nuevo-token', usuario: { id: 3, nombre: 'Nueva', correo: 'new@example.com', rol: 'Usuario', activo: true },
    }), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(register('Nueva', 'new@example.com', 'Contraseña123!')).resolves.toMatchObject({ id: 3, token: 'nuevo-token', mode: 'api', role: 'Usuario' });
    expect(fetchMock).toHaveBeenCalledWith('https://backend.example/auth/register', expect.objectContaining({
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Nueva', correo: 'new@example.com', contrasena: 'Contraseña123!' }),
    }));
  });
  it('ignora sesiones antiguas de demostración y tokens vacíos', async () => {
    const { readSession } = await import('./api');
    for (const value of [{ mode: 'demo', name: 'Estudiante' }, { mode: 'api', name: 'Estudiante', token: '' }, { mode: 'api', name: 'Estudiante', token: '   ' }]) {
      vi.stubGlobal('sessionStorage', { getItem: () => JSON.stringify(value) });
      expect(readSession()).toBeNull();
    }
  });
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
      token: 'token-de-prueba', usuario: { id: 1, nombre: 'Estudiante', correo: 'alumno@example.com', rol: 'Usuario', activo: true },
    })));
    vi.stubGlobal('fetch', fetchMock);
    await expect(login('alumno@example.com', ' clave con espacios ')).resolves.toEqual({
      name: 'Estudiante', email: 'alumno@example.com', id: 1, role: 'Usuario', roleVerified: true, token: 'token-de-prueba', mode: 'api',
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

describe('permisos y gestión de usuarios', () => {
  it('conserva el rol Administrador enviado por el backend', async () => {
    const login = await configuredLogin();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ token: 'admin-token', usuario: { id: 2, nombre: 'Admin', correo: 'admin@example.com', rol: 'Administrador', activo: true } }))));
    const session = await login('admin@example.com', 'contraseña');
    const { isAdministrator } = await import('./api');
    expect(isAdministrator(session)).toBe(true);
    expect(isAdministrator({ ...session, role: 'Usuario' })).toBe(false);
    expect(isAdministrator({ ...session, roleVerified: false })).toBe(false);
    expect(isAdministrator({ ...session, token: '' })).toBe(false);
    expect(isAdministrator(null)).toBe(false);
  });

  it('requiere verificar el rol al restaurar una sesión almacenada', async () => {
    const { readSession, isAdministrator, sessionWithUser } = await import('./api');
    vi.stubGlobal('sessionStorage', { getItem: () => JSON.stringify({ mode: 'api', name: 'Admin', token: 'token', role: 'Administrador', roleVerified: true }) });
    const session = readSession();
    expect(isAdministrator(session)).toBe(false);
    const verified = sessionWithUser(session!, { id: 1, nombre: 'Actualizado', correo: 'a@example.com', rol: 'Usuario', activo: true });
    expect(verified.name).toBe('Actualizado');
    expect(isAdministrator(verified)).toBe(false);
  });

  it('envía filtros y cambios al backend con el token del administrador', async () => {
    await configuredLogin();
    const { listUsers, listUserRoles, createUser, updateUser, deleteUser } = await import('./api');
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response('{}')));
    vi.stubGlobal('fetch', fetchMock);
    await listUsers('admin-token', { offset: 50, q: 'Ana & José', rol: 'Administrador', activo: 'false' });
    expect(fetchMock.mock.calls[0][0]).toBe('https://backend.example/usuarios?offset=50&limit=50&q=Ana+%26+Jos%C3%A9&rol=Administrador&activo=false');
    await listUserRoles('admin-token');
    expect(fetchMock.mock.calls[1][0]).toBe('https://backend.example/usuarios/roles');
    const account = { nombre: 'Ana', correo: 'ana@example.com', contrasena: 'Contraseña123!', rol: 'Usuario' as const, activo: true };
    await createUser(account, 'admin-token');
    await updateUser(2, { rol: 'Administrador', activo: false }, 'admin-token');
    expect(fetchMock.mock.calls[3]).toEqual(['https://backend.example/usuarios/2', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ rol: 'Administrador', activo: false }), headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }) })]);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(deleteUser(2, 'admin-token')).resolves.toBeUndefined();
  });
});
