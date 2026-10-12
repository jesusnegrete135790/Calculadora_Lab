import { Navigate, Route, Routes } from 'react-router-dom';
import { useSessionController } from '../controller/useSessionController';
import AccessPage from './pages/AccessPage';
import DashboardPage from './pages/DashboardPage';
import LaboratoryPage from './pages/LaboratoryPage';
import HistoryPage from './pages/HistoryPage';
import AssistantPage from './pages/AssistantPage';
import EvaluationPage from './pages/EvaluationPage';
import CopyrightPage from './pages/CopyrightPage';
import UsersPage from './pages/UsersPage';
import { isAdministrator } from '../model/api';
import Shell from './components/Shell';
import { SessionContext } from '../model/sessionContext';

export default function App() {
  const auth = useSessionController();
  if (!auth.session) return <Routes><Route path="/derechos" element={<CopyrightPage/>}/><Route path="*" element={<AccessPage enterDemo={auth.enterDemo} signIn={auth.signIn} signUp={auth.signUp} loading={auth.loading} error={auth.error} />}/></Routes>;
  return (
    <SessionContext.Provider value={auth.session}><Shell session={auth.session} signOut={auth.signOut}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/laboratorio/:module" element={<LaboratoryPage />} />
        <Route path="/historial" element={<HistoryPage />} />
        <Route path="/asistente" element={<AssistantPage token={auth.session.token} />} />
        <Route path="/evaluaciones" element={<EvaluationPage token={auth.session.token} />} />
        <Route path="/usuarios" element={isAdministrator(auth.session) ? <UsersPage session={auth.session} /> : <div className="empty-card"><h1>Acceso restringido</h1><p>El gestor de usuarios requiere una cuenta con rol Administrador verificada por el servidor.</p></div>} />
        <Route path="/derechos" element={<CopyrightPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell></SessionContext.Provider>
  );
}
