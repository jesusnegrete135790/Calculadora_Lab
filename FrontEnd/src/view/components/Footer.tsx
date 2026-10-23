import { Link } from 'react-router-dom';

export default function Footer() {
  return <footer className="site-footer no-print">
    <span>© {new Date().getFullYear()} Equipo 1 · Laboratorio Matemático</span>
    <Link to="/derechos">Derechos de autor</Link>
  </footer>;
}
