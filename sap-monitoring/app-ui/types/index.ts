import { DateRange } from "react-day-picker";

export type ChartType = 'line' | 'bar';
export type ThemeKey = 'default' | 'ocean' | 'forest' | 'sunset';

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
  isDefault?: boolean;
  isFavorite?: boolean;
}

export interface Graph {
  id: string;
  name: string;
  type: 'line' | 'bar';
  monitoringArea: string;
  kpiGroup: string;
  primaryKpi: string;
  correlationKpis: string[];
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  activeKPIs?: Set<string> | string[];
  kpiColors?: Record<string, { color: string; name: string; icon?: any }>;
  frequency?: string;
  systems?: { system_id: string }[];
}

export interface ChartConfig {
  id: string;
  data: DataPoint[];
  type: ChartType;
  title: string;
  width: number;
  height: number;
  activeKPIs?: Set<string> | string[];
  kpiColors?: Record<string, { color: string; name: string; icon?: any }>;
  layout?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export type TemplateKey = 'default' | 'single' | 'dual' | 'triple' | 'quad' | 'five' | 'six' | 'seven' | 'eight';

export interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  charts: number[];
}

export interface DynamicLayoutProps {
  charts: ChartConfig[];
  activeKPIs?: Set<string> | string[];
  kpiColors?: Record<string, { color: string; name: string; icon?: any }>;
  globalDateRange?: DateRange | undefined;
  theme?: {
    name: string;
    colors: string[];
  };
  onLayoutChange?: (layout: any) => void;
}

export interface ChartTheme {
  name: string;
  colors: string[];
}

export interface ChartThemes {
  [key: string]: ChartTheme;
}