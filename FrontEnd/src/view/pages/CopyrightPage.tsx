import { Link } from 'react-router-dom';
import { ArrowLeft, Code2, Copyright, Users } from 'lucide-react';

const frontendMembers = [
  'Aparicio Olguin Braulio Israel',
  'Velazquez Zuñiga Juan',
  'Martinez Landa José Eduardo',
  'Negrete Calixtro Jesús',
  'Pineda San Román Cesar',
  'Mendoza Juarez Ricardo',
];

const backendDocumentationMembers = [
  'Estadra Rodríguez Alan Yosef',
  'Miranda Ramirez Victor Daniel',
  'Jesus Santiago Arias',
  'Soberanes Ruiz Gerardo Gabriel',
  'Malagón Cordoba Cristian',
];

const languages = [
  { name: 'TypeScript', use: 'Interfaz y algoritmos matemáticos' },
  { name: 'JavaScript', use: 'Ejecución en el navegador' },
  { name: 'HTML', use: 'Estructura de las páginas' },
  { name: 'CSS', use: 'Diseño y presentación' },
  { name: 'Python', use: 'API y persistencia con FastAPI' },
  { name: 'SQL', use: 'Esquema de base de datos SQL Server' },
];

function TeamCard({ title, members }: { title: string; members: string[] }) {
  return <article className="credits-team">
    <h3>{title}</h3>
    <ul>{members.map((member) => <li key={member}>{member}</li>)}</ul>
  </article>;
}

export default function CopyrightPage() {
  return <div className="content-container copyright-page">
    <Link className="back-link" to="/"><ArrowLeft size={17}/> Volver al laboratorio</Link>
    <div className="page-heading"><div><span className="eyebrow">INFORMACIÓN DEL PROYECTO</span><h1>Derechos de autor</h1><p>Créditos y uso de los recursos de esta plataforma académica.</p></div></div>

    <section style={{
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '24px',
  width: '100%',
  boxSizing: 'border-box',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
}}>
  {/* Imagen superior (Escudo UNAM) */}
  <div>
    <img 
      src="/unam-escudo-oscuro.png" 
      alt="Escudo de la Universidad Nacional Autónoma de México"
      style={{ maxWidth: '120px', height: 'auto' }}
    />
  </div>

  {/* Contenedor de texto */}
  <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      <Copyright size={24}/>
      <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f2b4a' }}>Laboratorio Matemático</h2>
    </div>
    
    <div>
      <p style={{ marginBottom: '12px', lineHeight: '1.6', color: '#4a5568' }}>
        © {new Date().getFullYear()} Equipo 1. Proyecto académico desarrollado como material de apoyo para asignaturas de matemáticas de la licenciatura en Informática.
      </p>
      <p style={{ marginBottom: '12px', lineHeight: '1.6', color: '#4a5568' }}>
        El nombre, escudo y logotipos de la Universidad Nacional Autónoma de México pertenecen a la UNAM. Su inclusión en este prototipo no implica que el sistema sea un portal institucional oficial.
      </p>
      <p style={{ margin: 0, lineHeight: '1.6', color: '#4a5568' }}>
        Tipografía: Varela Round, © 2023 The Varela Round Project Authors. <a href="/varela-round-OFL.txt" target="_blank" rel="noopener noreferrer" style={{ color: '#0056b3' }}>Licencia SIL Open Font License 1.1</a>.
      </p>
    </div>
  </div>

  {/* Imagen inferior (Logo Equipo) */}
  <div>
    <img 
      src="/logo-equipo.jpeg" 
      alt="Logo del equipo"
      style={{ maxWidth: '120px', height: 'auto' }}
    />
  </div>
</section>

    <section className="credits-section" aria-labelledby="credits-title">
      <div className="credits-title"><Users size={20}/><h2 id="credits-title">Integrantes y roles</h2></div>
      <div className="credits-grid">
        <TeamCard title="Frontend" members={frontendMembers}/>
        <TeamCard title="Backend y documentación" members={backendDocumentationMembers}/>
      </div>
    </section>

    <section className="credits-section" aria-labelledby="languages-title">
      <div className="credits-title"><Code2 size={20}/><h2 id="languages-title">Lenguajes del proyecto</h2></div>
      <div className="language-list">
        {languages.map((language) => <div className="language-item" key={language.name}><strong>{language.name}</strong><span>{language.use}</span></div>)}
      </div>
    </section>
  </div>;
}
