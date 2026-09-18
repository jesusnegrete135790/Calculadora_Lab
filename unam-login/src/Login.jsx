import { useState } from "react";
import "./Login.css";

const CUENTA_REGEX = /^\d{9}$/; // número de cuenta UNAM: 9 dígitos

/**
 * Coloca el archivo oficial del escudo en `public/escudo-unam.svg`.
 * Si el archivo no existe, se muestra la marca geométrica de respaldo.
 */
const ESCUDO_URL = "/public/Copia-de-Logo-UNAM.-Blanco_Fondo-transparente (1).png";

function Escudo() {
  const [falloImagen, setFalloImagen] = useState(false);

  if (falloImagen) {
    return (
      <svg className="escudo__respaldo" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <circle cx="60" cy="60" r="44" fill="none" stroke="currentColor" strokeWidth="5" />
        <path d="M60 24v72M24 60h72" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
      </svg>
    );
  }

  return (
    <img
      className="escudo__imagen"
      src={ESCUDO_URL}
      alt="Escudo de la Universidad Nacional Autónoma de México"
      onError={() => setFalloImagen(true)}
    />
  );
}

export default function Login({ onSubmit }) {
  const [cuenta, setCuenta] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);

  function validar() {
    const e = {};
    if (!cuenta.trim()) e.cuenta = "Escribe tu número de cuenta.";
    else if (!CUENTA_REGEX.test(cuenta.trim())) e.cuenta = "El número de cuenta tiene 9 dígitos.";

    if (!password) e.password = "Escribe tu contraseña.";
    else if (password.length < 8) e.password = "La contraseña tiene al menos 8 caracteres.";

    return e;
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    const e = validar();
    setErrores(e);
    if (Object.keys(e).length > 0) return;

    setEnviando(true);
    try {
      await onSubmit?.({ cuenta: cuenta.trim(), password });
    } catch (error) {
      setErrores({
        general: error?.message ?? "No pudimos verificar tus datos. Inténtalo de nuevo."
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="acceso">
      <aside className="mural">
        <div className="mural__mosaico" aria-hidden="true" />
        <div className="mural__contenido">
          <div className="escudo">
            <Escudo />
          </div>
          <p className="mural__lema">Universidad Nacional Autónoma de México</p>
          <p className="mural__institucion">Bienvenido </p>
          <p className="mural__institucion">Tu plataforma para resolver y comprender problemas matemáticos.</p>
          <p className="mural__institucion">Lógica Matemática · Matemáticas Financieras · Matemáticas Computacionales · Probabilidad</p>

          
      

        </div>
      </aside>
      

      <main className="tablero">
        <form className="forma" onSubmit={manejarEnvio} noValidate>
          <header className="forma__encabezado">
            <h1>Entra a tu cuenta</h1>
            <p>Usa tu número de cuenta y la contraseña de tus servicios escolares.</p>
          </header>

          {errores.general && (
            <p className="alerta" role="alert">
              {errores.general}
            </p>
          )}

          <div className="campo">
            <label htmlFor="cuenta">Número de cuenta</label>
            <input
              id="cuenta"
              name="cuenta"
              type="text"
              inputMode="numeric"
              autoComplete="username"
              placeholder="123456789"
              maxLength={9}
              value={cuenta}
              onChange={(e) => setCuenta(e.target.value.replace(/\D/g, ""))}
              aria-invalid={Boolean(errores.cuenta)}
              aria-describedby={errores.cuenta ? "error-cuenta" : undefined}
            />
            {errores.cuenta && (
              <span className="campo__error" id="error-cuenta">
                {errores.cuenta}
              </span>
            )}
          </div>

          <div className="campo">
            <label htmlFor="password">Contraseña</label>
            <div className="campo__password">
              <input
                id="password"
                name="password"
                type={verPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={Boolean(errores.password)}
                aria-describedby={errores.password ? "error-password" : undefined}
              />
              <button
                type="button"
                className="campo__ver"
                onClick={() => setVerPassword((v) => !v)}
                aria-pressed={verPassword}
              >
                {verPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            {errores.password && (
              <span className="campo__error" id="error-password">
                {errores.password}
              </span>
            )}
          </div>

          <button className="entrar" type="submit" disabled={enviando}>
            {enviando ? "Verificando…" : "Entrar"}
          </button>

          <div className="forma__pie">
            <a href="#recuperar">Olvidé mi contraseña</a>
            <a href="#ayuda">Necesito ayuda</a>
          </div>
        </form>
      </main>
    </div>
  );
}
