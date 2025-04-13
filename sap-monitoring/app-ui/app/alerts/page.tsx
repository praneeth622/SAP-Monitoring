"use client"

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/date-range-picker';
import { DateRange } from 'react-day-picker';
import { useTheme } from 'next-themes';
import * as echarts from 'echarts';
import { Bell, Filter, X, Maximize2, Minimize2, ArrowUpDown, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { saveAs } from 'file-saver';
// import {Sidebar} from '@/components/sidebar';

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

interface PieChartData {
  title: string;
  data: { name: string; value: number }[];
}

const PieChart: React.FC<{
  data: PieChartData;
  selectedTheme: string;
  theme?: string;
}> = ({ data, selectedTheme, theme }) => {
  const chartRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chart, setChart] = useState<echarts.ECharts | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const initChart = useCallback(() => {
    if (!chartRef.current) return;

    const newChart = echarts.init(chartRef.current, undefined, {
      renderer: 'canvas',
      devicePixelRatio: window.devicePixelRatio
    });
    
    const colors = chartThemes[selectedTheme as keyof typeof chartThemes].colors;

    const options: echarts.EChartsOption = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)',
        backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        textStyle: {
          color: theme === 'dark' ? '#fff' : '#000'
        }
      },
      series: [
        {
          name: data.title,
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderColor: theme === 'dark' ? '#1e293b' : '#ffffff',
            borderWidth: 2
          },
          label: {
            show: false
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '14',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: data.data,
          color: colors
        }
      ]
    };

    newChart.setOption(options);
    setChart(newChart);

    return () => {
      newChart.dispose();
    };
  }, [data, selectedTheme, theme]);

  useEffect(() => {
    initChart();

    const handleResize = () => {
      if (chart && chartRef.current) {
        chart.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart?.dispose();
    };
  }, [initChart, chart]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    requestAnimationFrame(() => {
      if (chart) {
        setTimeout(() => {
          chart.resize();
        }, 300);
      }
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <Card 
        className={`relative overflow-hidden transition-all duration-300 ${
          isFullscreen 
            ? 'fixed inset-4 z-50 flex flex-col' 
            : 'h-[400px]'
        }`}
      >
        {isFullscreen && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={toggleFullscreen}
          />
        )}
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="absolute top-4 left-4 z-50">
          <h3 className="font-semibold text-lg">{data.title}</h3>
        </div>
        <div 
          ref={chartRef} 
          className={`w-full transition-all duration-300 ${
            isFullscreen ? 'h-[calc(100%-100px)]' : 'h-[300px]'
          }`}
        />
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex flex-wrap justify-center gap-3 bg-card/95 backdrop-blur-sm rounded-xl p-2.5 shadow-xl border border-border/40">
          {data.data.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/20"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: chartThemes[selectedTheme as keyof typeof chartThemes].colors[index]
                }}
              />
              <span className="text-sm font-medium">{item.name}</span>
              <span className="text-sm text-muted-foreground">({item.value.toLocaleString()})</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// Generate dummy alerts data with a seed to ensure consistent data between server and client
const generateAlerts = (count: number) => {
  const severities = ['Critical', 'Warning', 'Info'];
  const statuses = ['Active', 'Cleared'];
  const sources = ['System', 'Application', 'Network', 'Security'];
  const areas = ['Frontend', 'Backend', 'Database', 'Infrastructure'];
  
  // Use a seeded random number generator
  const seededRandom = (seed: number) => {
    return () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  };

  const random = seededRandom(42); // Use a fixed seed

  return Array.from({ length: count }, (_, i) => ({
    id: `ALT-${(i + 1).toString().padStart(4, '0')}`,
    severity: severities[Math.floor(random() * severities.length)],
    status: statuses[Math.floor(random() * statuses.length)],
    source: sources[Math.floor(random() * sources.length)],
    area: areas[Math.floor(random() * areas.length)],
    message: `Alert message ${i + 1} - This is a sample alert description`,
    timestamp: new Date(Date.now() - Math.floor(random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
  }));
};

const AlertsPage = () => {
  const { theme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });

  // Use useMemo to ensure consistent data between renders
  const alerts = useMemo(() => generateAlerts(100), []);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [filteredAlerts, setFilteredAlerts] = useState(alerts);

  const pieChartsData: PieChartData[] = useMemo(() => [
    {
      title: 'Alerts by Severity',
      data: [
        { name: 'Critical', value: 88017 },
        { name: 'Warning', value: 45230 },
        { name: 'Info', value: 32180 }
      ]
    },
    {
      title: 'Alerts by Status',
      data: [
        { name: 'Active', value: 88017 },
        { name: 'Cleared', value: 77450 }
      ]
    },
    {
      title: 'Alerts by Asset',
      data: [
        { name: 'Servers', value: 86780 },
        { name: 'Network', value: 45670 },
        { name: 'Storage', value: 32450 }
      ]
    },
    {
      title: 'Alerts by Source',
      data: [
        { name: 'System', value: 88017 },
        { name: 'Application', value: 54320 },
        { name: 'Security', value: 43210 }
      ]
    }
  ], []);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleColumnFilter = (column: string, value: string) => {
    setColumnFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const clearColumnFilter = (column: string) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[column];
      return newFilters;
    });
  };

  useEffect(() => {
    let result = [...alerts];

    // Apply column filters
    Object.entries(columnFilters).forEach(([column, value]) => {
      if (value) {
        result = result.filter(alert => 
          alert[column as keyof typeof alert]
            .toString()
            .toLowerCase()
            .includes(value.toLowerCase())
        );
      }
    });

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        if (a[sortConfig.key as keyof typeof a] < b[sortConfig.key as keyof typeof b]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key as keyof typeof a] > b[sortConfig.key as keyof typeof b]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredAlerts(result);
  }, [alerts, columnFilters, sortConfig]);

  const renderColumnHeader = (column: string, label: string) => (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        onClick={() => handleSort(column)}
        className="hover:bg-transparent p-0"
      >
        {label}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
      <div className="relative">
        <Input
          placeholder={`Filter ${label.toLowerCase()}...`}
          value={columnFilters[column] || ''}
          onChange={(e) => handleColumnFilter(column, e.target.value)}
          className="h-8 w-[150px] text-sm"
        />
        {columnFilters[column] && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => clearColumnFilter(column)}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background/98 to-background/95 overflow-hidden">
      {/* <Sidebar /> */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent tracking-tight">
                Alert Monitoring
              </h1>
              <p className="text-muted-foreground/90 text-lg mt-2">
                Monitor and manage system alerts
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col sm:flex-row items-center gap-4"
            >
              <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                <SelectTrigger className="w-[180px]">
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

              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
                className="w-[280px]"
                align="end"
              />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <Card className="p-6 backdrop-blur-sm bg-card/90 border-border/40 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-red-500/10">
                  <Bell className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Critical Alerts</p>
                  <h3 className="text-2xl font-bold">35</h3>
                </div>
              </div>
            </Card>

            <Card className="p-6 backdrop-blur-sm bg-card/90 border-border/40 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-500/10">
                  <Bell className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Warning Alerts</p>
                  <h3 className="text-2xl font-bold">45</h3>
                </div>
              </div>
            </Card>

            <Card className="p-6 backdrop-blur-sm bg-card/90 border-border/40 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/10">
                  <Bell className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Info Alerts</p>
                  <h3 className="text-2xl font-bold">20</h3>
                </div>
              </div>
            </Card>

            <Card className="p-6 backdrop-blur-sm bg-card/90 border-border/40 shadow-xl">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/10">
                  <Bell className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cleared Alerts</p>
                  <h3 className="text-2xl font-bold">35</h3>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            {pieChartsData.map((data, index) => (
              <PieChart 
                key={index}
                data={data}
                selectedTheme={selectedTheme}
                theme={theme}
              />
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="backdrop-blur-sm bg-card/90 border-border/40 shadow-xl">
              <div className="p-6 border-b border-border/40">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Alerts List</h2>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{renderColumnHeader('severity', 'Severity')}</TableHead>
                      <TableHead>{renderColumnHeader('status', 'Status')}</TableHead>
                      <TableHead>{renderColumnHeader('source', 'Source')}</TableHead>
                      <TableHead>{renderColumnHeader('area', 'Area')}</TableHead>
                      <TableHead>{renderColumnHeader('message', 'Message')}</TableHead>
                      <TableHead>{renderColumnHeader('timestamp', 'Time')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            alert.severity === 'Critical' 
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : alert.severity === 'Warning'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}>
                            {alert.severity}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            alert.status === 'Active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                          }`}>
                            {alert.status}
                          </span>
                        </TableCell>
                        <TableCell>{alert.source}</TableCell>
                        <TableCell>{alert.area}</TableCell>
                        <TableCell className="max-w-[500px] truncate">{alert.message}</TableCell>
                        <TableCell>{new Date(alert.timestamp).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AlertsPage;