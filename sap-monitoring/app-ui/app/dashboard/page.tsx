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
  CalendarRange, // Add CalendarRange icon
} from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  fetchTemplateChartData,
  generateDummyData,
  generateMultipleDataSets,
} from "@/utils/data";
import React, {
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import { useTheme as useThemeContext } from "@/contexts/ThemeContext";
import { useTheme as useNextTheme } from "next-themes";
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
  TemplateKey,
  Template,
  ThemeKey,
  ChartTheme,
  Graph,
  TemplateConfig
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
import { addDays } from "date-fns";

// Helper function to safely access localStorage
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn("Error accessing localStorage:", error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn("Error writing to localStorage:", error);
    }
  },
};

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
    onDeleteGraph?: (id: string) => void;
    onEditGraph?: (id: string) => void;
    hideLayoutControls?: boolean;
    isEditMode?: boolean;
    onLayoutReset?: (newLayout: any) => Promise<void>;
    useDynamicLayout?: boolean;
    onSaveLayout?: () => void;
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
    graphs: [],
  },
  single: {
    id: "2",
    name: "Single Chart",
    description: "Detailed view of revenue analysis",
    charts: [0],
    graphs: [],
  },
  dual: {
    id: "3",
    name: "Two Charts",
    description: "Revenue and user growth comparison",
    charts: [0, 1],
    graphs: [],
  },
  triple: {
    id: "4",
    name: "Three Charts",
    description: "Key performance indicators",
    charts: [0, 1, 2],
    graphs: [],
  },
  quad: {
    id: "5",
    name: "Four Charts",
    description: "Four key metric dashboard",
    charts: [0, 1, 2, 3],
    graphs: [],
  },
  five: {
    id: "6",
    name: "Five Charts",
    description: "Comprehensive performance view",
    charts: [0, 1, 2, 3, 4],
    graphs: [],
  },
  six: {
    id: "7",
    name: "Six Charts",
    description: "Extended metrics overview",
    charts: [0, 1, 2, 3, 4, 5],
    graphs: [],
  },
  seven: {
    id: "8",
    name: "Seven Charts",
    description: "Detailed metrics dashboard",
    charts: [0, 1, 2, 3, 4, 5, 6],
    graphs: [],
  },
  eight: {
    id: "9",
    name: "Eight Charts",
    description: "Comprehensive analytics",
    charts: [0, 1, 2, 3, 4, 5, 6, 7],
    graphs: [],
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

  // Process each graph to fetch real data
  const chartPromises = template.graphs.map(async (graph, index) => {
    // Clean up KPI names and ensure we only include selected KPIs
    const primaryKpi = graph.primaryKpi.toLowerCase();
    const secondaryKpis = graph.secondaryKpis.map((kpi) => kpi.toLowerCase());
    const selectedKpis = [primaryKpi, ...secondaryKpis];

    // Create KPI colors only for selected KPIs
    selectedKpis.forEach((kpi, colorIndex) => {
      if (!globalKpiColors[kpi]) {
        globalKpiColors[kpi] = {
          color: theme.colors[colorIndex % theme.colors.length],
          name: kpi.charAt(0).toUpperCase() + kpi.slice(1), // Capitalize first letter
        };
      }
    });

    // Determine monitoring area - default to OS if not specified
    const monitoringArea = primaryKpi.includes("job") ? "JOBS" : "OS";

    // Determine the layout for this chart
    let position;
    if (graph.position && graph.position.w > 0 && graph.position.h > 0) {
      position = {
        x: graph.position.x,
        y: graph.position.y,
        w: graph.position.w,
        h: graph.position.h,
      };
    }

    try {
      // Fetch real data from API
      const chartData = await fetchTemplateChartData(
        primaryKpi,
        secondaryKpis,
        monitoringArea,
        dateRange,
        resolution
      );

      // Create chart config with only selected KPIs
      const chartKpiColors: Record<string, { color: string; name: string }> =
        {};
      selectedKpis.forEach((kpi) => {
        if (globalKpiColors[kpi]) {
          chartKpiColors[kpi] = globalKpiColors[kpi];
        }
      });

      return {
        id: graph.id,
        title: graph.name,
        type: graph.type,
        data: chartData,
        activeKPIs: new Set(selectedKpis), // Only include selected KPIs
        kpiColors: chartKpiColors, // Only include colors for selected KPIs
        layout: position,
        width: 400,
        height: 300,
      };
    } catch (error) {
      console.error(`Error fetching data for graph ${graph.id}:`, error);

      // Even for dummy data, maintain only selected KPIs
      const chartKpiColors: Record<string, { color: string; name: string }> =
        {};
      selectedKpis.forEach((kpi) => {
        if (globalKpiColors[kpi]) {
          chartKpiColors[kpi] = globalKpiColors[kpi];
        }
      });

      return {
        id: graph.id,
        title: graph.name,
        type: graph.type,
        data: generateDummyData(selectedKpis), // Generate dummy data only for selected KPIs
        activeKPIs: new Set(selectedKpis),
        kpiColors: chartKpiColors,
        layout: position,
        width: 400,
        height: 300,
      };
    }
  });

  try {
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

// Create a separate component for the dashboard content to prevent header from re-rendering
const DashboardContent = React.memo(
  ({
    charts,
    isContentLoading,
    hasError,
    errorMessage,
    fetchTemplates,
    activeKPIs,
    themedKpiColors,
    globalDateRange,
    selectedTheme,
    resolution,
    handleLayoutChange,
    selectedApiTemplate,
    apiTemplates,
    hasSavedLayouts,
    saveLayout,
  }: {
    charts: ChartConfig[];
    isContentLoading: boolean;
    hasError: boolean;
    errorMessage: string | null;
    fetchTemplates: () => void;
    activeKPIs: Set<string>;
    themedKpiColors: any;
    globalDateRange: DateRange | undefined;
    selectedTheme: string;
    resolution: string;
    handleLayoutChange: (layout: any) => void;
    selectedApiTemplate: string;
    apiTemplates: NormalizedTemplate[];
    hasSavedLayouts: boolean;
    saveLayout: () => Promise<void>;
  }) => {
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

    return (
      <div className="relative min-h-[70vh] ">
        <DynamicLayout
          charts={charts}
          activeKPIs={activeKPIs}
          kpiColors={themedKpiColors}
          globalDateRange={globalDateRange}
          theme={chartThemes[selectedTheme as keyof typeof chartThemes]} // Ensure this resolves to a valid theme object
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
                  ? `${(chart.layout.y + chart.layout.h) * 10}:${
                      (chart.layout.x + chart.layout.w) * 10
                    }`
                  : "0:0",
              };
            }),
          }}
          useDynamicLayout={!hasSavedLayouts} 
          onSaveLayout={saveLayout}
        />
      </div>
    );
  }
);

// Update your Dashboard component to use this approach
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

  // Add state to track selected quick date label
  const [selectedQuickDate, setSelectedQuickDate] = useState<string>("Select period");

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
  const isChangingThemeRef = useRef(false);

  // Add a new state to track whether auto-refresh is enabled
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(false);

  // Add states to track error conditions
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add a state for content-only loading (won't affect header)
  const [isContentLoading, setIsContentLoading] = useState(false);

  // Create a state to track if theme is being changed
  const [isChangingTheme, setIsChangingTheme] = useState(false);

  // Sync isChangingTheme with ref
  useEffect(() => {
    isChangingThemeRef.current = isChangingTheme;
  }, [isChangingTheme]);

  // Add theme from our context
  const { theme, setTheme } = useThemeContext();
  const { theme: nextTheme } = useNextTheme();

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

  // Add function to check for saved layouts and handle graph changes
  const hasSavedLayouts = useCallback((): boolean => {
    if (!selectedApiTemplate) return false;

    try {
      // Step 1: First check if we have layout info in localStorage
      const layoutKey = `template-layout-${selectedApiTemplate}`;
      const savedLayout = localStorage.getItem(layoutKey);
      if (savedLayout) {
        return true;
      }
      
      // Step 2: If no localStorage data, check if charts have valid layout data from API
      return charts.some(chart => 
        chart.layout && 
        typeof chart.layout.x === 'number' && 
        typeof chart.layout.y === 'number' && 
        typeof chart.layout.w === 'number' && 
        typeof chart.layout.h === 'number' &&
        chart.layout.w > 0 && 
        chart.layout.h > 0
      );
    } catch (error) {
      console.error("Error checking for saved layouts:", error);
      return false;
    }
  }, [selectedApiTemplate, charts]);

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

        const data = await retryFetch(async () => {
          const response = await fetch(
            `https://shwsckbvbt.a.pinggy.link/api/ut?templateId=${templateId}`
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch template: ${response.statusText}`);
          }

          return response.json();
        });

        console.log("Template API response:", data);

        if (!data || !data.length) {
          setHasError(true);
          setErrorMessage(
            "Template not found. The requested template could not be found."
          );
          toast.error("Template not found", {
            description: "The requested template could not be found.",
            duration: 5000,
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
          setErrorMessage(
            "Empty template. The template has no graphs to display. Please add some graphs or select a different template."
          );
          toast.error("Empty template", {
            description:
              "The template has no graphs to display. Please add some graphs or select a different template.",
            duration: 5000,
          });
          setIsContentLoading(false);
          return;
        }

        // Create date range from the global date range
        const dateRangeForAPI = {
          from:
            globalDateRange?.from ||
            new Date(new Date().setDate(new Date().getDate() - 7)),
          to: globalDateRange?.to || new Date(),
        };

        try {
          // Generate charts from the fetched template with the selected theme
          const templateCharts = await generateChartsFromTemplate(
            normalizedTemplate,
            resolution,
            dateRangeForAPI
          );

          console.log(
            `Generated ${templateCharts.length} charts from template`,
            templateCharts
          );

          // Apply current theme colors to the charts
          const theme = chartThemes[selectedTheme as keyof typeof chartThemes];

          if (theme && Array.isArray(templateCharts)) {
            templateCharts.forEach((chart) => {
              // Update chart KPI colors with current theme colors
              if ("kpiColors" in chart && chart.kpiColors) {
                const kpiEntries = Object.entries(
                  chart.kpiColors as Record<string, { color: string }>
                );
                kpiEntries.forEach(
                  ([kpiId, kpiInfo]: [string, any], colorIndex) => {
                    // Apply theme color based on index
                    if (kpiInfo && typeof kpiInfo === "object") {
                      (chart.kpiColors as Record<string, { color: string }>)[
                        kpiId
                      ].color = theme.colors[colorIndex % theme.colors.length];
                    }
                  }
                );
              }
            });
          }

          // Important: Update the charts state with the new charts
          if (Array.isArray(templateCharts)) {
            setCharts(templateCharts);
          } else {
            console.error("templateCharts is not an array:", templateCharts);
            setCharts([]);
            throw new Error("Failed to generate charts from template");
          }

          // Reset layoutChanged flag since we're loading a fresh template
          setLayoutChanged(false);

          toast.success(
            `Template "${normalizedTemplate.name}" loaded successfully`
          );
        } catch (error) {
          console.error("Error generating charts from template:", error);
          throw error;
        }
      } catch (error) {
        console.error("Error fetching template:", error);
        setHasError(true);
        setErrorMessage(
          "Failed to load template. Unable to connect to the server. Please check your connection and try again."
        );
        toast.error("Failed to load template", {
          description:
            error instanceof Error
              ? error.message
              : "Unable to connect to the server. Please check your connection and try again.",
          duration: 5000,
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
    // Remove selectedTheme from the dependency array to prevent reloading when theme changes
    [resolution, globalDateRange]
  );

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

  // Update fetchTemplates to use safeLocalStorage
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

      // Try to get the last selected template from localStorage
      const lastSelectedTemplate = safeLocalStorage.getItem(
        "last-selected-template"
      );

      // Determine which template to load
      let templateToLoad: string | undefined;

      if (lastSelectedTemplate) {
        // Check if the stored template still exists in the fetched templates
        const templateExists = normalizedTemplates.some(
          (t) => t.id === lastSelectedTemplate
        );
        if (templateExists) {
          templateToLoad = lastSelectedTemplate;
          console.log(
            `Loading last selected template from localStorage: ${templateToLoad}`
          );
        }
      }

      // If no valid template from localStorage, fall back to default or first template
      if (!templateToLoad) {
        // Find default template if available
        const defaultTemplate = normalizedTemplates.find((t) => t.isDefault);

        if (defaultTemplate) {
          console.log(
            `No last template or not found, using default template: "${defaultTemplate.name}"`
          );
          templateToLoad = defaultTemplate.id;
        } else if (normalizedTemplates.length > 0) {
          // If no default, use the first template
          const firstTemplate = normalizedTemplates[0];
          console.log(
            `No default template found, using first template: "${firstTemplate.name}"`
          );
          templateToLoad = firstTemplate.id;
        }
      }

      if (templateToLoad) {
        setSelectedApiTemplate(templateToLoad);
        // Save the selected template to localStorage
        safeLocalStorage.setItem("last-selected-template", templateToLoad);
        // Now use the properly defined fetchTemplateById function
        await fetchTemplateById(templateToLoad);
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

  // Update handleApiTemplateChange to use safeLocalStorage
  const handleApiTemplateChange = useCallback(
    (templateId: string) => {
      // Don't change template if we're in the middle of a theme change
      if (isChangingThemeRef.current) return;

      if (templateId === selectedApiTemplate) return;

      console.log(
        `Changing template from ${selectedApiTemplate} to ${templateId}`
      );
      setSelectedApiTemplate(templateId);
      setIsContentLoading(true);

      // Save the selected template to localStorage
      safeLocalStorage.setItem("last-selected-template", templateId);

      // Store current theme selection for later application
      const currentTheme = selectedTheme;
      const themeColors =
        chartThemes[currentTheme as keyof typeof chartThemes]?.colors || [];

      // Explicitly call fetchTemplateById to ensure loading the new template
      fetchTemplateById(templateId)
        .then(() => {
          // After template loads, ensure the theme is properly applied to new charts
          if (currentTheme) {
            // Use a small delay to ensure the charts are loaded first
            setTimeout(() => {
              // Re-apply the current theme to the new template's charts
              setCharts((prevCharts: ChartConfig[]) => {
                const themeObj =
                  chartThemes[currentTheme as keyof typeof chartThemes];

                if (!themeObj) return prevCharts;

                return prevCharts.map((chart) => {
                  // Only update colors for KPIs that are actually active in this chart
                  const updatedKpiColors = { ...chart.kpiColors };
                  const activeKpiArray = Array.from(
                    chart.activeKPIs || new Set<string>()
                  );

                  activeKpiArray.forEach((kpi, index) => {
                    if (
                      updatedKpiColors[kpi] &&
                      typeof updatedKpiColors[kpi] === "object"
                    ) {
                      updatedKpiColors[kpi] = {
                        ...updatedKpiColors[kpi],
                        color: themeObj.colors[index % themeObj.colors.length],
                      };
                    }
                  });

                  return {
                    ...chart,
                    kpiColors: updatedKpiColors,
                  };
                });
              });

              // Force charts to redraw with the new theme
              window.dispatchEvent(new Event("resize"));
            }, 200);
          }
        })
        .catch((error) => {
          console.error("Error fetching template:", error);
          toast.error("Failed to load template");
          setIsContentLoading(false);
        });
    },
    [selectedApiTemplate, fetchTemplateById, selectedTheme, chartThemes]
  );

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

      // Add cleanup for processed markers to prevent memory leaks
      if (selectedApiTemplate) {
        const processedKey = `graph-change-processed-${selectedApiTemplate}`;
        localStorage.removeItem(processedKey);
      }
    };
  }, [fetchTemplates, selectedApiTemplate, apiTemplates.length]);

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
          // Clear any cached data for existing charts to force fresh data fetch with new resolution
          if (typeof window !== "undefined") {
            // This is a client-side only operation
            if (window.clearChartCaches) {
              window.clearChartCaches();
            } else {
              console.log("Forcing data refresh for resolution change");
              // Add timestamp to force refetch
              window.forceRefreshTimestamp = Date.now();
            }
          }

          // Store the current template ID to maintain it after resolution change
          const currentTemplateId = selectedApiTemplate;

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
          if (currentTemplateId) {
            console.log(
              `Updating template ${currentTemplateId} with ${newResolution} resolution`
            );

            // Find the current template
            const template = apiTemplates.find(
              (t) => t.id === currentTemplateId
            );

            if (template) {
              // Generate new charts with new resolution
              const newCharts = await generateChartsFromTemplate(
                template,
                newResolution,
                dateRangeForAPI
              );

              // Store the current layout of charts before updating
              const currentLayouts: Record<string, any> = {};
              charts.forEach((chart) => {
                if (chart.id && chart.layout) {
                  currentLayouts[chart.id] = chart.layout;
                }
              });

              // Preserve existing layouts, active KPIs, and colors when updating charts
              setCharts((prevCharts) => {
                return newCharts.map((newChart) => {
                  // Find matching chart in previous charts to preserve settings
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

              // Explicitly maintain selected template ID to prevent navigation
              setSelectedApiTemplate(currentTemplateId);
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

          // If there was an error, revert to the previous resolution
          setResolution(resolution);
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
      charts,
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

  // Completely replace the saveLayout function with this new implementation
  const saveLayout = useCallback(async () => {
    if (!selectedApiTemplate) {
      console.warn("No template selected, cannot save layout");
      return;
    }

    try {
      setIsSaving(true);
      
      // Find the current template data
      const currentTemplate = apiTemplates.find(
        (t) => t.id === selectedApiTemplate
      );
      
      if (!currentTemplate) {
        throw new Error("Template data not found");
      }

      console.log("Starting to save layout for template:", selectedApiTemplate);
      console.log("Template has", currentTemplate.graphs.length, "original graphs");

      // Step 1: Save to local storage first
      const layoutKey = `template-layout-${selectedApiTemplate}`;
      
      try {
        // Format for local storage - just save positions
        const localStorageLayout = charts.map(chart => ({
          id: chart.id,
          layout: chart.layout || { x: 0, y: 0, w: 4, h: 4 }
        }));
        
        safeLocalStorage.setItem(layoutKey, JSON.stringify(localStorageLayout));
        console.log("Layout saved to localStorage successfully");
      } catch (error) {
        console.warn("Could not save layout to localStorage:", error);
      }

      // Step 2: Prepare payload for database
      // Build two collections - one for updated graphs, one for original untouched graphs
      
      // First, create a map of all original graphs by ID for lookup
      const originalGraphsById = new Map();
      if (currentTemplate.graphs && Array.isArray(currentTemplate.graphs)) {
        currentTemplate.graphs.forEach(graph => {
          originalGraphsById.set(graph.id, { ...graph });
        });
      }
      
      // Next, map charts to updated graph entries
      const updatedGraphs = charts.map(chart => {
        // Find the original graph to preserve all its properties
        const originalGraph = originalGraphsById.get(chart.id);
        
        // If we don't have an original, this is likely a new graph
        if (!originalGraph) {
          console.warn(`No original graph found for chart ${chart.id}, using defaults`);
          
          // Use default layout if chart.layout is undefined
          const layout = chart.layout || { x: 0, y: 0, w: 4, h: 4 };
          
          // Calculate positions for API format
          const topX = layout.x * 10;
          const topY = layout.y * 10;
          const bottomX = (layout.x + layout.w) * 10;
          const bottomY = (layout.y + layout.h) * 10;
          
          // Create a new graph entry
          return {
            graph_id: chart.id,
            graph_name: chart.title || "New Graph",
            top_xy_pos: `${topY}:${topX}`,
            bottom_xy_pos: `${bottomY}:${bottomX}`,
            primary_kpi_id: Array.from(chart.activeKPIs || new Set<string>())[0] || "",
            secondary_kpis: Array.from(chart.activeKPIs || new Set<string>())
              .slice(1)
              .map((kpi: string) => ({ kpi_id: kpi })),
            frequency: "auto",
            resolution: "auto",
            graph_type: chart.type || "line"
          };
        }
        
        // For existing graphs, update with new layout while preserving other props
        
        // Use chart's layout if available, or original, or default
        const layout = chart.layout || 
          (originalGraph.position ? {
            x: originalGraph.position.x,
            y: originalGraph.position.y,
            w: originalGraph.position.w, 
            h: originalGraph.position.h
          } : { x: 0, y: 0, w: 4, h: 4 });
        
        // Calculate positions for API format
        const topX = layout.x * 10;
        const topY = layout.y * 10;
        const bottomX = (layout.x + layout.w) * 10;
        const bottomY = (layout.y + layout.h) * 10;
        
        // Create an updated graph entry
        const updatedGraph = {
          graph_id: originalGraph.id,
          graph_name: originalGraph.name,
          primary_kpi_id: originalGraph.primaryKpi,
          secondary_kpis: originalGraph.secondaryKpis?.map((kpi: string) => ({ kpi_id: kpi })) || [],
          top_xy_pos: `${topY}:${topX}`,
          bottom_xy_pos: `${bottomY}:${bottomX}`,
          graph_type: originalGraph.type || "line",
          systems: originalGraph.systems || [],
          frequency: originalGraph.frequency || "auto",
          resolution: originalGraph.resolution || "auto"
        };
        
        // If there are active KPIs in the chart, update those
        if (chart.activeKPIs && (chart.activeKPIs instanceof Set ? chart.activeKPIs.size > 0 : chart.activeKPIs.length > 0)) {
          const activeKpiArray = Array.from(chart.activeKPIs);
          if (activeKpiArray.length > 0) {
            updatedGraph.primary_kpi_id = activeKpiArray[0];
            updatedGraph.secondary_kpis = activeKpiArray.slice(1).map((kpi: string) => ({ kpi_id: kpi }));
          }
        }
        
        // Remove from map to track which original graphs were updated
        originalGraphsById.delete(chart.id);
        
        return updatedGraph;
      });
      
      // Now, preserve all graphs that weren't updated (not in current view)
      const preservedGraphs: any[] = [];
      originalGraphsById.forEach(graph => {
        // Convert to the API format
        const preservedGraph = {
          graph_id: graph.id,
          graph_name: graph.name,
          primary_kpi_id: graph.primaryKpi,
          secondary_kpis: graph.secondaryKpis?.map((kpi: string) => ({ kpi_id: kpi })) || [],
          top_xy_pos: graph.position ? 
            `${graph.position.y * 10}:${graph.position.x * 10}` : "0:0",
          bottom_xy_pos: graph.position ? 
            `${(graph.position.y + graph.position.h) * 10}:${(graph.position.x + graph.position.w) * 10}` : "0:0",
          graph_type: graph.type || "line",
          systems: graph.systems || [],
          frequency: graph.frequency || "auto",
          resolution: graph.resolution || "auto"
        };
        
        preservedGraphs.push(preservedGraph);
      });
      
      // Combine the updated and preserved graphs
      const allGraphs = [...updatedGraphs, ...preservedGraphs];
      
      console.log(
        `Sending ${allGraphs.length} total graphs to API: ` + 
        `${updatedGraphs.length} updated, ${preservedGraphs.length} preserved`
      );
      
      // Step 3: Create the API payload and send it
      const payload = {
        user_id: "USER_TEST_1",
        template_id: selectedApiTemplate,
        template_name: currentTemplate.name,
        template_desc: currentTemplate.description || `${currentTemplate.name} Template`,
        default: currentTemplate.isDefault || false,
        favorite: currentTemplate.isFavorite || false,
        frequency: currentTemplate.frequency || "auto",
        resolution: currentTemplate.resolution || "auto",
        systems: currentTemplate.systems.map((systemId) => ({ system_id: systemId })) || [],
        graphs: allGraphs,
      };
      
      console.log("Saving template with payload:", payload);
      
      // Send to API
      const apiUrl = `https://shwsckbvbt.a.pinggy.link/api/ut`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to save layout: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Layout saved successfully:", data);
      
      // Validation: Verify graphs were saved properly
      try {
        const verifyResponse = await fetch(
          `https://shwsckbvbt.a.pinggy.link/api/ut?templateId=${selectedApiTemplate}`
        );
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          if (verifyData && verifyData.length > 0) {
            const savedTemplate = verifyData[0];
            const savedGraphCount = savedTemplate.graphs?.length || 0;
            const originalGraphCount = currentTemplate.graphs.length;
            const sentGraphCount = allGraphs.length;
            
            console.log(`VALIDATION: Sent ${sentGraphCount} graphs, saved ${savedGraphCount}, original had ${originalGraphCount}`);
            
            if (savedGraphCount < originalGraphCount) {
              console.error(`VALIDATION FAILED: Some graphs were lost (saved: ${savedGraphCount}, original: ${originalGraphCount})`);
              toast.warning(`Warning: Some graphs may have been lost during save (${savedGraphCount}/${originalGraphCount})`);
            } else {
              console.log(`VALIDATION PASSED: All graphs saved successfully (${savedGraphCount})`);
            }
          }
        }
      } catch (verifyError) {
        console.warn("Could not verify saved template:", verifyError);
      }

      setLayoutChanged(false);
      toast.success("Dashboard layout saved successfully");
    } catch (error) {
      console.error("Error saving layout:", error);
      toast.error(`Failed to save layout: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  }, [charts, selectedApiTemplate, apiTemplates]);

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
            if (
              !chart.layout ||
              chart.layout.x !== newLayoutItem.x ||
              chart.layout.y !== newLayoutItem.y ||
              chart.layout.w !== newLayoutItem.w ||
              chart.layout.h !== newLayoutItem.h
            ) {
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
        const chart = charts.find((c) => c.id === item.i);
        if (!chart || !chart.layout) return true;

        return (
          chart.layout.x !== item.x ||
          chart.layout.y !== item.y ||
          chart.layout.w !== item.w ||
          chart.layout.h !== item.h
        );
      });

      if (isSignificantChange) {
        setLayoutChanged(true);
        console.log("Layout has been modified by user");
      }
    },
    [charts, isContentLoading]
  );

  // Modify handleThemeChange to prevent full reload and API calls
  const handleThemeChange = (selectedThemeName: string) => {
    // Prevent theme changes from triggering template refreshes
    setIsChangingTheme(true);
    isChangingThemeRef.current = true;

    // Get the theme object directly from chartThemes
    const themeObj =
      chartThemes[selectedThemeName as keyof typeof chartThemes] ||
      chartThemes.default;

    console.log("Changing theme to:", selectedThemeName, themeObj);

    // Update the KPI colors with the new theme colors without causing re-renders
    const updatedKpiColors = { ...themedKpiColors };
    Object.entries(updatedKpiColors).forEach(([kpiId, kpiInfo], index) => {
      if (kpiInfo && typeof kpiInfo === "object") {
        updatedKpiColors[kpiId as keyof typeof kpiColors] = {
          ...kpiInfo,
          color: themeObj.colors[index % themeObj.colors.length],
        };
      }
    });

    // Update charts with new colors without causing full re-renders
    const updatedCharts = charts.map((chart) => {
      // Create a shallow copy of chart properties
      const updatedChart = { ...chart };

      // Only make a new copy of kpiColors if it exists
      if (chart.kpiColors) {
        const chartKpiColors = { ...chart.kpiColors };

        // Update each KPI color in place
        Object.keys(chartKpiColors).forEach((kpi, index) => {
          if (chartKpiColors[kpi] && typeof chartKpiColors[kpi] === "object") {
            chartKpiColors[kpi] = {
              ...chartKpiColors[kpi],
              color: themeObj.colors[index % themeObj.colors.length],
            };
          }
        });

        // Assign updated colors to chart copy
        updatedChart.kpiColors = chartKpiColors;
      }

      return updatedChart;
    });

    // Use requestAnimationFrame to batch updates in the next render cycle
    requestAnimationFrame(() => {
      // Apply all state updates in a batch to minimize renders
      setThemedKpiColors(updatedKpiColors);
      setCharts(updatedCharts);
      setSelectedTheme(selectedThemeName);

      // End theme change mode to allow other operations
      setIsChangingTheme(false);
      isChangingThemeRef.current = false;

      // Use a short timeout to trigger a resize event for chart re-rendering
      // This ensures the charts pick up the new colors without a full reload
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));

        // Show success notification
        toast.success(`Theme changed to ${themeObj.name}`, {
          duration: 1500,
          position: "bottom-right",
        });
      }, 50);
    });
  };

  // Find the actual getThemeColors function and add the useEffect right after it
  const getThemeColors = (themeName: string) => {
    switch (themeName) {
      case "blue":
        return [
          "#1f77b4",
          "#aec7e8",
          "#ff7f0e",
          "#ffbb78",
          "#2ca02c",
          "#98df8a",
          "#d62728",
          "#ff9896",
          "#9467bd",
          "#c5b0d5",
        ];
      case "green":
        return [
          "#2ca02c",
          "#98df8a",
          "#d62728",
          "#ff9896",
          "#9467bd",
          "#c5b0d5",
          "#8c564b",
          "#c49c94",
          "#e377c2",
          "#f7b6d2",
        ];
      case "red":
        return [
          "#d62728",
          "#ff9896",
          "#9467bd",
          "#c5b0d5",
          "#8c564b",
          "#c49c94",
          "#e377c2",
          "#f7b6d2",
          "#7f7f7f",
          "#c7c7c7",
        ];
      case "purple":
        return [
          "#9467bd",
          "#c5b0d5",
          "#8c564b",
          "#c49c94",
          "#e377c2",
          "#f7b6d2",
          "#7f7f7f",
          "#c7c7c7",
          "#bcbd22",
          "#dbdb8d",
        ];
      case "orange":
        return [
          "#ff7f0e",
          "#ffbb78",
          "#2ca02c",
          "#98df8a",
          "#d62728",
          "#ff9896",
          "#9467bd",
          "#c5b0d5",
          "#8c564b",
          "#c49c94",
        ];
      case "default":
      default:
        return [
          "#1f77b4",
          "#ff7f0e",
          "#2ca02c",
          "#d62728",
          "#9467bd",
          "#8c564b",
          "#e377c2",
          "#7f7f7f",
          "#bcbd22",
          "#17becf",
        ];
    }
  };

  // Add a useEffect for scroll detection to enhance the sticky header
  useEffect(() => {
    const handleScroll = () => {
      const header = document.querySelector(".sticky-header-wrapper > div");
      if (!header) return;

      if (window.scrollY > 10) {
        header.classList.add("shadow-lg");
        header.classList.add("bg-card/95");
      } else {
        header.classList.remove("shadow-lg");
        header.classList.remove("bg-card/95");
      }
    };

    // Add scroll event listener
    window.addEventListener("scroll", handleScroll);

    // Clean up
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Create a modified version of renderDashboardContent function
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
    const layoutSaved = hasSavedLayouts();

    return (
      <div className="relative min-h-[70vh] ">
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
                  ? `${(chart.layout.y + chart.layout.h) * 10}:${
                      (chart.layout.x + chart.layout.w) * 10
                    }`
                  : "0:0",
              };
            }),
          }}
          useDynamicLayout={!layoutSaved} 
          onSaveLayout={saveLayout}
        />
      </div>
    );
  };

  // Initialize theme on component mount
  useEffect(() => {
    if (chartThemes[selectedTheme as keyof typeof chartThemes]) {
      const themeObj = chartThemes[selectedTheme as keyof typeof chartThemes];

      // Set the theme context
      setTheme({
        name: selectedTheme,
        colors: themeObj.colors,
      });

      // Update KPI colors to match theme
      setThemedKpiColors((prevColors) => {
        const updatedColors = { ...prevColors };
        Object.entries(updatedColors).forEach(([kpiId, kpiInfo], index) => {
          if (kpiInfo && typeof kpiInfo === "object") {
            updatedColors[kpiId as keyof typeof kpiColors] = {
              ...kpiInfo,
              color: themeObj.colors[index % themeObj.colors.length],
            };
          }
        });
        return updatedColors;
      });

      // Force resize to ensure charts update
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 100);
    }
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-background via-background/98 to-background/95">
        {/* Show header immediately during initial load */}
        <main className="flex-1 overflow-y-auto transition-all duration-300">
          <div className="container mx-auto px-6 py-6 max-w-[1600px]">
            <motion.div
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              className="fixed top-0 left-0 right-0 z-[40] bg-background/95 backdrop-blur-sm border-b border-border/40"
            >
              <div className="container mx-auto px-6 py-4">
                <div className="flex justify-between items-center bg-card/90 backdrop-blur-lg rounded-lg px-4 py-3 shadow-sm border border-border/30">
                  <div className="flex items-center gap-6">
                    <h1 className="text-2xl font-semibold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
                      SAP Analytics
                    </h1>
                    {/* Show loading placeholders for controls */}
                    <div className="flex items-center gap-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-8 w-24 bg-muted/30 rounded-md"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            {/* Loading spinner for main content */}
            <div className="flex h-[80vh] items-center justify-center pt-[120px]">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-background via-background/98 to-background/95">
        {/* Show header during loading state */}
        <main className="flex-1 overflow-y-auto transition-all duration-300">
          <div className="container mx-auto px-6 py-6 max-w-[1600px]">
            <motion.div
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1 }}
              className="fixed top-0 left-0 right-0 z-[40] bg-background/95 backdrop-blur-sm border-b border-border/40"
            >
              <div className="container mx-auto px-6 py-4">
                <div className="flex justify-between items-center bg-card/90 backdrop-blur-lg rounded-lg px-4 py-3 shadow-sm border border-border/30">
                  <div className="flex items-center gap-6">
                    <h1 className="text-2xl font-semibold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent tracking-tight whitespace-nowrap">
                      SAP Analytics
                    </h1>
                    {/* Show loading placeholders for controls */}
                    <div className="flex items-center gap-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-8 w-24 bg-muted/30 rounded-md"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
            {/* Loading spinner for main content */}
            <div className="flex h-[80vh] items-center justify-center pt-[120px]">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Only use template data if no API template is selected
  const selectedCharts = selectedApiTemplate
    ? charts
    : charts.filter((_, index) =>
        templateData[selectedTemplate as TemplateKey].charts.includes(index)
      );

  const presets = [
    {
      label: 'Today',
      value: 'today',
      getDate: () => ({
        from: new Date(),
        to: new Date()
      })
    },
    {
      label: 'Yesterday',
      value: 'yesterday',
      getDate: () => ({
        from: addDays(new Date(), -1),
        to: addDays(new Date(), -1)
      })
    },
    {
      label: 'Last 7 days',
      value: 'last7days',
      getDate: () => ({
        from: addDays(new Date(), -7),
        to: new Date()
      })
    },
    {
      label: 'Last 30 days',
      value: 'last30days',
      getDate: () => ({
        from: addDays(new Date(), -30),
        to: new Date()
      })
    }
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background/98 to-background/95 overflow-hidden">
      {/* <Sidebar /> */}
      <main className={`flex-1 overflow-y-auto transition-all duration-300`}>
        <div className="container mx-auto px-6 py-6 max-w-[1600px]">
          {/* Dashboard header with title and save button - Make it truly sticky */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed top-0 left-0 right-0 z-[40] bg-background/95 backdrop-blur-sm border-b border-border/40"
          >
            <div className="container mx-auto px-6 py-4">
              <div className="flex justify-between items-center bg-card/90 backdrop-blur-lg rounded-lg px-4 py-3 shadow-sm border border-border/30">
                {/* Header content remains the same */}
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
                        <DropdownMenuContent align="end" className="w-[200px] z-[50]">
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
                        <SelectContent className="z-[50]">
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
                        className="w-auto z-[50]"
                        showTime={true}
                      />
                    </div>

                    {/* Quick Select date presets - new component */}
                    <div className="flex flex-col">
                      <label className="text-xs text-muted-foreground mb-1">
                        Quick Dates
                      </label>
                      <Select
                        onValueChange={(value) => {
                          const preset = presets.find(p => p.value === value);
                          if (preset) {
                            const newDate = preset.getDate();
                            setGlobalDateRange(newDate);
                            // Update the selected quick date label
                            setSelectedQuickDate(preset.label);
                          }
                        }}
                      >
                        <SelectTrigger className="h-8 px-2 text-xs bg-background/50 min-w-[120px] border-muted">
                          <div className="flex items-center gap-1.5">
                            <CalendarRange className="h-3 w-3 text-muted-foreground" />
                            <SelectValue placeholder={selectedQuickDate} />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="z-[50]">
                          {presets.map((preset) => (
                            <SelectItem
                              key={preset.value}
                              value={preset.value}
                              className="text-xs"
                            >
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Auto-refresh dropdown - Replace with Timer icon and add Refresh label */}
                    <div className="flex flex-col">
                      <label className="text-xs text-muted-foreground mb-1">
                        Refresh
                      </label>
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
                                  <Clock
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
                            className="w-[220px] z-[50]"
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

                    
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Add padding to account for fixed header and ensure dropdowns are visible */}
          <div className="pt-[100px]">
            {/* Charts grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="grid gap-6"
            >
              {renderDashboardContent()}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
