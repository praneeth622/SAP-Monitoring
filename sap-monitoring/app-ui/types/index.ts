export type ChartType = 'line' | 'bar';

export interface DataPoint {
  date: string;
  category: string;
  value: number;
}

export interface ChartData {
  title: string;
  type: ChartType;
  data: DataPoint[];
}

export interface Template {
  id: string;
  name: string;
  description?: string; 
  system: string;
  timeRange: string;
  resolution: string;
  graphs: Graph[];
}

export interface Graph {
  id: string;
  name: string;
  type: 'line' | 'bar';
  monitoringArea: string;
  kpiGroup: string;
  primaryKpi: string;
  correlationKpis: string[];
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}