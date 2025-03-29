"use client"

import { motion } from "framer-motion"
import { Activity, TrendingUp, Users, DollarSign } from "lucide-react"
import { Card } from "@/components/ui/card"
import { generateMultipleDataSets } from "@/utils/data"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { DynamicLayout } from "@/components/charts/DynamicLayout"
import { DateRangePicker } from "@/components/date-range-picker"
import { DateRange } from "react-day-picker"
import { useSidebar } from "@/contexts/sidebar-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { ChartConfig, ChartType, DataPoint, TemplateConfig, TemplateKey } from '@/types';

const chartThemes = {
  default: {
    name: 'Default',
    colors: ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981']
  },
  ocean: {
    name: 'Ocean',
    colors: ['#0EA5E9', '#0D9488', '#0284C7', '#0369A1']
  },
  forest: {
    name: 'Forest',
    colors: ['#22C55E', '#15803D', '#84CC16', '#4D7C0F']
  },
  sunset: {
    name: 'Sunset',
    colors: ['#F97316', '#EA580C', '#DC2626', '#9F1239']
  }
};

const kpiColors = {
  revenue: {
    name: 'Revenue',
    color: '#3B82F6',
    icon: DollarSign,
    lightBg: 'bg-blue-50/80',
    darkBg: 'dark:bg-blue-900/30',
    text: 'text-blue-600',
    darkText: 'dark:text-blue-400'
  },
  users: {
    name: 'Users',
    color: '#8B5CF6',
    icon: Users,
    lightBg: 'bg-purple-50/80',
    darkBg: 'dark:bg-purple-900/30',
    text: 'text-purple-600',
    darkText: 'dark:text-purple-400'
  }
};

const chartTitles = [
  'Revenue Analysis',
  'User Growth Metrics',
  'Performance Overview',
  'Conversion Trends',
  'Sales Analytics',
  'User Engagement',
  'Growth Metrics',
  'Revenue Distribution',
  'Market Analysis'
];

const templateData: Record<TemplateKey, TemplateConfig> = {
  default: {
    id: '1',
    name: 'Default View',
    description: 'Complete monitoring dashboard',
    charts: [0, 1, 2, 3, 4, 5, 6, 7, 8]
  },
  single: {
    id: '2',
    name: 'Single Chart',
    description: 'Detailed view of revenue analysis',
    charts: [0]
  },
  dual: {
    id: '3',
    name: 'Two Charts',
    description: 'Revenue and user growth comparison',
    charts: [0, 1]
  },
  triple: {
    id: '4',
    name: 'Three Charts',
    description: 'Key performance indicators',
    charts: [0, 1, 2]
  },
  quad: {
    id: '5',
    name: 'Four Charts',
    description: 'Four key metric dashboard',
    charts: [0, 1, 2, 3]
  },
  five: {
    id: '6',
    name: 'Five Charts',
    description: 'Comprehensive performance view',
    charts: [0, 1, 2, 3, 4]
  },
  six: {
    id: '7',
    name: 'Six Charts',
    description: 'Extended metrics overview',
    charts: [0, 1, 2, 3, 4, 5]
  },
  seven: {
    id: '8',
    name: 'Seven Charts',
    description: 'Detailed metrics dashboard',
    charts: [0, 1, 2, 3, 4, 5, 6]
  },
  eight: {
    id: '9',
    name: 'Eight Charts',
    description: 'Comprehensive analytics',
    charts: [0, 1, 2, 3, 4, 5, 6, 7]
  }
};

const resolutionOptions = [
  { value: 'auto', label: 'Auto' },
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '1d', label: '1 Day' }
];

const generateChartConfigs = (resolution = 'auto') => {
  const datasets = generateMultipleDataSets(9);
  return datasets.map((data, i) => ({
    id: `chart-${i}`,
    data,
    type: i % 2 === 0 ? 'line' : 'bar' as ChartType,
    title: chartTitles[i],
    width: 400,
    height: 400
  }));
};

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeKPIs, setActiveKPIs] = useState<Set<string>>(new Set(['revenue', 'users']));
  const [globalDateRange, setGlobalDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('default');
  const [resolution, setResolution] = useState('auto');
  const [selectedTheme, setSelectedTheme] = useState('default');

  // Apply theme colors to KPI colors
  const [themedKpiColors, setThemedKpiColors] = useState(kpiColors);

  // When theme changes, update KPI colors
  useEffect(() => {
    const theme = chartThemes[selectedTheme as keyof typeof chartThemes];
    if (!theme) return;
    
    // Create a new kpiColors object with theme colors
    const updatedKpiColors = {
      revenue: {
        ...kpiColors.revenue,
        color: theme.colors[0] // Use first theme color for revenue
      },
      users: {
        ...kpiColors.users,
        color: theme.colors[1] // Use second theme color for users
      }
    };
    
    setThemedKpiColors(updatedKpiColors);
    console.log("Updated KPI colors with theme:", updatedKpiColors);
  }, [selectedTheme]);

  useEffect(() => {
    const initialize = async () => {
      setCharts(generateChartConfigs(resolution));
      setMounted(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      setIsLoading(false);
    };

    initialize();
  }, []);

  // Regenerate charts when resolution or date range changes
  useEffect(() => {
    if (!mounted) return;
    console.log("Regenerating charts with resolution:", resolution);
    setCharts(generateChartConfigs(resolution));
  }, [resolution, mounted]);

  const toggleKPI = (kpiId: string) => {
    setActiveKPIs(prev => {
      const next = new Set(prev);
      if (next.has(kpiId)) {
        next.delete(kpiId);
      } else {
        next.add(kpiId);
      }
      return next;
    });
  };

  const handleTemplateChange = (value: string) => {
    if (isTemplateKey(value)) {
      setSelectedTemplate(value);
    }
  };

  const isTemplateKey = (value: string): value is TemplateKey => {
    return Object.keys(templateData).includes(value);
  };

  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const selectedCharts = charts.filter((_, index) =>
    templateData[selectedTemplate as TemplateKey].charts.includes(index)
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background/98 to-background/95 overflow-hidden">
      {/* <Sidebar /> */}
      <main className={`flex-1 overflow-y-auto transition-all duration-300`}>
        <div className="container mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent tracking-tight">
                Analytics Dashboard
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Select layout" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(templateData).map(([key, template]) => (
                    <SelectItem key={key} value={key}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(chartThemes).map(([key, theme]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {theme.colors.map((color, i) => (
                            <div
                              key={i}
                              className="w-4 h-4 rounded-sm"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className="ml-2">{theme.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-4">
                <DateRangePicker
                  date={globalDateRange}
                  onDateChange={setGlobalDateRange}
                  className="w-[280px]"
                  showTime
                />

                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Resolution" />
                  </SelectTrigger>
                  <SelectContent>
                    {resolutionOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid gap-6"
          >
            <DynamicLayout
              charts={selectedCharts}
              activeKPIs={activeKPIs}
              kpiColors={themedKpiColors}
              globalDateRange={globalDateRange}
              theme={chartThemes[selectedTheme as keyof typeof chartThemes]}
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}