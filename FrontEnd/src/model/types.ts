export type ModuleId = 'logica' | 'finanzas' | 'computacionales' | 'estadistica';

export interface Step {
  title: string;
  detail: string;
}

export interface TableData {
  columns: string[];
  rows: Array<Array<string | number>>;
}

export interface ChartData {
  labels: string[];
  values: number[];
  label: string;
  kind?: 'line' | 'bar';
  shadeThroughIndex?: number;
}

export interface SurfaceData {
  x: number[];
  y: number[];
  z: number[][];
  label: string;
}

export interface CalculationResult {
  title: string;
  value: string;
  subtitle?: string;
  steps: Step[];
  table?: TableData;
  chart?: ChartData;
  charts?: ChartData[];
  surface3d?: SurfaceData;
  logicMap?: { rowLabels: string[]; columnLabels: string[]; cells: Array<{ value: number; minterm: number; groups: number[] }> };
  circuitTerms?: string[][];
  note?: string;
  polynomial?: string;
  numericRows?: Array<{ numero: number; x?: number | string; y?: number | string; aproximado?: number | string; error?: number | string; k1?: number | string; k2?: number | string; k3?: number | string; k4?: number | string }>;
  metrics?: { media: number | string; desviacion: number | string; asimetria: number | string; curtosis: number | string };
}

export interface HistoryRecord {
  id: string;
  module: ModuleId;
  method: string;
  input: string;
  result: CalculationResult;
  createdAt: string;
}

export interface UserSession {
  name: string;
  email?: string;
  mode: 'demo' | 'api';
  token?: string;
}

export type EvaluationModule = 'logica' | 'finanzas' | 'computacionales' | 'estadistica';

export interface EvaluationSummary {
  id: number;
  module: EvaluationModule;
  title: string;
  questionCount: number;
}

export interface EvaluationQuestion {
  id: number;
  order: number;
  prompt: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
}

export interface EvaluationDetail extends EvaluationSummary {
  questions: EvaluationQuestion[];
}

export interface EvaluationAnswer {
  questionId: number;
  option: 'A' | 'B' | 'C' | 'D';
}

export interface EvaluationAnswerResult {
  questionId: number;
  prompt: string;
  selected: 'A' | 'B' | 'C' | 'D';
  correctOption: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  explanation: string;
}

export interface EvaluationAttempt {
  id: number;
  examId: number;
  module: EvaluationModule;
  title: string;
  correct: number;
  total: number;
  score: number | string;
  createdAt: string;
  answers: EvaluationAnswerResult[];
}

