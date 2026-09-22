import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BookOpen, BrainCircuit, Calculator, ChartNoAxesCombined, ChevronLeft, Clock3, FlaskConical, GraduationCap, LayoutDashboard, LogOut, Menu, MessageCircle, Sigma, X } from 'lucide-react';
import type { UserSession } from '../../model/types';

const mainLinks = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/laboratorio/logica', label: 'Lógica matemática', icon: BrainCircuit },
  { to: '/laboratorio/finanzas', label: 'Matemáticas financieras', icon: Calculator },
  { to: '/laboratorio/computacionales', label: 'Mat. computacionales', icon: Sigma },
  { to: '/laboratorio/estadistica', label: 'Probabilidad y estadística', icon: ChartNoAxesCombined },
];
const extraLinks = [
  { to: '/historial', label: 'Historial local', icon: Clock3 },
  { to: '/asistente', label: 'Asistente de dudas', icon: MessageCircle },
  { to: '/evaluaciones', label: 'Evaluaciones', icon: GraduationCap },
];

export default function Shell({ session, signOut, children }: { session: UserSession; signOut: () => void; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const renderLink = ({ to, label, icon: Icon, end }: { to: string; label: string; icon: typeof LayoutDashboard; end?: boolean }) => <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}><Icon size={19} strokeWidth={1.9} aria-hidden="true"/><span>{label}</span></NavLink>;
  return <div className="app-shell">
    <aside className={`sidebar${mobileOpen ? ' open' : ''}`} aria-label="Navegación principal">
      <div className="brand"><span className="brand-mark"><FlaskConical size={24} /></span><span><strong>LAB<span>MAT</span></strong><small>Laboratorio matemático</small></span><button className="mobile-close icon-button" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)}><X size={21}/></button></div>
      <div className="sidebar-scroll"><div className="nav-group-label">PLATAFORMA</div><nav>{mainLinks.map(renderLink)}</nav><div className="nav-group-label tools-label">HERRAMIENTAS</div><nav>{extraLinks.map(renderLink)}</nav></div>
      <div className="sidebar-footer"><div className="demo-indicator"><span className="status-dot"/>{session.mode === 'demo' ? 'Modo demostración' : 'Conectado al servidor'}</div><button className="signout" onClick={signOut}><LogOut size={18}/> Cerrar sesión</button></div>
    </aside>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
    <div className="main-area"><header className="topbar"><button className="menu-button icon-button" aria-label="Abrir menú" onClick={() => setMobileOpen(true)}><Menu size={23}/></button><div className="breadcrumbs"><BookOpen size={17}/><span>Laboratorio</span>{location.pathname !== '/' && <><ChevronLeft className="breadcrumb-chevron" size={15}/><span className="breadcrumb-current">{[...mainLinks, ...extraLinks].find((link) => link.to === location.pathname)?.label ?? 'Módulo'}</span></>}</div><div className="topbar-user"><div className="avatar">{session.name.charAt(0).toUpperCase()}</div><span>{session.name}</span></div></header><main className="page-content">{children}</main></div>
  </div>;
}
