import { useState, type FormEvent } from 'react';
import { ArrowRight, BookOpenCheck, FlaskConical, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { hasApi } from '../../model/api';
import InstitutionalWatermark from '../components/InstitutionalWatermark';
import Footer from '../components/Footer';

interface Props {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  clearError: () => void;
  loading: boolean;
  error: string;
}

export default function AccessPage({ signIn, signUp, clearError, loading, error }: Props) {
  const [registering, setRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validation, setValidation] = useState('');
  function changeMode() {
    setRegistering(!registering); setPassword(''); setValidation(''); clearError();
  }
  function submit(event: FormEvent) {
    event.preventDefault(); setValidation(''); clearError();
    if (registering && !name.trim()) { setValidation('Escribe tu nombre completo.'); return; }
    if (registering) void signUp(name.trim(), email.trim(), password);
    else void signIn(email.trim(), password);
  }
  return <div className="access-page">
    <section className="access-hero">
      <div className="access-brand"><img className="access-crest" src="/labmat-icon.svg" alt="Icono del Laboratorio Matemático"/><span>LAB<span>MAT</span></span></div>
      <div className="access-hero-content"><span className="eyebrow light">LABORATORIO DE APRENDIZAJE</span><h1>Las matemáticas se entienden <em>resolviendo.</em></h1><p>Explora conceptos, calcula paso a paso y transforma cada ejercicio en aprendizaje.</p><div className="access-highlights"><span><BookOpenCheck size={19}/> Cuatro áreas de estudio</span><span><FlaskConical size={19}/> Procedimientos claros</span></div></div>
      <InstitutionalWatermark variant="access"/><div className="access-pattern" aria-hidden="true">∑<span>ƒ(x)</span></div>
    </section>
    <section className="access-form-area"><div className="access-card">
      <div className="access-card-icon"><img src="/labmat-icon.svg" alt=""/></div>
      <span className="eyebrow">{registering ? 'CREA TU CUENTA' : 'BIENVENIDO'}</span>
      <h2>{registering ? 'Regístrate en LABMAT' : 'Comienza a explorar'}</h2>
      <p className="muted">{registering ? 'Guarda tus ejercicios y consulta tu progreso con tu propia cuenta.' : 'Accede al laboratorio y trabaja con herramientas interactivas.'}</p>
      <form onSubmit={submit} className="access-form">
        {registering && <label>Nombre completo<div className="input-icon"><UserRound size={19}/><input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre completo" autoComplete="name" maxLength={100} required/></div></label>}
        <label>Correo electrónico<div className="input-icon"><Mail size={19}/><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@correo.com" autoComplete={registering ? 'email' : 'username'} maxLength={100} required/></div></label>
        <label>Contraseña<div className="input-icon"><LockKeyhole size={19}/><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={registering ? 'Mínimo 10 caracteres' : 'Tu contraseña'} autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 10 : 1} maxLength={128} required/></div></label>
        {(validation || error) && <p className="error-message" role="alert">{validation || error}</p>}
        {!hasApi && <p className="error-message" role="alert">El acceso no está disponible: falta configurar la conexión con el servidor.</p>}
        <button className="button button-primary full" disabled={loading || !hasApi}>{loading ? (registering ? 'Creando cuenta…' : 'Ingresando…') : (registering ? 'Crear cuenta' : 'Iniciar sesión')}<ArrowRight size={18}/></button>
      </form>
      <p className="access-disclaimer">{registering ? '¿Ya tienes una cuenta?' : '¿Aún no tienes una cuenta?'}</p>
      <button type="button" className="button button-secondary full access-mode-switch" onClick={changeMode} disabled={loading}>{registering ? 'Volver a iniciar sesión' : 'Registrar nuevo usuario'}</button>
    </div></section><Footer/>
  </div>;
}
