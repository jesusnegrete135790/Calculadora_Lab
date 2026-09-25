import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BrainCircuit, Calculator, ChartNoAxesCombined, Sigma } from 'lucide-react';
import LogicView from '../modules/LogicView';
import FinanceView from '../modules/FinanceView';
import NumericView from '../modules/NumericView';
import StatisticsView from '../modules/StatisticsView';

const configs = {
  logica: { eyebrow: 'MÓDULO 01', title: 'Lógica matemática', description: 'Construye tablas de verdad y simplifica expresiones booleanas.', icon: BrainCircuit, className: 'indigo', view: LogicView },
  finanzas: { eyebrow: 'MÓDULO 02', title: 'Matemáticas financieras', description: 'Compara intereses, calcula descuentos y crea tablas de amortización.', icon: Calculator, className: 'amber', view: FinanceView },
  computacionales: { eyebrow: 'MÓDULO 03', title: 'Matemáticas computacionales', description: 'Aproxima raíces, interpola puntos y resuelve ecuaciones diferenciales.', icon: Sigma, className: 'teal', view: NumericView },
  estadistica: { eyebrow: 'MÓDULO 04', title: 'Probabilidad y estadística', description: 'Explora datos y distribuciones con resultados explicados.', icon: ChartNoAxesCombined, className: 'rose', view: StatisticsView },
};

export default function LaboratoryPage() {
  const { module } = useParams();
  const config = configs[module as keyof typeof configs];
  if (!config) return <div className="content-container"><h1>Módulo no encontrado</h1><Link to="/">Volver al inicio</Link></div>;
  const Icon = config.icon, View = config.view;
  return <div className="content-container"><Link className="back-link" to="/"><ArrowLeft size={17}/> Todos los módulos</Link><div className="module-page-heading"><div className={`module-page-icon ${config.className}`}><Icon size={31}/></div><div><span className="eyebrow">{config.eyebrow}</span><h1>{config.title}</h1><p>{config.description}</p></div></div><View/></div>;
}
