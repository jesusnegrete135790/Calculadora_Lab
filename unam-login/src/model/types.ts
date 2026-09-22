export type ModuleId = 'logica' | 'finanzas' | 'computacionales' | 'estadistica';

export interface Step {
  title: string;
  detail: string;
}

export interface TableData {
  columns: string[];
  rows: Array<Array<string | number>>;
}

export interface CalculationResult {
  title: string;
  value: string;
  subtitle?: string;
  steps: Step[];
  table?: TableData;
  chart?: { labels: string[]; values: number[]; label: string; shadeThroughIndex?: number };
  logicMap?: { rowLabels: string[]; columnLabels: string[]; cells: Array<{ value: number; minterm: number; groups: number[] }> };
  circuitTerms?: string[][];
  note?: string;
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
