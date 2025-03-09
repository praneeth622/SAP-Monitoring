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