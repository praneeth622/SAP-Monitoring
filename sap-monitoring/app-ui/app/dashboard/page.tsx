"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Activity, TrendingUp, Users, DollarSign } from "lucide-react"
import { Card } from "@/components/ui/card"
import { generateMultipleDataSets } from "@/utils/data"
import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { DynamicLayout } from "@/components/charts/DynamicLayout"
import { DateRangePicker } from "@/components/date-range-picker"
import { DateRange } from "react-day-picker"
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

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

const generateChartConfigs = () => {
  const datasets = generateMultipleDataSets(9);
  return datasets.map((data, i) => ({
    id: `chart-${i}`,
    data,
    type: i % 2 === 0 ? 'line' : 'bar' as const,
    title: chartTitles[i],
    width: 400,
    height: 400
  }));
};

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [charts, setCharts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeKPIs, setActiveKPIs] = useState<Set<string>>(new Set(['revenue', 'users']));
  const [globalDateRange, setGlobalDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  const [fullscreenChartId, setFullscreenChartId] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const initialize = async () => {
      setCharts(generateChartConfigs());
      setMounted(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      setIsLoading(false);
    };

    initialize();
  }, []);

  useEffect(() => {
    if (fullscreenChartId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [fullscreenChartId]);

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

  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background/98 to-background/95 overflow-hidden">
      {/* <Sidebar /> */}
      <main className={`flex-1 overflow-y-auto transition-all duration-300`}>
        <div className="dashboard-container">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="dashboard-header"
          >
            <h1 className="dashboard-title">Analytics Dashboard</h1>
            <p className="dashboard-subtitle">
              Track your key metrics and performance indicators in real-time
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="controls-card">
              <div className="controls-header">
                <h2 className="controls-title">Global Controls</h2>
                <DateRangePicker
                  date={globalDateRange}
                  onDateChange={setGlobalDateRange}
                  className="w-[300px]"
                  showTime
                />
              </div>
              
              <div className="parameters-container">
                {Object.entries(kpiColors).map(([kpiId, kpi]) => (
                  <button
                    key={kpiId}
                    onClick={() => toggleKPI(kpiId)}
                    className={`parameter-button ${
                      activeKPIs.has(kpiId)
                        ? `${kpi.lightBg} ${kpi.text} ${kpi.darkBg} ${kpi.darkText} active`
                        : ''
                    }`}
                  >
                    <kpi.icon className="w-5 h-5" />
                    <span>{kpi.name}</span>
                  </button>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="chart-grid"
          >
            <DynamicLayout
              charts={charts}
              activeKPIs={activeKPIs}
              kpiColors={kpiColors}
              globalDateRange={globalDateRange}
              fullscreenChartId={fullscreenChartId}
              setFullscreenChartId={setFullscreenChartId}
            />
          </motion.div>
        </div>
      </main>
    </div>
  );
}