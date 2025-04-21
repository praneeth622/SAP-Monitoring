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
import {
  fetchTemplateChartData,
  generateDummyData,
  generateMultipleDataSets,
} from "@/utils/data";
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
import { useSearchParams } from "next/navigation";

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
  resolution?: string[] | string;
}

// Interface for normalized template
interface NormalizedTemplate {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  isFavorite: boolean;
  frequency: string;
  resolution: string;
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
    name: "Default",
    colors: ["#3B82F6", "#8B5CF6", "#EC4899", "#10B981", "#F59E0B"],
  },
  ocean: {
    name: "Ocean",
    colors: ["#0EA5E9", "#0D9488", "#0284C7", "#0369A1", "#0C4A6E"],
  },
  forest: {
    name: "Forest",
    colors: ["#22C55E", "#15803D", "#84CC16", "#4D7C0F", "#166534"],
  },
  sunset: {
    name: "Sunset",
    colors: ["#F97316", "#EA580C", "#DC2626", "#9F1239", "#7C2D12"],
  },
};

// Update DynamicLayout component props to include useDynamicLayout
declare module "@/components/charts/DynamicLayout" {
  interface DynamicLayoutProps {
    charts: ChartConfig[];
    activeKPIs: Set<string>;
    kpiColors: Record<string, any>;
    globalDateRange?: DateRange;
    theme: ChartTheme;
    resolution: string;
    onLayoutChange?: (layout: any) => void;
    templateId?: string;
    templateData?: any;
    useDynamicLayout?: boolean;
  }
}

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

// Helper function to normalize API template with better layout handling
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
  const resolution = template.resolution
    ? Array.isArray(template.resolution)
      ? template.resolution[0]
      : template.resolution
    : "auto";

  // Extract systems
  const systems = template.systems?.map((system) => system.system_id) || [];

  // Extract and transform graphs with careful layout handling
  const graphs =
    template.graphs?.map((graph) => {
      // Parse position data with validation
      const topPos = graph.top_xy_pos?.split(":").map(Number) || [0, 0];
      const bottomPos = graph.bottom_xy_pos?.split(":").map(Number) || [0, 0];

      // Ensure we have valid numbers for positions
      const [topY, topX] = topPos.length === 2 ? topPos : [0, 0];
      const [bottomY, bottomX] = bottomPos.length === 2 ? bottomPos : [0, 0];

      // Validate and calculate width and height
      const width = bottomX > topX ? bottomX - topX : 40; // Default to 4 grid units if invalid
      const height = bottomY > topY ? bottomY - topY : 40; // Default to 4 grid units if invalid

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
          w: width / 10,
          h: height / 10,
        },
        type:
          graph.graph_type?.toLowerCase() === "bar"
            ? "bar"
            : ("line" as ChartType),
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
    resolution,
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
    kpiColors: {} as Record<
      string,
      { color: string; name: string; icon?: any }
    >,
    activeKPIs: new Set<string>(),
    layout: {
      x: 0,
      y: 0,
      w: 6,
      h: 4,
    },
  }));
};

// Update the generateChartsFromTemplate function to better handle dynamic layout
const generateChartsFromTemplate = async (
  template: NormalizedTemplate,
  resolution = "auto",
  dateRange = {
    from: new Date(new Date().setDate(new Date().getDate() - 7)),
    to: new Date(),
  }
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

  try {
    // Check if the graphs have saved layouts
    const hasSavedLayouts = template.graphs.some(graph => {
      // Validate that position data is meaningful
      const hasValidPosition = graph.position && 
        typeof graph.position.x === 'number' && 
        typeof graph.position.y === 'number' && 
        typeof graph.position.w === 'number' && 
        typeof graph.position.h === 'number';
      
      // Check if the position values are non-zero (a further indication this is a real saved layout)
      const hasNonZeroValues = hasValidPosition && 
        (graph.position.w > 0 && graph.position.h > 0);
        
      return hasValidPosition && hasNonZeroValues;
    });

    console.log(`Template has saved layouts: ${hasSavedLayouts}`);

    // Process each graph to fetch real data
    const chartPromises = template.graphs.map(async (graph, index) => {
      // Clean up KPI names
      const primaryKpi = graph.primaryKpi.toLowerCase();
      const secondaryKpis = graph.secondaryKpis.map((kpi) => kpi.toLowerCase());
      const allKpis = [primaryKpi, ...secondaryKpis];

      // Determine monitoring area - default to OS if not specified
      const monitoringArea = primaryKpi.includes("job") ? "JOBS" : "OS";

      // Determine the layout for this chart
      let position;
      
      if (hasSavedLayouts && graph.position && 
          graph.position.w > 0 && graph.position.h > 0) {
        // Use the saved layout from the template
        position = {
          x: graph.position.x,
          y: graph.position.y,
          w: graph.position.w,
          h: graph.position.h,
        };
      } else {
        // If there are no saved layouts, we'll let the dynamic layout handle it
        // by not setting a position
        position = undefined;
      }

      // Log position data for debugging
      console.log(`Graph ${graph.id} position:`, position || "Using dynamic layout");

      // Fetch real data from API
      try {
        const chartData = await fetchTemplateChartData(
          primaryKpi,
          secondaryKpis,
          monitoringArea,
          dateRange,
          resolution
        );

        // Create chart config with saved layout
        return {
          id: graph.id,
          title: graph.name,
          type: graph.type,
          data: chartData,
          activeKPIs: new Set(allKpis),
          kpiColors: globalKpiColors,
          layout: position, // This could be undefined, which is fine for dynamic layout
          width: 400,
          height: 300,
        };
      } catch (error) {
        console.error(`Error fetching data for graph ${graph.id}:`, error);
        // Return a chart with dummy data if API call fails
        return {
          id: graph.id,
          title: graph.name,
          type: graph.type,
          data: generateDummyData(allKpis),
          activeKPIs: new Set(allKpis),
          kpiColors: globalKpiColors,
          layout: position, // This could be undefined, which is fine for dynamic layout
          width: 400,
          height: 300,
        };
      }
    });

    const charts = await Promise.all(chartPromises);
    console.log("Generated charts:", charts);
    return charts;
  } catch (error) {
    console.error("Error generating charts from template:", error);
    throw error;
  }
};

// First, let's create a reusable retry function for API calls

/**
 * Generic function to retry failed API calls
 * @param fetchFn The async function that performs the API call
 * @param maxRetries Maximum number of retries (default: 2)
 * @param delayMs Delay between retries in milliseconds (default: 1000)
 * @returns The result of the successful API call
 */
const retryFetch = async <T,>(
  fetchFn: () => Promise<T>,
  maxRetries: number = 2,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Make the API call
      const result = await fetchFn();

      // If successful, return the result immediately
      return result;
    } catch (error) {
      // Store the error to throw if all retries fail
      lastError = error;

      // Log the retry attempt (except on the last attempt)
      if (attempt < maxRetries) {
        console.log(
          `API call failed, retrying (${attempt + 1}/${maxRetries})...`,
          error
        );

        // Wait before the next retry
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // If we've exhausted all retries, throw the last error
  throw lastError;
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
  const [currentBreakpoint, setCurrentBreakpoint] = useState("lg");

  // Add timer-related states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number | null>(
    null
  );
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

  // Modify the refresh data function with better error handling

  const refreshData = useCallback(async () => {
    if (refreshingRef.current) return;

    try {
      setIsRefreshing(true);
      console.log("Refreshing data...");

      // Delay to show loading state briefly for better visual feedback
      await new Promise((resolve) => setTimeout(resolve, 300));

      // If a template is selected, reload that template's data
      if (selectedApiTemplate) {
        try {
          console.log(`Refreshing template: ${selectedApiTemplate}`);

          // Re-fetch the template data from API to ensure we have the latest
          const data = await retryFetch(async () => {
            const response = await fetch(
              `https://shwsckbvbt.a.pinggy.link/api/ut?templateId=${selectedApiTemplate}`
            );

            if (!response.ok) {
              throw new Error(
                `Failed to refresh template: ${response.statusText}`
              );
            }

            const responseData = await response.json();

            if (!responseData || !responseData.length) {
              throw new Error("Empty response when refreshing template");
            }

            return responseData;
          });

          // Normalize the template
          const refreshedTemplate = normalizeTemplate(data[0]);

          // Create date range from the global date range
          const dateRangeForAPI = {
            from:
              globalDateRange?.from ||
              new Date(new Date().setDate(new Date().getDate() - 7)),
            to: globalDateRange?.to || new Date(),
          };

          // Generate charts from the refreshed template
          const refreshedCharts = await generateChartsFromTemplate(
            refreshedTemplate,
            resolution,
            dateRangeForAPI
          );

          // Make sure we have an array before updating charts
          if (Array.isArray(refreshedCharts) && refreshedCharts.length > 0) {
            // Preserve existing layouts when updating charts
            setCharts((prevCharts) => {
              return refreshedCharts.map((newChart) => {
                // Find matching chart in previous charts to preserve layout
                const matchingChart = prevCharts.find(
                  (c) => c.id === newChart.id
                );
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
          } else {
            console.warn(
              "No charts returned after refresh, keeping existing charts"
            );
          }

          toast.success("Dashboard refreshed successfully");
        } catch (error) {
          console.error("Error refreshing template:", error);
          toast.error("Failed to refresh template data");
        }
      } else {
        // No template selected, refresh with generated data
        const newCharts = generateChartConfigs(resolution);

        // Preserve existing layouts
        setCharts((prevCharts) => {
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
            console.log(
              `Auto-refresh enabled: Setting up next timer for ${currentInterval} seconds`
            );
            const now = new Date();
            const nextTime = new Date(now.getTime() + currentInterval * 1000);
            setNextRefreshTime(nextTime);
            setTimeRemaining(currentInterval);
          } else {
            // If auto-refresh is disabled, stop the timer after this refresh
            console.log(
              "Auto-refresh disabled: Stopping timer after this refresh"
            );
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
    isAutoRefreshEnabled,
    globalDateRange,
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
          if (typeof refreshData === "function") {
            refreshData();
          } else if (refreshDataRef.current) {
            refreshDataRef.current();
          }
        }
      } else if (nextTime) {
        // Just update countdown display
        const diff = Math.max(
          0,
          Math.round((nextTime.getTime() - currentTime.getTime()) / 1000)
        );
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
  const handleSelectAutoRefresh = useCallback(
    (seconds: number) => {
      // Always set the interval value
      setAutoRefreshInterval(seconds);
      setAutoRefreshDropdownOpen(false);

      // Always set up the timer when selecting an interval
      const now = new Date();
      const nextTime = new Date(now.getTime() + seconds * 1000);
      setNextRefreshTime(nextTime);
      setTimeRemaining(seconds);

      // Different message based on auto-refresh state
      const option = autoRefreshOptions.find((opt) => opt.value === seconds);
      if (option) {
        if (isAutoRefreshEnabled) {
          toast.success(`Auto-refresh set to ${option.label}`);
        } else {
          toast.success(`Will refresh once in ${option.label}`);
        }
      }
    },
    [autoRefreshOptions, isAutoRefreshEnabled]
  );

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
  const handleManualRefresh = useCallback(
    (closeDropdown: boolean = true) => {
      if (closeDropdown) {
        setAutoRefreshDropdownOpen(false);
      }
      refreshData();
    },
    [refreshData]
  );

  // Calculate progress percentage for circular indicator
  const getProgressPercentage = useCallback(() => {
    if (!nextRefreshTime || !autoRefreshInterval) return 0;

    const now = new Date();
    const diffMs = nextRefreshTime.getTime() - now.getTime();

    if (diffMs <= 0) return 100;

    const elapsedMs = autoRefreshInterval * 1000 - diffMs;
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

  const fetchTemplateForEditing = async (templateId: string) => {
    try {
      setIsLoading(true);

      const baseUrl = "https://shwsckbvbt.a.pinggy.link";

      // Use retry logic for template fetching
      const data = await retryFetch(async () => {
        const response = await fetch(
          `${baseUrl}/api/ut?templateId=${templateId}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch template for editing");
        }

        const responseData = await response.json();

        if (!responseData || !responseData.length) {
          throw new Error("Template not found");
        }

        return responseData;
      });

      // Extract the template data
      const template = data[0];

      // Extract system ID correctly from the API response
      let systemId = "";

      if (template.systems && template.systems.length > 0) {
        systemId = template.systems[0].system_id || "";
        console.log("Found system ID in template:", systemId);
      } else {
        console.warn("No systems found in template data");
      }

      // Extract and set the resolution from the template
      if (template.resolution) {
        const templateResolution = Array.isArray(template.resolution)
          ? template.resolution[0]
          : template.resolution;
        console.log("Setting resolution from template:", templateResolution);
        setResolution(templateResolution);
      }

      // Force a layout refresh with a slight delay to ensure proper sizing
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 200);

      toast.success("Template loaded successfully");
    } catch (error) {
      console.error("Error fetching template for editing:", error);
      toast.error("Failed to load template for editing", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add fetchTemplateById function before fetchTemplates
  const fetchTemplateById = useCallback(async (templateId: string) => {
    try {
      setIsContentLoading(true);
      setHasError(false);
      setErrorMessage(null);

      console.log(`Fetching template with ID: ${templateId}`);

      const data = await retryFetch(async () => {
        const response = await fetch(
          `https://shwsckbvbt.a.pinggy.link/api/ut?templateId=${templateId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch template: ${response.statusText}`);
        }

        const responseData = await response.json();

        if (!responseData || !responseData.length) {
          throw new Error("Template not found");
        }

        return responseData;
      });

      // Normalize the template
      const template = normalizeTemplate(data[0]);

      // Create date range from the global date range
      const dateRangeForAPI = {
        from: globalDateRange?.from || new Date(new Date().setDate(new Date().getDate() - 7)),
        to: globalDateRange?.to || new Date(),
      };

      // Generate charts from the template
      console.log(`Generating charts for template "${template.name}" with resolution ${resolution}`);
      const newCharts = await generateChartsFromTemplate(
        template,
        resolution,
        dateRangeForAPI
      );

      // Update charts
      if (Array.isArray(newCharts) && newCharts.length > 0) {
        setCharts(newCharts);
      } else {
        console.warn("No charts returned from template, showing empty dashboard");
        setCharts([]);
      }

      // Force a layout refresh
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 200);

    } catch (error) {
      console.error("Error fetching template by ID:", error);
      setHasError(true);
      setErrorMessage(
        error instanceof Error
          ? `Failed to load template: ${error.message}`
          : "Failed to load template. Please try again."
      );
      toast.error("Failed to load template", {
        description: error instanceof Error ? error.message : "Please try again",
      });
      
      setCharts([]);
    } finally {
      setTimeout(() => setIsContentLoading(false), 300);
    }
  }, [resolution, globalDateRange, setCharts, setIsContentLoading, setHasError, setErrorMessage, generateChartsFromTemplate]);

  // Now your fetchTemplates function can use fetchTemplateById
  const fetchTemplates = useCallback(async () => {
    try {
      // Only set content loading to true, keep header interactive
      setIsContentLoading(true);
      // Reset error states when starting a new fetch
      setHasError(false);
      setErrorMessage(null);

      console.log("Fetching templates from API...");

      const data = await retryFetch(async () => {
        const response = await fetch(
          `https://shwsckbvbt.a.pinggy.link/api/utl?userId=USER_TEST_1`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch templates: ${response.statusText}`);
        }

        return response.json();
      });

      console.log("Templates API response:", data);

      // Process templates as before...
      let normalizedTemplates: NormalizedTemplate[] = [];
      if (!Array.isArray(data) || data.length === 0) {
        setHasError(true);
        setErrorMessage(
          "No templates available. No templates were found for this user."
        );
        toast.error("No templates available", {
          description: "No templates were found for this user.",
          duration: 5000,
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

        // Now use the properly defined fetchTemplateById function
        await fetchTemplateById(defaultTemplate.id);
      } else if (normalizedTemplates.length > 0) {
        // If no default, use the first template
        const firstTemplate = normalizedTemplates[0];
        console.log(
          `No default template found, using first template: "${firstTemplate.name}"`
        );
        setSelectedApiTemplate(firstTemplate.id);

        // Now use the properly defined fetchTemplateById function
        await fetchTemplateById(firstTemplate.id);
      } else {
        console.log("No templates found");
        setHasError(true);
        setErrorMessage(
          "No templates available. No templates were found for this user."
        );
        toast.error("No templates available", {
          description: "No templates were found for this user.",
          duration: 5000,
        });
        setCharts([]);
        setTimeout(() => setIsContentLoading(false), 300);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      setHasError(true);
      setErrorMessage(
        "Failed to fetch templates. Unable to connect to the server. Please check your connection and try again."
      );
      toast.error("Failed to fetch templates", {
        description:
          error instanceof Error
            ? error.message
            : "Unable to connect to the server. Please check your connection and try again.",
        duration: 5000,
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
        setErrorMessage(
          "Failed to initialize dashboard. Please check your connection and try again."
        );
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

  // Update the handleApiTemplateChange function to correctly preserve layouts
  const handleApiTemplateChange = useCallback(
    (templateId: string) => {
      if (templateId === selectedApiTemplate) return;

      console.log(
        `Changing template from ${selectedApiTemplate} to ${templateId}`
      );
      setSelectedApiTemplate(templateId);
      setIsContentLoading(true);

      // Explicitly call fetchTemplateById to ensure loading the new template
      fetchTemplateById(templateId).catch((error) => {
        console.error("Error fetching template:", error);
        toast.error("Failed to load template");
        setIsContentLoading(false);
      });
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
            const nextTime = new Date(
              now.getTime() + autoRefreshInterval * 1000
            );
            setNextRefreshTime(nextTime);
            setTimeRemaining(autoRefreshInterval);
          }

          // Create date range from the global date range
          const dateRangeForAPI = {
            from:
              globalDateRange?.from ||
              new Date(new Date().setDate(new Date().getDate() - 7)),
            to: globalDateRange?.to || new Date(),
          };

          // If a template is selected, regenerate that template's charts with new resolution
          if (selectedApiTemplate) {
            console.log(
              `Updating template ${selectedApiTemplate} with ${newResolution} resolution`
            );

            // Find the current template
            const template = apiTemplates.find(
              (t) => t.id === selectedApiTemplate
            );

            if (template) {
              // Generate new charts with new resolution
              const newCharts = await generateChartsFromTemplate(
                template,
                newResolution,
                dateRangeForAPI
              );

              // Preserve existing layouts when updating charts (exact same approach as refreshData)
              setCharts((prevCharts) => {
                return newCharts.map((newChart) => {
                  // Find matching chart in previous charts to preserve layout
                  const matchingChart = prevCharts.find(
                    (c) => c.id === newChart.id
                  );
                  if (matchingChart) {
                    return {
                      ...newChart,
                      layout: matchingChart.layout,
                      // Preserve active KPIs and colors for visual consistency
                      activeKPIs:
                        matchingChart.activeKPIs || newChart.activeKPIs,
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
            setCharts((prevCharts) => {
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
              resolutionOptions.find((opt) => opt.value === newResolution)
                ?.label || newResolution
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
    [
      resolution,
      selectedApiTemplate,
      apiTemplates,
      autoRefreshInterval,
      nextRefreshTime,
      globalDateRange,
    ]
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

  const saveLayout = useCallback(async () => {
    if (!selectedApiTemplate) {
      console.warn("No template selected, cannot save layout");
      return;
    }

    try {
      // Get current layout from charts
      const currentLayout = charts.map((chart) => {
        // Use default layout if chart.layout is undefined
        const layout = chart.layout || {
          x: 0,
          y: 0,
          w: 4,
          h: 4,
        };

        return {
          graph_id: chart.id,
          graph_name: chart.title,
          top_xy_pos: `${layout.y * 10}:${layout.x * 10}`,
          bottom_xy_pos: `${(layout.y + layout.h) * 10}:${
            (layout.x + layout.w) * 10
          }`,
          primary_kpi_id: Array.isArray(chart.activeKPIs)
            ? chart.activeKPIs[0] || ""
            : Array.from(chart.activeKPIs || new Set())[0] || "",
          secondary_kpis: Array.isArray(chart.activeKPIs)
            ? chart.activeKPIs.slice(1).map((kpiId) => ({ kpi_id: kpiId }))
            : Array.from(chart.activeKPIs || new Set())
                .slice(1)
                .map((kpiId) => ({ kpi_id: kpiId })),
          frequency: "5m",
          resolution: "1d",
          systems: [],
        };
      });

      const payload = {
        template_id: selectedApiTemplate,
        graphs: currentLayout,
      };

      const response = await fetch("/api/templates/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save layout");
      }

      const data = await response.json();
      console.log("Layout saved successfully:", data);
      setLayoutChanged(false);
    } catch (error) {
      console.error("Error saving layout:", error);
    }
  }, [charts, selectedApiTemplate]);

  // Modify the handleLayoutChange function
  const handleLayoutChange = useCallback(
    (newLayout: any) => {
      console.log("Layout changed:", newLayout);
      
      // Skip layout updates during content loading
      if (isContentLoading) {
        console.log("Skipping layout update during content loading");
        return;
      }

      // Update the charts with new layouts immediately
      setCharts((prevCharts) => {
        return prevCharts.map((chart) => {
          const newLayoutItem = newLayout.find((l: any) => l.i === chart.id);
          if (newLayoutItem) {
            // Only log substantial changes to reduce noise
            if (!chart.layout || 
                chart.layout.x !== newLayoutItem.x || 
                chart.layout.y !== newLayoutItem.y ||
                chart.layout.w !== newLayoutItem.w ||
                chart.layout.h !== newLayoutItem.h) {
                
              console.log(`Updating layout for chart ${chart.id}:`, {
                x: newLayoutItem.x,
                y: newLayoutItem.y,
                w: newLayoutItem.w,
                h: newLayoutItem.h,
              });
            }

            return {
              ...chart,
              layout: {
                x: newLayoutItem.x,
                y: newLayoutItem.y,
                w: newLayoutItem.w,
                h: newLayoutItem.h,
              },
            };
          }
          return chart;
        });
      });

      // Only mark layout as changed for meaningful updates
      const isSignificantChange = newLayout.some((item: any) => {
        const chart = charts.find(c => c.id === item.i);
        if (!chart || !chart.layout) return true;
        
        return chart.layout.x !== item.x ||
               chart.layout.y !== item.y ||
               chart.layout.w !== item.w ||
               chart.layout.h !== item.h;
      });
      
      if (isSignificantChange) {
        setLayoutChanged(true);
        console.log("Layout has been modified by user");
        
        // Auto-save the layout after a delay
        const saveTimeout = setTimeout(async () => {
          try {
            await saveLayout();
          } catch (error) {
            console.error("Error auto-saving layout:", error);
          }
        }, 1000);
        
        return () => clearTimeout(saveTimeout);
      }
    },
    [charts, isContentLoading, saveLayout]
  );

  // Add this function to handle theme changes without resetting template
  const handleThemeChange = useCallback((themeKey: string) => {
    setSelectedTheme(themeKey);
    const newTheme = chartThemes[themeKey as keyof typeof chartThemes];

    // Update KPI colors without resetting the template
    setThemedKpiColors((prevColors) => {
      const updatedColors = { ...prevColors };
      Object.entries(updatedColors).forEach(([kpi, kpiInfo], index) => {
        if (kpiInfo && typeof kpiInfo === "object") {
          updatedColors[kpi as keyof typeof kpiColors] = {
            ...kpiInfo,
            color: newTheme.colors[index % newTheme.colors.length],
          };
        }
      });
      return updatedColors;
    });

    // Update existing charts' colors without resetting the template
    setCharts((prevCharts) => {
      return prevCharts.map((chart) => {
        const updatedKpiColors = { ...chart.kpiColors };
        Object.entries(updatedKpiColors).forEach(([kpi, kpiInfo], index) => {
          if (kpiInfo && typeof kpiInfo === "object") {
            updatedKpiColors[kpi] = {
              ...kpiInfo,
              color: newTheme.colors[index % newTheme.colors.length],
            };
          }
        });
        return {
          ...chart,
          kpiColors: updatedKpiColors,
        };
      });
    });
  }, []);

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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-4"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2">Something went wrong</h3>
          <p className="text-center text-muted-foreground mb-4">
            {errorMessage || "Failed to load dashboard data."}
          </p>
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
              There are no charts to display for this template. Try selecting a
              different template or check your connection.
            </p>
          </div>
        </div>
      );
    }

    // Check if these charts have saved layouts
    const hasSavedLayouts = charts.some(chart => !!chart.layout);

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
          templateId={selectedApiTemplate}
          templateData={{
            template_id: selectedApiTemplate,
            template_name:
              apiTemplates.find((t) => t.id === selectedApiTemplate)?.name ||
              "",
            template_desc:
              apiTemplates.find((t) => t.id === selectedApiTemplate)
                ?.description || "",
            default:
              apiTemplates.find((t) => t.id === selectedApiTemplate)
                ?.isDefault || false,
            favorite:
              apiTemplates.find((t) => t.id === selectedApiTemplate)
                ?.isFavorite || false,
            frequency:
              apiTemplates.find((t) => t.id === selectedApiTemplate)
                ?.frequency || "5m",
            systems:
              apiTemplates.find((t) => t.id === selectedApiTemplate)?.systems ||
              [],
            graphs: charts.map((chart) => {
              const templateGraph = apiTemplates
                .find((t) => t.id === selectedApiTemplate)
                ?.graphs.find((g) => g.id === chart.id);
              return {
                graph_id: chart.id,
                graph_name: chart.title,
                primary_kpi_id:
                  Array.from(chart.activeKPIs || new Set<string>())[0] || "",
                secondary_kpis: Array.from(
                  chart.activeKPIs || new Set<string>()
                )
                  .slice(1)
                  .map((kpi) => ({ kpi_id: kpi })),
                frequency: "5m",
                resolution: "1d",
                systems: [],
                top_xy_pos: chart.layout 
                  ? `${chart.layout.y * 10}:${chart.layout.x * 10}` 
                  : "0:0",
                bottom_xy_pos: chart.layout 
                  ? `${(chart.layout.y + chart.layout.h) * 10}:${(chart.layout.x + chart.layout.w) * 10}` 
                  : "0:0",
              };
            }),
          }}
          useDynamicLayout={!hasSavedLayouts} // Tell DynamicLayout whether to use saved or dynamic layout
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
              className="flex justify-between items-center bg-card/80 rounded-lg px-4 py-3 mb-4 shadow-sm border border-border/30"
            >
              <div className="flex items-center gap-6">
                <h1 className="text-2xl font-semibold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
                  SAP Analytics
                </h1>

                <div className="flex items-center gap-4">
                  {/* Template selector */}
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground mb-1">
                      Template
                    </label>
                    <Select
                      value={selectedApiTemplate}
                      onValueChange={handleApiTemplateChange}
                      disabled={apiTemplates.length === 0}
                    >
                      <SelectTrigger className="h-8 px-2 text-xs bg-background/50 min-w-[140px] border-muted">
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* First group: Favorite + Default templates */}
                        {apiTemplates
                          .filter(
                            (template) =>
                              template.isFavorite && template.isDefault
                          )
                          .map((template) => (
                            <SelectItem
                              key={template.id}
                              value={template.id}
                              className="text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span>{template.name}</span>
                                <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                                  Default
                                </span>
                                <span className="text-yellow-500">★</span>
                              </div>
                            </SelectItem>
                          ))}

                        {/* Second group: Only Default templates (excluding those already shown) */}
                        {apiTemplates
                          .filter(
                            (template) =>
                              template.isDefault && !template.isFavorite
                          )
                          .map((template) => (
                            <SelectItem
                              key={template.id}
                              value={template.id}
                              className="text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span>{template.name}</span>
                                <span className="ml-1 inline-flex items-center px-1 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-800">
                                  Default
                                </span>
                              </div>
                            </SelectItem>
                          ))}

                        {/* Third group: Only Favorite templates (excluding those already shown) */}
                        {apiTemplates
                          .filter(
                            (template) =>
                              template.isFavorite && !template.isDefault
                          )
                          .map((template) => (
                            <SelectItem
                              key={template.id}
                              value={template.id}
                              className="text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span>{template.name}</span>
                                <span className="text-yellow-500">★</span>
                              </div>
                            </SelectItem>
                          ))}

                        {/* Fourth group: Normal templates (neither default nor favorite) */}
                        {apiTemplates
                          .filter(
                            (template) =>
                              !template.isDefault && !template.isFavorite
                          )
                          .map((template) => (
                            <SelectItem
                              key={template.id}
                              value={template.id}
                              className="text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span>{template.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Theme selector */}
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground mb-1">
                      Theme
                    </label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 flex items-center gap-2"
                        >
                          <div className="relative w-5 h-5">
                            <svg
                              viewBox="0 0 100 100"
                              className="w-full h-full"
                            >
                              {chartThemes[
                                selectedTheme as keyof typeof chartThemes
                              ].colors.map((color, index) => {
                                const angle = index * 72 - 90; // 72 degrees per segment (360/5)
                                const nextAngle = (index + 1) * 72 - 90;
                                const x1 =
                                  50 + 50 * Math.cos((angle * Math.PI) / 180);
                                const y1 =
                                  50 + 50 * Math.sin((angle * Math.PI) / 180);
                                const x2 =
                                  50 +
                                  50 * Math.cos((nextAngle * Math.PI) / 180);
                                const y2 =
                                  50 +
                                  50 * Math.sin((nextAngle * Math.PI) / 180);
                                return (
                                  <path
                                    key={index}
                                    d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                                    fill={color}
                                  />
                                );
                              })}
                            </svg>
                          </div>
                          <span>
                            {
                              chartThemes[
                                selectedTheme as keyof typeof chartThemes
                              ].name
                            }
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[200px]">
                        <DropdownMenuLabel>Chart Theme</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {Object.entries(chartThemes).map(([key, theme]) => (
                          <DropdownMenuItem
                            key={key}
                            onClick={() => handleThemeChange(key)}
                            className="flex items-center gap-2"
                          >
                            <div className="relative w-5 h-5">
                              <svg
                                viewBox="0 0 100 100"
                                className="w-full h-full"
                              >
                                {theme.colors.map((color, index) => {
                                  const angle = index * 72 - 90; // 72 degrees per segment (360/5)
                                  const nextAngle = (index + 1) * 72 - 90;
                                  const x1 =
                                    50 + 50 * Math.cos((angle * Math.PI) / 180);
                                  const y1 =
                                    50 + 50 * Math.sin((angle * Math.PI) / 180);
                                  const x2 =
                                    50 +
                                    50 * Math.cos((nextAngle * Math.PI) / 180);
                                  const y2 =
                                    50 +
                                    50 * Math.sin((nextAngle * Math.PI) / 180);
                                  return (
                                    <path
                                      key={index}
                                      d={`M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`}
                                      fill={color}
                                    />
                                  );
                                })}
                              </svg>
                            </div>
                            <span>{theme.name}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Resolution selector */}
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground mb-1">
                      Resolution
                    </label>
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
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="text-xs"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range */}
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground mb-1">
                      Date Range
                    </label>
                    <DateRangePicker
                      date={globalDateRange}
                      onDateChange={setGlobalDateRange}
                      align="end"
                      className="w-auto"
                      showTime={true}
                    />
                  </div>

                  {/* Auto-refresh dropdown */}
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground mb-1"></label>
                    <div className="relative">
                      {autoRefreshInterval && timeRemaining !== null && (
                        <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-10 bg-primary text-primary-foreground text-[9px] px-1.5 py-0.5 rounded-sm font-medium whitespace-nowrap shadow-sm">
                          {formatTimeRemaining()}
                        </div>
                      )}

                      <DropdownMenu
                        open={autoRefreshDropdownOpen}
                        onOpenChange={setAutoRefreshDropdownOpen}
                      >
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
                          >
                            {isRefreshing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                            ) : (
                              <>
                                <RefreshCw
                                  className={cn(
                                    "h-3.5 w-3.5",
                                    autoRefreshInterval
                                      ? "text-primary"
                                      : "text-muted-foreground"
                                  )}
                                />
                                {autoRefreshInterval && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <svg
                                      className="w-7 h-7"
                                      viewBox="0 0 100 100"
                                    >
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
                                        strokeDasharray={`${
                                          2.51 * getProgressPercentage()
                                        } 251`}
                                        transform="rotate(-90 50 50)"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          sideOffset={4}
                          className="w-[220px]"
                        >
                          <DropdownMenuItem
                            className="flex items-center justify-between cursor-pointer text-xs"
                            onClick={() => handleManualRefresh(false)}
                          >
                            <span className="mr-4">Refresh now</span>
                            <RefreshCw className="h-3 w-3" />
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <div className="px-2 py-1.5 flex items-center justify-between">
                            <span className="text-xs font-medium">
                              Auto-refresh
                            </span>
                            <Switch
                              checked={isAutoRefreshEnabled}
                              onCheckedChange={(checked) => {
                                setIsAutoRefreshEnabled(checked);
                                if (checked) {
                                  if (autoRefreshInterval) {
                                    const option = autoRefreshOptions.find(
                                      (opt) => opt.value === autoRefreshInterval
                                    );
                                    toast.success(
                                      `Auto-refresh enabled - will refresh every ${
                                        option?.label ||
                                        `${autoRefreshInterval}s`
                                      }`
                                    );
                                    if (!nextRefreshTime) {
                                      handleSelectAutoRefresh(
                                        autoRefreshInterval
                                      );
                                    }
                                  } else {
                                    handleSelectAutoRefresh(300);
                                  }
                                } else {
                                  if (autoRefreshInterval && nextRefreshTime) {
                                    toast.success(
                                      `Auto-refresh disabled - will refresh once more, then stop`
                                    );
                                  } else {
                                    stopAutoRefresh();
                                  }
                                }
                              }}
                              className="ml-auto"
                            />
                          </div>
                          <DropdownMenuLabel className="text-xs mt-1">
                            Refresh interval:
                          </DropdownMenuLabel>
                          {autoRefreshOptions.map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              className="flex items-center justify-between cursor-pointer text-xs"
                              onClick={() =>
                                handleSelectAutoRefresh(option.value)
                              }
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
                  </div>

                  {/* Save button */}
                  {layoutChanged && selectedTemplate && (
                    <div className="flex flex-col">
                      <label className="text-xs text-muted-foreground mb-1">
                        Save Layout
                      </label>
                      <Button
                        onClick={saveLayout}
                        disabled={
                          !layoutChanged || isSaving || !selectedTemplate
                        }
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 px-2 text-xs flex items-center gap-1.5 bg-background/50 border-muted",
                          isSaving && "opacity-70 cursor-not-allowed"
                        )}
                      >
                        {isSaving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="h-3.5 w-3.5" />
                        )}
                        <span>{isSaving ? "Saving..." : "Save Layout"}</span>
                      </Button>
                    </div>
                  )}
                </div>
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
