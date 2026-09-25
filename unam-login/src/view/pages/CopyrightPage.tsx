import { Link } from 'react-router-dom';
import { ArrowLeft, Copyright, ShieldCheck } from 'lucide-react';

export default function CopyrightPage() {
  return <div className="content-container copyright-page">
    <Link className="back-link" to="/"><ArrowLeft size={17}/> Volver al laboratorio</Link>
    <div className="page-heading"><div><span className="eyebrow">INFORMACIÓN DEL PROYECTO</span><h1>Derechos de autor</h1><p>Créditos y uso de los recursos de esta plataforma académica.</p></div></div>
    <section className="copyright-card"><img src="/unam-escudo-oscuro.png" alt="Escudo de la Universidad Nacional Autónoma de México"/><div><Copyright size={24}/><h2>Laboratorio Matemático</h2><p>© {new Date().getFullYear()} Equipo 1. Proyecto académico desarrollado como material de apoyo para asignaturas de matemáticas de la licenciatura en Informática.</p><p>El nombre, escudo y logotipos de la Universidad Nacional Autónoma de México pertenecen a la UNAM. Su inclusión en este prototipo no implica que el sistema sea un portal institucional oficial.</p><div className="inline-note"><ShieldCheck size={18}/> Antes de publicar o distribuir el proyecto, el equipo debe verificar el permiso de uso de la identidad institucional y definir la licencia del código y de los contenidos.</div></div></section>
  </div>;
}
