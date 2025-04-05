"use client";

import { motion } from "framer-motion";
import {
  Activity,
  TrendingUp,
  Users,
  DollarSign,
  Loader2,
  RefreshCw,
  Save,
  Clock,
  Check,
  Calendar,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { generateMultipleDataSets } from "@/utils/data";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import { DynamicLayout } from "@/components/charts/DynamicLayout";
import { DateRangePicker } from "@/components/date-range-picker";
import { DateRange } from "react-day-picker";
import { useSidebar } from "@/contexts/sidebar-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import {
  ChartConfig,
  ChartType,
  DataPoint,
  TemplateConfig,
  TemplateKey,
  Template,
  ThemeKey,
  ChartTheme,
  Graph,
} from "@/types";
import { toast } from "sonner";
import { useChartTheme } from "@/components/charts/hooks/useChartTheme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";

// Add API template interface
interface ApiTemplate {
  user_id?: string;
  template_id: string[] | string;
  template_name: string[] | string;
  template_desc: string[] | string;
  default: boolean[] | boolean;
  favorite: boolean[] | boolean;
  frequency?: string[] | string;
  systems?: { system_id: string }[];
  graphs?: any[];
}

// Interface for normalized template
interface NormalizedTemplate {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isFavorite: boolean;
  frequency: string;
  systems: string[];
  graphs: {
    id: string;
    name: string;
    position: { x: number; y: number; w: number; h: number };
    type: ChartType;
    primaryKpi: string;
    secondaryKpis: string[];
  }[];
}

interface TemplateGraph {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  type: ChartType;
  primaryKpi: string;
  secondaryKpis: string[];
  frequency?: string;
  systems?: { system_id: string }[];
}

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
    name: "Revenue",
    color: "#3B82F6",
    icon: DollarSign,
    lightBg: "bg-blue-50/80",
    darkBg: "dark:bg-blue-900/30",
    text: "text-blue-600",
    darkText: "dark:text-blue-400",
  },
  users: {
    name: "Users",
    color: "#8B5CF6",
    icon: Users,
    lightBg: "bg-purple-50/80",
    darkBg: "dark:bg-purple-900/30",
    text: "text-purple-600",
    darkText: "dark:text-purple-400",
  },
};

const chartTitles = [
  "Revenue Analysis",
  "User Growth Metrics",
  "Performance Overview",
  "Conversion Trends",
  "Sales Analytics",
  "User Engagement",
  "Growth Metrics",
  "Revenue Distribution",
  "Market Analysis",
];

// Helper function to normalize API template
const normalizeTemplate = (template: ApiTemplate): NormalizedTemplate => {
  // Extract values handling both array and direct values
  const id = Array.isArray(template.template_id)
    ? template.template_id[0]
    : template.template_id;
  const name = Array.isArray(template.template_name)
    ? template.template_name[0]
    : template.template_name;
  const description = Array.isArray(template.template_desc)
    ? template.template_desc[0]
    : template.template_desc;
  const isDefault = Array.isArray(template.default)
    ? template.default[0]
    : template.default;
  const isFavorite = Array.isArray(template.favorite)
    ? template.favorite[0]
    : template.favorite;
  const frequency = template.frequency
    ? Array.isArray(template.frequency)
      ? template.frequency[0]
      : template.frequency
    : "auto";

  // Extract systems
  const systems = template.systems?.map((system) => system.system_id) || [];

  // Extract and transform graphs
  const graphs =
    template.graphs?.map((graph) => {
      // Parse position data
      const topPos = graph.top_xy_pos?.split(":").map(Number) || [0, 0];
      const bottomPos = graph.bottom_xy_pos?.split(":").map(Number) || [0, 0];
      const [topY, topX] = topPos;
      const [bottomY, bottomX] = bottomPos;

      // Extract KPIs
      const primaryKpi = graph.primary_kpi_id;
      const secondaryKpis =
        graph.secondary_kpis?.map((sk: { kpi_id: string }) => sk.kpi_id) || [];

      return {
        id: graph.graph_id,
        name: graph.graph_name,
        position: {
          x: topX / 10,
          y: topY / 10,
          w: (bottomX - topX) / 10,
          h: (bottomY - topY) / 10,
        },
        type: "line" as ChartType, // Default to line chart
        primaryKpi,
        secondaryKpis,
      };
    }) || [];

  return {
    id,
    name,
    description,
    isDefault,
    isFavorite,
    frequency,
    systems,
    graphs,
  };
};

const templateData: Record<TemplateKey, TemplateConfig> = {
  default: {
    id: "1",
    name: "Default View",
    description: "Complete monitoring dashboard",
    charts: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  },
  single: {
    id: "2",
    name: "Single Chart",
    description: "Detailed view of revenue analysis",
    charts: [0],
  },
  dual: {
    id: "3",
    name: "Two Charts",
    description: "Revenue and user growth comparison",
    charts: [0, 1],
  },
  triple: {
    id: "4",
    name: "Three Charts",
    description: "Key performance indicators",
    charts: [0, 1, 2],
  },
  quad: {
    id: "5",
    name: "Four Charts",
    description: "Four key metric dashboard",
    charts: [0, 1, 2, 3],
  },
  five: {
    id: "6",
    name: "Five Charts",
    description: "Comprehensive performance view",
    charts: [0, 1, 2, 3, 4],
  },
  six: {
    id: "7",
    name: "Six Charts",
    description: "Extended metrics overview",
    charts: [0, 1, 2, 3, 4, 5],
  },
  seven: {
    id: "8",
    name: "Seven Charts",
    description: "Detailed metrics dashboard",
    charts: [0, 1, 2, 3, 4, 5, 6],
  },
  eight: {
    id: "9",
    name: "Eight Charts",
    description: "Comprehensive analytics",
    charts: [0, 1, 2, 3, 4, 5, 6, 7],
  },
};

// Update the resolutionOptions to include time in seconds
const resolutionOptions = [
  { value: "auto", label: "Auto", seconds: 0 },
  { value: "1m", label: "1 Minute", seconds: 60 },
  { value: "5m", label: "5 Minutes", seconds: 300 },
  { value: "15m", label: "15 Minutes", seconds: 900 },
  { value: "1h", label: "1 Hour", seconds: 3600 },
  { value: "1d", label: "1 Day", seconds: 86400 },
];

const generateChartConfigs = (resolution = "auto") => {
  const datasets = generateMultipleDataSets(9, resolution);
  return datasets.map((data, i) => ({
    id: `chart-${i}`,
    data,
    type: i % 2 === 0 ? "line" : ("bar" as ChartType),
    title: chartTitles[i],
    width: 400,
    height: 400,
    kpiColors: {} as Record<string, { color: string; name: string; icon?: any }>,
    activeKPIs: new Set<string>(),
    layout: {
      x: 0,
      y: 0,
      w: 6,
      h: 4
    }
  }));
};

// Optimize the generateChartsFromTemplate function for faster performance and template integrity
const generateChartsFromTemplate = (
  template: NormalizedTemplate,
  resolution = "auto"
) => {
  console.log(
    `Generating charts from template "${template.name}" with ${
      template.graphs?.length || 0
    } graphs using ${resolution} resolution`
  );

  if (!template.graphs || template.graphs.length === 0) {
    console.warn("Template has no graphs, falling back to default charts");
    return generateChartConfigs(resolution);
  }

  // Optimization: Generate just one dataset for all charts to share
  // This significantly improves performance when changing resolution
  const sharedDataset = generateMultipleDataSets(1, resolution)[0] || [];

  // Create a consistent color palette for KPIs across all charts
  const theme = chartThemes.default;
  const globalKpiColors: Record<string, { color: string; name: string }> = {};
  const allTemplateKpis = new Set<string>();

  // First pass - collect all unique KPIs in the template
  template.graphs.forEach((graph) => {
    if (graph.primaryKpi) {
      allTemplateKpis.add(graph.primaryKpi.toLowerCase());
    }
    if (graph.secondaryKpis) {
      graph.secondaryKpis.forEach((kpi) =>
        allTemplateKpis.add(kpi.toLowerCase())
      );
    }
  });

  // Assign colors to all KPIs
  Array.from(allTemplateKpis).forEach((kpi, index) => {
    globalKpiColors[kpi] = {
      color: theme.colors[index % theme.colors.length],
      name: kpi.charAt(0).toUpperCase() + kpi.slice(1), // Capitalize first letter
    };
  });

  // Extract all dates from the shared dataset for consistent date ranges across charts
  const allDates = Array.from(new Set(sharedDataset.map(d => d.date))).sort();

  const chartConfigs = template.graphs.map((graph, index) => {
    // Generate data for all KPIs in the graph
    const allKpis = [graph.primaryKpi, ...graph.secondaryKpis].map((kpi) =>
      kpi.toLowerCase()
    );

    // Create a focused data set for this graph's KPIs
    const dummyData: DataPoint[] = [];
    
    // For each date point, create entries for each KPI
    allDates.forEach(date => {
      allKpis.forEach((kpi, kpiIndex) => {
        // Find existing data to reuse patterns
        const existingDataPoints = sharedDataset.filter(d => d.date === date);
        
        if (existingDataPoints.length > 0) {
          // Reuse pattern from existing data but with unique values for this KPI
          const basePoint = existingDataPoints[kpiIndex % existingDataPoints.length];
          const baseValue = basePoint ? basePoint.value : 1000;
          
          // Apply multiplier based on KPI name to create unique but consistent values
          let multiplier = 1.0;
          if (kpi.includes('cpu')) multiplier = 0.8;
          else if (kpi.includes('memory')) multiplier = 1.5;
          else if (kpi.includes('disk')) multiplier = 2.0;
          else if (kpi.includes('network')) multiplier = 0.5;
          else multiplier = 1.0 + (kpiIndex * 0.1);
          
          // Apply a stable random variation based on KPI name to ensure consistency
          const stableHash = kpi.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const consistentRandom = (stableHash % 20) / 100 + 0.9; // 0.9-1.1 range

        dummyData.push({
          category: kpi,
            date: date,
            value: Math.round(baseValue * multiplier * consistentRandom)
          });
        }
      });
    });

    // Create KPI colors using the global palette
    const chartKpiColors: Record<string, { color: string; name: string }> = {};
    const activeKPIs = new Set<string>();

    allKpis.forEach((kpi) => {
      activeKPIs.add(kpi);
      chartKpiColors[kpi] = globalKpiColors[kpi] || {
        color: theme.colors[allKpis.indexOf(kpi) % theme.colors.length],
        name: kpi.charAt(0).toUpperCase() + kpi.slice(1),
      };
    });

    // Position calculations - ensure chart has enough space
    const position = graph.position || { x: 0, y: index * 4, w: 12, h: 4 };

    // Ensure reasonable minimums for width and height
    position.w = Math.max(4, position.w);
    position.h = Math.max(3, position.h);

    return {
      id: graph.id || `chart-${index}`,
      title: graph.name || `Chart ${index + 1}`,
      type: graph.type || ("line" as ChartType),
      data: dummyData,
      width: position.w * 100 || 400,
      height: position.h * 100 || 300,
      activeKPIs,
      kpiColors: chartKpiColors,
      layout: position,
    };
  });

  return chartConfigs;
};

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeKPIs, setActiveKPIs] = useState<Set<string>>(
    new Set(["revenue", "users"])
  );
  const [globalDateRange, setGlobalDateRange] = useState<DateRange | undefined>(
    {
      from: new Date(new Date().setDate(new Date().getDate() - 30)),
      to: new Date(),
    }
  );
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateKey>("default");
  const [resolution, setResolution] = useState("auto");
  const [selectedTheme, setSelectedTheme] = useState("default");

  // Add state for API templates
  const [apiTemplates, setApiTemplates] = useState<NormalizedTemplate[]>([]);
  const [selectedApiTemplate, setSelectedApiTemplate] = useState<string>("");

  // Apply theme colors to KPI colors
  const [themedKpiColors, setThemedKpiColors] = useState(kpiColors);

  // Add states for layout saving
  const [layoutChanged, setLayoutChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Add timer-related states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | null>(null);
  const [autoRefreshDropdownOpen, setAutoRefreshDropdownOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [nextRefreshTime, setNextRefreshTime] = useState<Date | null>(null);
  
  // Use refs to prevent infinite loops
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshingRef = useRef(false);
  const refreshDataRef = useRef<() => Promise<void>>();
  const nextRefreshTimeRef = useRef<Date | null>(null);
  const autoRefreshIntervalRef = useRef<number | null>(null);

  // Add a new state to track whether auto-refresh is enabled
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false);

  // Add states to track error conditions
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add a state for content-only loading (won't affect header)
  const [isContentLoading, setIsContentLoading] = useState(false);

  // Sync refreshingRef with isRefreshing state
  useEffect(() => {
    refreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  // Sync autoRefreshIntervalRef with autoRefreshInterval state
  useEffect(() => {
    autoRefreshIntervalRef.current = autoRefreshInterval;
  }, [autoRefreshInterval]);

  // Sync nextRefreshTimeRef with nextRefreshTime state
  useEffect(() => {
    nextRefreshTimeRef.current = nextRefreshTime;
  }, [nextRefreshTime]);

  // Auto-refresh options in seconds
  const autoRefreshOptions = [
    { label: "1 minute", value: 60 },
    { label: "5 minutes", value: 300 },
    { label: "15 minutes", value: 900 },
    { label: "1 hour", value: 3600 },
    { label: "24 hours", value: 86400 },
  ];

  // Modify the refresh data function to handle timer reset based on auto-refresh mode
  const refreshData = useCallback(async () => {
    if (refreshingRef.current) return;

    try {
      setIsRefreshing(true);
      console.log("Refreshing data...");
      
      // Delay to show loading state briefly for better visual feedback
      await new Promise(resolve => setTimeout(resolve, 300));

      // If a template is selected, reload that template's data
      if (selectedApiTemplate) {
        try {
          console.log(`Refreshing template: ${selectedApiTemplate}`);
          
          // Re-fetch the template data from API to ensure we have the latest
          const response = await fetch(
            `https://shwsckbvbt.a.pinggy.link/api/ut?templateId=${selectedApiTemplate}`
          );

          if (!response.ok) {
            throw new Error(`Failed to refresh template: ${response.statusText}`);
          }

          const data = await response.json();
          
          if (!data || !data.length) {
            throw new Error("Empty response when refreshing template");
          }

          // Normalize the template
          const refreshedTemplate = normalizeTemplate(data[0]);
          
          // Generate charts from the refreshed template
          const refreshedCharts = generateChartsFromTemplate(refreshedTemplate, resolution);
          
          // Preserve existing layouts when updating charts
          setCharts(prevCharts => {
            return refreshedCharts.map(newChart => {
              // Find matching chart in previous charts to preserve layout
              const matchingChart = prevCharts.find(c => c.id === newChart.id);
              if (matchingChart) {
                return {
                  ...newChart,
                  layout: matchingChart.layout,
                  // Preserve active KPIs and colors for visual consistency
                  activeKPIs: matchingChart.activeKPIs || newChart.activeKPIs,
                  kpiColors: matchingChart.kpiColors || newChart.kpiColors,
                };
              }
              return newChart;
            });
          });
          
          toast.success("Dashboard refreshed successfully");
        } catch (error) {
          console.error("Error refreshing template:", error);
          toast.error("Failed to refresh template data");
        }
      } else {
        // No template selected, refresh with generated data
        const newCharts = generateChartConfigs(resolution);
        
        // Preserve existing layouts
        setCharts(prevCharts => {
          return newCharts.map((newChart, i) => {
            if (i < prevCharts.length) {
              return {
                ...newChart,
                layout: prevCharts[i].layout,
                activeKPIs: prevCharts[i].activeKPIs || newChart.activeKPIs,
                kpiColors: prevCharts[i].kpiColors || newChart.kpiColors,
              };
            }
            return newChart;
          });
        });
        
        toast.success("Dashboard refreshed successfully");
      }
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      // Reset the refresh state
      setIsRefreshing(false);
      
      // Handle timer reset or stop based on auto-refresh setting
      setTimeout(() => {
        const currentInterval = autoRefreshIntervalRef.current;
        
        if (currentInterval) {
          if (isAutoRefreshEnabled) {
            // If auto-refresh is enabled, set up the next timer
            console.log(`Auto-refresh enabled: Setting up next timer for ${currentInterval} seconds`);
            const now = new Date();
            const nextTime = new Date(now.getTime() + currentInterval * 1000);
            setNextRefreshTime(nextTime);
            setTimeRemaining(currentInterval);
          } else {
            // If auto-refresh is disabled, stop the timer after this refresh
            console.log("Auto-refresh disabled: Stopping timer after this refresh");
            setNextRefreshTime(null);
            setTimeRemaining(null);
          }
        }
      }, 100);
    }
  }, [
    selectedApiTemplate,
    resolution,
    generateChartConfigs,
    normalizeTemplate,
    generateChartsFromTemplate,
    isAutoRefreshEnabled
  ]);

  // Store the latest refreshData function in a ref
  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);

  // Update the timer effect to handle both auto-refresh modes
  useEffect(() => {
    // Function to handle timer tick
    const handleTimerTick = () => {
      // Only proceed if we have a next refresh time
      if (!nextRefreshTimeRef.current) return;
      
      const currentTime = new Date();
      const nextTime = nextRefreshTimeRef.current;
      
      if (nextTime && currentTime >= nextTime) {
        // Time to refresh
        if (!refreshingRef.current) {
          console.log("Timer triggered refresh at", new Date().toISOString());
          
          // Call refreshData to handle the refresh
          if (typeof refreshData === 'function') {
            refreshData();
          } else if (refreshDataRef.current) {
            refreshDataRef.current();
          }
        }
      } else if (nextTime) {
        // Just update countdown display
        const diff = Math.max(0, Math.round((nextTime.getTime() - currentTime.getTime()) / 1000));
        setTimeRemaining(diff);
      }
    };
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Only set up timer if we have a next refresh time
    if (nextRefreshTime) {
      // Create interval to check every second
      timerRef.current = setInterval(handleTimerTick, 1000);
      
      // Run immediately once to update UI
      handleTimerTick();
    } else {
      // Reset timer display when there's no next refresh time
      setTimeRemaining(null);
    }
    
    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [nextRefreshTime, refreshData]);

  // Handle selecting a new auto-refresh interval
  const handleSelectAutoRefresh = useCallback((seconds: number) => {
    // Always set the interval value
    setAutoRefreshInterval(seconds);
    setAutoRefreshDropdownOpen(false);
    
    // Always set up the timer when selecting an interval
    const now = new Date();
    const nextTime = new Date(now.getTime() + seconds * 1000);
    setNextRefreshTime(nextTime);
    setTimeRemaining(seconds);
    
    // Different message based on auto-refresh state
    const option = autoRefreshOptions.find(opt => opt.value === seconds);
    if (option) {
      if (isAutoRefreshEnabled) {
        toast.success(`Auto-refresh set to ${option.label}`);
      } else {
        toast.success(`Will refresh once in ${option.label}`);
      }
    }
  }, [autoRefreshOptions, isAutoRefreshEnabled]);

  // Stop auto-refresh
  const stopAutoRefresh = useCallback(() => {
    setIsAutoRefreshEnabled(false);
    setAutoRefreshInterval(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeRemaining(null);
    setNextRefreshTime(null);
    toast.success("Auto-refresh stopped");
  }, []);

  // Separate function for manual refresh to be called from the UI
  const handleManualRefresh = useCallback((closeDropdown: boolean = true) => {
    if (closeDropdown) {
      setAutoRefreshDropdownOpen(false);
    }
    refreshData();
  }, [refreshData]);

  // Calculate progress percentage for circular indicator
  const getProgressPercentage = useCallback(() => {
    if (!nextRefreshTime || !autoRefreshInterval) return 0;
    
    const now = new Date();
    const diffMs = nextRefreshTime.getTime() - now.getTime();
    
    if (diffMs <= 0) return 100;
    
    const elapsedMs = (autoRefreshInterval * 1000) - diffMs;
    const percentage = (elapsedMs / (autoRefreshInterval * 1000)) * 100;
    
    return Math.min(Math.max(percentage, 0), 100);
  }, [nextRefreshTime, autoRefreshInterval]);

  // Format time remaining until next refresh
  const formatTimeRemaining = useCallback(() => {
    if (!timeRemaining) return "";
    
    if (timeRemaining <= 0) return "Refreshing...";
    
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
    }
    return `${seconds}s`;
  }, [timeRemaining]);

  // Move fetchTemplateById inside the component
  const fetchTemplateById = useCallback(
    async (templateId: string) => {
      try {
        // Only set content loading to true, keep header interactive
        setIsContentLoading(true);
        // Reset error states when starting a new fetch
        setHasError(false);
        setErrorMessage(null);
        
        console.log(`Fetching template with ID: ${templateId}`);

        const response = await fetch(
          `https://shwsckbvbt.a.pinggy.link/api/ut?templateId=${templateId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch template: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("Template API response:", data);

        if (!data || !data.length) {
          setHasError(true);
          setErrorMessage("Template not found. The requested template could not be found.");
          toast.error("Template not found", {
            description: "The requested template could not be found.",
            duration: 5000
          });
          setIsContentLoading(false);
          return;
        }

        // Normalize the template
        const normalizedTemplate = normalizeTemplate(data[0]);
        console.log("Normalized template:", normalizedTemplate);

        if (
          !normalizedTemplate.graphs ||
          normalizedTemplate.graphs.length === 0
        ) {
          setHasError(true);
          setErrorMessage("Empty template. The template has no graphs to display. Please add some graphs or select a different template.");
          toast.error("Empty template", {
            description: "The template has no graphs to display. Please add some graphs or select a different template.",
            duration: 5000
          });
          setIsContentLoading(false);
          return;
        }

        // Generate charts from the fetched template with the selected theme
        const templateCharts = generateChartsFromTemplate(
          normalizedTemplate,
          resolution
        );

        console.log(
          `Generated ${templateCharts.length} charts from template`,
          templateCharts
        );

        // Apply current theme colors to the charts
        const theme = chartThemes[selectedTheme as keyof typeof chartThemes];
        if (theme) {
          templateCharts.forEach((chart) => {
            // Update chart KPI colors with current theme colors
            if ('kpiColors' in chart && chart.kpiColors) {
              const kpiEntries = Object.entries(chart.kpiColors as Record<string, { color: string }>);
              kpiEntries.forEach(
                ([kpiId, kpiInfo]: [string, any], colorIndex) => {
                  // Apply theme color based on index
                  if (kpiInfo && typeof kpiInfo === "object") {
                    (chart.kpiColors as Record<string, { color: string }>)[kpiId].color =
                      theme.colors[colorIndex % theme.colors.length];
                  }
                }
              );
            }
          });
        }

        // Important: Update the charts state with the new charts
        setCharts(templateCharts);

        // Reset layoutChanged flag since we're loading a fresh template
        setLayoutChanged(false);

        toast.success(
          `Template "${normalizedTemplate.name}" loaded successfully`
        );
      } catch (error) {
        console.error("Error fetching template:", error);
        setHasError(true);
        setErrorMessage("Failed to load template. Unable to connect to the server. Please check your connection and try again.");
        toast.error("Failed to load template", {
          description:
            error instanceof Error
              ? error.message
              : "Unable to connect to the server. Please check your connection and try again.",
          duration: 5000
        });

        // Clear charts instead of showing dummy ones
        setCharts([]);
      } finally {
        // Use a slight delay to ensure smooth transition
        setTimeout(() => {
          setIsContentLoading(false);
        }, 300);
      }
    },
    [resolution, selectedTheme]
  );

  // Now your fetchTemplates function can use fetchTemplateById
  const fetchTemplates = useCallback(async () => {
    try {
      // Only set content loading to true, keep header interactive
      setIsContentLoading(true);
      // Reset error states when starting a new fetch
      setHasError(false);
      setErrorMessage(null);
      
      console.log("Fetching templates from API...");
      const response = await fetch(
        `https://shwsckbvbt.a.pinggy.link/api/utl?userId=USER_TEST_1`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Templates API response:", data);

      // Process templates as before...
      let normalizedTemplates: NormalizedTemplate[] = [];
      if (!Array.isArray(data) || data.length === 0) {
        setHasError(true);
        setErrorMessage("No templates available. No templates were found for this user.");
        toast.error("No templates available", {
          description: "No templates were found for this user.",
          duration: 5000
        });
        setApiTemplates([]);
        setCharts([]);
        setTimeout(() => setIsContentLoading(false), 300);
        return;
      } else {
        normalizedTemplates = data.map(normalizeTemplate);
      }

      setApiTemplates(normalizedTemplates);

      // Find default template if available
      const defaultTemplate = normalizedTemplates.find((t) => t.isDefault);

      if (defaultTemplate) {
        console.log(`Found default template: "${defaultTemplate.name}"`);
        setSelectedApiTemplate(defaultTemplate.id);

        // Now use the proper fetchTemplateById function
        await fetchTemplateById(defaultTemplate.id);
      } else if (normalizedTemplates.length > 0) {
        // If no default, use the first template
        const firstTemplate = normalizedTemplates[0];
        console.log(
          `No default template found, using first template: "${firstTemplate.name}"`
        );
        setSelectedApiTemplate(firstTemplate.id);

        // Now use the proper fetchTemplateById function
        await fetchTemplateById(firstTemplate.id);
      } else {
        console.log("No templates found");
        setHasError(true);
        setErrorMessage("No templates available. No templates were found for this user.");
        toast.error("No templates available", {
          description: "No templates were found for this user.",
          duration: 5000
        });
        setCharts([]);
        setTimeout(() => setIsContentLoading(false), 300);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      setHasError(true);
      setErrorMessage("Failed to fetch templates. Unable to connect to the server. Please check your connection and try again.");
      toast.error("Failed to fetch templates", {
        description:
          error instanceof Error
            ? error.message
            : "Unable to connect to the server. Please check your connection and try again.",
        duration: 5000
      });

      // Clear charts instead of showing dummy ones
      setCharts([]);
      setApiTemplates([]);
      setTimeout(() => setIsContentLoading(false), 300);
    }
  }, [fetchTemplateById]);

  // Initialize dashboard with templates
  useEffect(() => {
    let isMounted = true; // Flag to handle component unmounting

    const initialize = async () => {
      try {
        if (!isMounted) return;

        // Only set initial loading to true on first mount
        setIsLoading(true);
        console.log("Initializing dashboard and fetching templates...");

        // Do not generate default charts, wait for templates
        setCharts([]);

        // Fetch templates from API
        await fetchTemplates();

        if (!isMounted) return;
        console.log(
          "Templates loaded, API templates count:",
          apiTemplates.length
        );

        setMounted(true);
      } catch (error) {
        if (!isMounted) return;

        console.error("Error initializing dashboard:", error);
        // Show error instead of dummy charts
        setHasError(true);
        setErrorMessage("Failed to initialize dashboard. Please check your connection and try again.");
        setCharts([]);
      } finally {
        if (isMounted) {
          // Only hide the full loading after first mount
          setIsLoading(false);
        }
      }
    };

    initialize();

    // Cleanup function to handle unmounting
    return () => {
      isMounted = false;
    };
  }, [fetchTemplates]);

  // Update the handleApiTemplateChange function to ensure proper template loading
  const handleApiTemplateChange = useCallback(
    (templateId: string) => {
      if (templateId === selectedApiTemplate) return;

      console.log(
        `Changing template from ${selectedApiTemplate} to ${templateId}`
      );
      setSelectedApiTemplate(templateId);

      // Set loading state while fetching the new template
      // Only affect content area, not header
      setIsContentLoading(true);

      // Fetch the template data
      fetchTemplateById(templateId);
    },
    [selectedApiTemplate, fetchTemplateById]
  );

  // Update handleResolutionChange to maintain current template and provide smoother transitions
  const handleResolutionChange = useCallback(
    (newResolution: string) => {
      // Skip if resolution hasn't changed
      if (newResolution === resolution) {
        return;
      }

      console.log(`Changing resolution from ${resolution} to ${newResolution}`);
      
      // Show loading only in content area
      setIsContentLoading(true);
      
      // Set resolution state immediately
      setResolution(newResolution);

      // Use a shorter timeout for faster response
      setTimeout(async () => {
        try {
          // Reset auto-refresh timer if active
          if (autoRefreshInterval && nextRefreshTime) {
            const now = new Date();
            const nextTime = new Date(now.getTime() + autoRefreshInterval * 1000);
            setNextRefreshTime(nextTime);
            setTimeRemaining(autoRefreshInterval);
          }
          
          // If a template is selected, regenerate that template's charts with new resolution
      if (selectedApiTemplate) {
            console.log(`Updating template ${selectedApiTemplate} with ${newResolution} resolution`);
            
            // Find the current template
            const template = apiTemplates.find(t => t.id === selectedApiTemplate);
            
        if (template) {
              // Generate new charts with new resolution
              const newCharts = generateChartsFromTemplate(template, newResolution);
              
              // Preserve existing layouts when updating charts (exact same approach as refreshData)
              setCharts(prevCharts => {
                return newCharts.map(newChart => {
                  // Find matching chart in previous charts to preserve layout
                  const matchingChart = prevCharts.find(c => c.id === newChart.id);
                  if (matchingChart) {
                    return {
                      ...newChart,
                      layout: matchingChart.layout,
                      // Preserve active KPIs and colors for visual consistency
                      activeKPIs: matchingChart.activeKPIs || newChart.activeKPIs,
                      kpiColors: matchingChart.kpiColors || newChart.kpiColors,
                    };
              }
              return newChart;
            });
          });
              
              // Ensure selected template is maintained
              setSelectedApiTemplate(selectedApiTemplate);
        }
      } else {
            // No template selected, refresh with generated data
            const newCharts = generateChartConfigs(newResolution);
            
            // Preserve existing layouts
            setCharts(prevCharts => {
          return newCharts.map((newChart, i) => {
            if (i < prevCharts.length) {
              return {
                ...newChart,
                layout: prevCharts[i].layout,
                    activeKPIs: prevCharts[i].activeKPIs || newChart.activeKPIs,
                    kpiColors: prevCharts[i].kpiColors || newChart.kpiColors,
              };
            }
            return newChart;
          });
        });
      }

          // Show success toast with short duration
          toast.success(
            `Resolution changed to ${
              resolutionOptions.find(opt => opt.value === newResolution)?.label || 
              newResolution
            }`,
            { duration: 1500 }
          );
    } catch (error) {
          console.error("Error changing resolution:", error);
          toast.error("Failed to change resolution", { duration: 2000 });
    } finally {
          // Use a very short delay to stop loading for smooth transition
          setTimeout(() => {
            setIsContentLoading(false);
          }, 200);
        }
      }, 100); // Reduced timeout for faster response
    },
    [resolution, selectedApiTemplate, apiTemplates, autoRefreshInterval, nextRefreshTime]
  );

  const toggleKPI = (kpiId: string) => {
    setActiveKPIs((prev) => {
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

  const handleLayoutChange = useCallback((newLayout: any) => {
    console.log("Layout changed:", newLayout);
    setLayoutChanged(true);
  }, []);

  const saveLayout = useCallback(async () => {
    if (!selectedApiTemplate || !layoutChanged) return;

    try {
      setIsSaving(true);

      // Find the current template
      const currentTemplate = apiTemplates.find(
        (t) => t.id === selectedApiTemplate
      );
      if (!currentTemplate) {
        throw new Error("Selected template not found");
      }

      // Get the current layout from charts
      const updatedGraphs = charts
        .map((chart) => {
          // Find the corresponding graph in the template
          const templateGraph = currentTemplate.graphs.find(
            (g) => g.id === chart.id
          );
          if (!templateGraph) return null;

          // Convert the layout to API format (top_xy_pos and bottom_xy_pos)
          const layout = chart.layout || { x: 0, y: 0, w: 12, h: 4 };

          // Calculate the positions based on the layout
          // Converting back from the 10x grid system used in the template
          const topX = layout.x * 10;
          const topY = layout.y * 10;
          const bottomX = (layout.x + layout.w) * 10;
          const bottomY = (layout.y + layout.h) * 10;

          // Type assertion for templateGraph to handle optional properties
          const graph = templateGraph as any;

          return {
            top_xy_pos: `${topY}:${topX}`,
            bottom_xy_pos: `${bottomY}:${bottomX}`,
            frequency: graph.frequency || "5m",
            resolution: resolution || "1d",
            graph_id: graph.id,
            graph_name: graph.name,
            primary_kpi_id: graph.primaryKpi,
            secondary_kpis: graph.secondaryKpis.map((kpi: string) => ({
              kpi_id: kpi,
            })),
            systems: graph.systems || [],
          };
        })
        .filter(Boolean);

      // Prepare the payload for the API
      const payload = {
        user_id: "USER_TEST_1", // Default user ID
        template_id: currentTemplate.id,
        template_name: currentTemplate.name,
        template_desc: currentTemplate.description,
        default: currentTemplate.isDefault,
        favorite: currentTemplate.isFavorite,
        frequency: currentTemplate.frequency || "5m",
        systems: currentTemplate.systems.map((system) => ({
          system_id: system,
        })),
        graphs: updatedGraphs,
      };

      console.log("Saving template with updated layout:", payload);

      // Send the update to the API
      const response = await fetch(`https://shwsckbvbt.a.pinggy.link/api/ut`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to save template: ${response.statusText}`);
      }

      const result = await response.json();
      console.log("Template saved successfully:", result);

      toast.success("Dashboard layout saved successfully");
      setLayoutChanged(false);
    } catch (error) {
      console.error("Error saving layout:", error);
      toast.error("Failed to save layout", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedApiTemplate, charts, apiTemplates, layoutChanged, resolution]);

  // Add a new useEffect to apply theme changes to existing charts
  useEffect(() => {
    // Skip if no charts or if loading
    if (charts.length === 0 || isLoading) return;
    
    console.log(`Applying theme: ${selectedTheme} to ${charts.length} existing charts`);
    
    // Get the selected theme
    const theme = chartThemes[selectedTheme as keyof typeof chartThemes];
    if (!theme) return;
    
    // Create a copy of charts to avoid mutating state directly
    const updatedCharts = charts.map(chart => {
      // Create a deep copy of the chart to avoid mutation
      const updatedChart = {...chart};
      
      // If chart has kpiColors, update them with the new theme colors
      if ('kpiColors' in updatedChart && updatedChart.kpiColors) {
        // Create a deep copy of kpiColors
        updatedChart.kpiColors = {...updatedChart.kpiColors};
        
        // Update each KPI with the theme color
        const kpiEntries = Object.entries(updatedChart.kpiColors as Record<string, { color: string; name: string }>);
        kpiEntries.forEach(([kpiId, kpiInfo], colorIndex) => {
          if (kpiInfo && typeof kpiInfo === "object") {
            // Create a new copy of the kpiInfo object
            updatedChart.kpiColors![kpiId] = {
              ...kpiInfo,
              color: theme.colors[colorIndex % theme.colors.length]
            };
          }
        });
      }
      
      return updatedChart;
    });
    
    // Update charts with the new theme colors
    setCharts(updatedCharts);
    
    // Show a subtle notification
    toast.success(`Theme updated to ${theme.name}`, {
      duration: 2000,
      position: "bottom-right"
    });
  }, [selectedTheme]);

  // Modify the render dashboard content function to use content-only loading
  const renderDashboardContent = () => {
    if (isContentLoading) {
      return (
        <div className="flex items-center justify-center h-[70vh] w-full">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <div className="animate-pulse absolute inset-0 flex items-center justify-center text-xs text-primary font-medium">
              Loading...
            </div>
          </div>
        </div>
      );
    }
    
    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-[70vh] bg-card rounded-lg p-8 border border-border/50">
          <div className="text-destructive mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">Something went wrong</h3>
          <p className="text-center text-muted-foreground mb-4">{errorMessage || "Failed to load dashboard data."}</p>
          <Button 
            onClick={() => fetchTemplates()} 
            variant="outline" 
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      );
    }
    
    if (charts.length === 0) {
      return (
        <div className="flex items-center justify-center h-[70vh] bg-card rounded-lg p-8 border border-border/50">
          <div className="text-center max-w-lg">
            <h3 className="text-lg font-medium mb-2">No charts available</h3>
            <p className="text-muted-foreground mb-4">
              There are no charts to display for this template. Try selecting a different template or check your connection.
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="relative min-h-[70vh]">
        <DynamicLayout
          charts={charts}
          activeKPIs={activeKPIs}
          kpiColors={themedKpiColors}
          globalDateRange={globalDateRange}
          theme={chartThemes[selectedTheme as keyof typeof chartThemes]}
          resolution={resolution}
          onLayoutChange={handleLayoutChange}
        />
      </div>
    );
  };

  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only use template data if no API template is selected
  const selectedCharts = selectedApiTemplate
    ? charts
    : charts.filter((_, index) =>
        templateData[selectedTemplate as TemplateKey].charts.includes(index)
      );

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background/98 to-background/95 overflow-hidden">
      {/* <Sidebar /> */}
      <main className={`flex-1 overflow-y-auto transition-all duration-300`}>
        <div className="container mx-auto px-6 py-6 max-w-[1600px]">
          {/* Dashboard header with title and save button */}
          <div className="flex flex-col mb-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-between items-center bg-card/80 rounded-lg px-3 py-2 mb-4 shadow-sm border border-border/30"
            >
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-semibold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
                  SAP Analytics
              </h1>
                
                <div className="flex items-center gap-2">
                  {/* Template selector - compact design */}
                  <div className="flex items-center">
                <Select
                  value={selectedApiTemplate}
                  onValueChange={handleApiTemplateChange}
                  disabled={apiTemplates.length === 0}
                >
                      <SelectTrigger className="h-8 px-2 text-xs bg-background/50 min-w-[140px] border-muted">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {apiTemplates.map((template) => (
                      <SelectItem
                        key={template.id}
                        value={template.id}
                            className="text-xs"
                      >
                            <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        {template.isDefault && (
                                <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                            Default
                          </span>
                        )}
                        {template.isFavorite && (
                          <span className="text-yellow-500">★</span>
                        )}
                            </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                  {/* Theme selector - icon with dropdown */}
                  <div className="flex items-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8 border-muted bg-background/50 p-1.5">
                          <div className="relative w-full h-full rounded-full overflow-hidden">
                            <div className="absolute inset-0" style={{ 
                              background: `conic-gradient(${chartThemes[selectedTheme as keyof typeof chartThemes].colors[0]} 0%, 
                                           ${chartThemes[selectedTheme as keyof typeof chartThemes].colors[1]} 25%, 
                                           ${chartThemes[selectedTheme as keyof typeof chartThemes].colors[2]} 50%, 
                                           ${chartThemes[selectedTheme as keyof typeof chartThemes].colors[3]} 75%, 
                                           ${chartThemes[selectedTheme as keyof typeof chartThemes].colors[0]} 100%)` 
                            }}></div>
                            <div className="absolute inset-[30%] rounded-full bg-background shadow-sm"></div>
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[180px]">
                        <DropdownMenuLabel className="text-xs">Chart Theme</DropdownMenuLabel>
                    {Object.entries(chartThemes).map(([key, theme]) => (
                          <DropdownMenuItem 
                            key={key} 
                            className="flex items-center justify-between cursor-pointer text-xs"
                            onClick={() => setSelectedTheme(key)}
                          >
                        <div className="flex items-center gap-2">
                              <div className="relative w-5 h-5 rounded-full overflow-hidden">
                                <div className="absolute inset-0" style={{ 
                                  background: `conic-gradient(${theme.colors[0]} 0%, 
                                               ${theme.colors[1]} 25%, 
                                               ${theme.colors[2]} 50%, 
                                               ${theme.colors[3]} 75%, 
                                               ${theme.colors[0]} 100%)` 
                                }}></div>
                                <div className="absolute inset-[30%] rounded-full bg-background shadow-sm"></div>
                          </div>
                              <span>{theme.name}</span>
                        </div>
                            {selectedTheme === key && (
                              <Check className="h-3 w-3 text-primary" />
                            )}
                          </DropdownMenuItem>
                    ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
              </div>

                  {/* Resolution selector - compact dropdown */}
                  <div className="flex items-center">
                  <Select
                    value={resolution}
                    onValueChange={handleResolutionChange}
                  >
                      <SelectTrigger className="h-8 px-2 text-xs bg-background/50 min-w-[120px] border-muted">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                      <SelectValue placeholder="Resolution" />
                        </div>
                    </SelectTrigger>
                      <SelectContent>
                      {resolutionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} className="text-xs">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>

                  {/* Date Range - compact inline design */}
                  <div className="flex items-center">
                    <DateRangePicker
                      date={globalDateRange}
                      onDateChange={setGlobalDateRange}
                      align="end"
                      className="w-auto"
                      showTime={false}
                    />
                  </div>

                  {/* Auto-refresh dropdown button with enhanced timer display */}
                  <div className="relative">
                    {/* Timer display above the refresh button */}
                    {autoRefreshInterval && timeRemaining !== null && (
                      <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-10 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded-sm font-medium whitespace-nowrap shadow-sm">
                        {formatTimeRemaining()}
                      </div>
                    )}
                    
                    <DropdownMenu open={autoRefreshDropdownOpen} onOpenChange={setAutoRefreshDropdownOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button
                    disabled={isRefreshing}
                          variant="outline"
                          size="icon"
                    className={cn(
                            "h-8 w-8 rounded-md border relative bg-background/50 border-muted",
                            autoRefreshInterval && "ring-1 ring-primary/40",
                      isRefreshing && "opacity-70 cursor-not-allowed"
                    )}
                          title={autoRefreshInterval ? `Auto-refresh: ${formatTimeRemaining()}` : "Refresh data"}
                          aria-label={autoRefreshInterval ? `Auto-refresh: ${formatTimeRemaining()}` : "Refresh data"}
                  >
                    {isRefreshing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          ) : (
                            <>
                              <RefreshCw className={cn(
                                "h-3.5 w-3.5",
                                autoRefreshInterval ? "text-primary" : "text-muted-foreground"
                              )} />
                              {autoRefreshInterval && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <svg className="w-7 h-7" viewBox="0 0 100 100">
                                    <circle 
                                      className="text-primary/20 fill-none" 
                                      cx="50" 
                                      cy="50" 
                                      r="40" 
                                      strokeWidth="8"
                                      stroke="currentColor"
                                    />
                                    <circle 
                                      className="text-primary fill-none" 
                                      cx="50" 
                                      cy="50" 
                                      r="40" 
                                      strokeWidth="8"
                                      stroke="currentColor"
                                      strokeDasharray={`${2.51 * getProgressPercentage()} 251`}
                                      transform="rotate(-90 50 50)"
                                    />
                                  </svg>
                                </div>
                              )}
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" sideOffset={4} className="w-[220px]">
                        <DropdownMenuItem 
                          className="flex items-center justify-between cursor-pointer text-xs" 
                          onClick={() => handleManualRefresh(false)}
                        >
                          <span className="mr-4">Refresh now</span>
                          <RefreshCw className="h-3 w-3" />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        
                        {/* Auto-refresh toggle switch */}
                        <div className="px-2 py-1.5 flex items-center justify-between">
                          <span className="text-xs font-medium">Auto-refresh</span>
                          <Switch 
                            checked={isAutoRefreshEnabled}
                            onCheckedChange={(checked) => {
                              setIsAutoRefreshEnabled(checked);
                              
                              if (checked) {
                                // If turning ON auto-refresh
                                if (autoRefreshInterval) {
                                  // Use existing interval if set
                                  const option = autoRefreshOptions.find(opt => opt.value === autoRefreshInterval);
                                  toast.success(`Auto-refresh enabled - will refresh every ${option?.label || `${autoRefreshInterval}s`}`);
                                  // Start the timer if not already running
                                  if (!nextRefreshTime) {
                                    handleSelectAutoRefresh(autoRefreshInterval);
                                  }
                                } else {
                                  // Default to 5 minutes
                                  handleSelectAutoRefresh(300);
                                }
                              } else {
                                // If turning OFF auto-refresh but keeping current timer
                                if (autoRefreshInterval && nextRefreshTime) {
                                  toast.success(`Auto-refresh disabled - will refresh once more, then stop`);
                                } else {
                                  // Stop everything if no timer
                                  stopAutoRefresh();
                                }
                              }
                            }}
                            className="ml-auto"
                          />
                </div>

                        <DropdownMenuLabel className="text-xs mt-1">Refresh interval:</DropdownMenuLabel>
                        {autoRefreshOptions.map((option) => (
                          <DropdownMenuItem 
                            key={option.value}
                            className="flex items-center justify-between cursor-pointer text-xs"
                            onClick={() => handleSelectAutoRefresh(option.value)}
                          >
                            <span>{option.label}</span>
                            {autoRefreshInterval === option.value && (
                              <Check className="h-3 w-3 ml-2 text-primary" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
              </div>

                  {/* Only show save button when layout has changed */}
                  {layoutChanged && (
                    <Button
                      onClick={saveLayout}
                      disabled={!layoutChanged || isSaving}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 px-2 text-xs flex items-center gap-1.5 ml-1 bg-background/50 border-muted",
                        isSaving && "opacity-70 cursor-not-allowed"
                      )}
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>{isSaving ? "Saving..." : "Save"}</span>
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                {/* This empty div maintains the space on the right side for toast messages */}
              </div>
            </motion.div>
          </div>

          {/* Charts grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid gap-6 mt-4"
          >
            {renderDashboardContent()}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
