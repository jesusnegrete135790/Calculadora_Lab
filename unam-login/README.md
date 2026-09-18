# Login UNAM

Login en React con la paleta institucional de la UNAM
(azul Pantone 540 C `#003057`, oro Pantone 124 C `#EAAA00`).

## Correr el proyecto

```bash
npm install
npm run dev
```

Abre http://localhost:5173

## El escudo

Guarda el archivo oficial del escudo en `public/escudo-unam.svg`.
Si el archivo no está, el componente muestra una marca geométrica de respaldo
y la aplicación sigue funcionando. Para usar otro nombre o formato, cambia
la constante `ESCUDO_URL` al inicio de `src/Login.jsx`.

El uso del escudo se rige por el Reglamento del Escudo y el Lema de la UNAM,
así que conviene confirmar con tu facultad antes de publicar el proyecto.

## Probar el formulario

El ejemplo en `src/App.jsx` simula la autenticación:

- Número de cuenta: cualquier valor de 9 dígitos (ej. `123456789`)
- Contraseña: `unam1234`

Sustituye la función `autenticar` por la llamada a tu API real. Debe lanzar
un `Error` con el mensaje que quieras mostrar cuando fallen las credenciales.

## Archivos

- `src/Login.jsx` — el componente, recibe la prop `onSubmit({ cuenta, password })`
- `src/Login.css` — estilos; los colores están en variables al inicio del archivo
- `src/App.jsx` — ejemplo de uso
