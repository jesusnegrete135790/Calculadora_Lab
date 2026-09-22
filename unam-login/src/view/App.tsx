import { Navigate, Route, Routes } from 'react-router-dom';
import { useSessionController } from '../controller/useSessionController';
import AccessPage from './pages/AccessPage';
import DashboardPage from './pages/DashboardPage';
import LaboratoryPage from './pages/LaboratoryPage';
import HistoryPage from './pages/HistoryPage';
import AssistantPage from './pages/AssistantPage';
import EvaluationPage from './pages/EvaluationPage';
import Shell from './components/Shell';

export default function App() {
  const auth = useSessionController();
  if (!auth.session) return <AccessPage enterDemo={auth.enterDemo} signIn={auth.signIn} loading={auth.loading} error={auth.error} />;
  return (
    <Shell session={auth.session} signOut={auth.signOut}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/laboratorio/:module" element={<LaboratoryPage />} />
        <Route path="/historial" element={<HistoryPage />} />
        <Route path="/asistente" element={<AssistantPage token={auth.session.token} />} />
        <Route path="/evaluaciones" element={<EvaluationPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
