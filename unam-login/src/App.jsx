import { useState } from "react";
import Login from "./Login.jsx";

export default function App() {
  const [sesion, setSesion] = useState(null);

  // Reemplaza esta función por la llamada real a tu API.
  async function autenticar({ cuenta, password }) {
    await new Promise((r) => setTimeout(r, 800));
    if (password !== "unam1234") {
      throw new Error("Número de cuenta o contraseña incorrectos.");
    }
    setSesion({ cuenta });
  }

  if (sesion) {
    return (
      <main style={{ padding: "3rem", fontFamily: "system-ui, sans-serif" }}>
        <h1 style={{ color: "#003057" }}>Hola, {sesion.cuenta}</h1>
        <p>Aquí va el contenido de tu aplicación.</p>
        <button onClick={() => setSesion(null)}>Cerrar sesión</button>
      </main>
    );
  }

  return <Login onSubmit={autenticar} />;
}
