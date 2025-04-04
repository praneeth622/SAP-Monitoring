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

const chartThemes: Record<ThemeKey, ChartTheme> = {
  default: {
    name: "Default",
    colors: ["#4F46E5", "#10B981", "#F59E0B", "#EF4444"],
  },
  ocean: {
    name: "Ocean",
    colors: ["#0EA5E9", "#14B8A6", "#FBBF24", "#F87171"],
  },
  forest: {
    name: "Forest",
    colors: ["#22C55E", "#84CC16", "#EAB308", "#F97316"],
  },
  sunset: {
    name: "Sunset",
    colors: ["#F97316", "#EAB308", "#84CC16", "#22C55E"],
  },
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
  }));
};

// Generate chart configs based on a template definition
const generateChartsFromTemplate = (
  template: NormalizedTemplate,
  resolution = "auto"
) => {
  console.log(
    `Generating charts from template "${template.name}" with ${
      template.graphs?.length || 0
    } graphs`
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

  console.log(
    `Assigned colors to ${Object.keys(globalKpiColors).length} unique KPIs`
  );

  return template.graphs.map((graph, index) => {
    // Generate data for all KPIs in the graph
    const allKpis = [graph.primaryKpi, ...graph.secondaryKpis].map((kpi) =>
      kpi.toLowerCase()
    );

    // Create dummy data for each KPI in the graph
    const dummyData: DataPoint[] = [];
    const now = new Date();

    // Data generation parameters
    const valueRanges: Record<
      string,
      { base: number; amplitude: number; trend: number }
    > = {};

    // Set different patterns for each KPI
    allKpis.forEach((kpi, i) => {
      valueRanges[kpi] = {
        base: 1000 + i * 500, // Different base for each KPI
        amplitude: 200 + Math.random() * 400, // Random fluctuation amount
        trend: (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 50), // Random trend direction and amount
      };
    });

    // Generate 24 hours of data (or more data points for higher resolution)
    const dataPoints = resolution === "auto" ? 24 : 48;

    for (let i = 0; i < dataPoints; i++) {
      const date = new Date(now);
      const hourInterval = resolution === "auto" ? 1 : 0.5;
      date.setHours(date.getHours() - i * hourInterval);

      // Generate a value for each KPI at this time point
      allKpis.forEach((kpi) => {
        const { base, amplitude, trend } = valueRanges[kpi];

        // Create patterns in the data - some sine wave patterns, some random
        let pattern;
        if (kpi.includes("cpu")) {
          // CPU follows a sine wave pattern with random noise
          pattern =
            (Math.sin(i / 4) * amplitude) / 2 + (Math.random() * amplitude) / 2;
        } else if (kpi.includes("memory")) {
          // Memory has an upward trend with some noise
          pattern = i * 5 + (Math.random() * amplitude) / 3;
        } else if (kpi.includes("disk")) {
          // Disk grows linearly
          pattern = i * 10;
        } else if (kpi.includes("network")) {
          // Network has spikes
          pattern = i % 6 === 0 ? amplitude : (amplitude / 4) * Math.random();
        } else {
          // Other metrics have random patterns with the defined trend
          pattern = Math.random() * amplitude + (i * trend) / 10;
        }

        // Final value with base + pattern
        const value = base + pattern;

        dummyData.push({
          category: kpi,
          date: date.toISOString(),
          value: Math.max(0, value), // Ensure no negative values
        });
      });
    }

    console.log(
      `Generated ${dummyData.length} dummy data points for chart "${graph.name}"`
    );

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

  // Add timer-related states
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Add states for layout saving
  const [layoutChanged, setLayoutChanged] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Get seconds for the selected resolution
  const selectedResolutionSeconds = useMemo(() => {
    const option = resolutionOptions.find((opt) => opt.value === resolution);
    return option?.seconds || 0;
  }, [resolution]);

  // Move fetchTemplateById inside the component
  const fetchTemplateById = useCallback(
    async (templateId: string) => {
      try {
        setIsLoading(true);
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
          throw new Error("Template not found or empty response");
        }

        // Normalize the template
        const normalizedTemplate = normalizeTemplate(data[0]);
        console.log("Normalized template:", normalizedTemplate);

        if (
          !normalizedTemplate.graphs ||
          normalizedTemplate.graphs.length === 0
        ) {
          console.warn(
            "Template has no graphs, falling back to default charts"
          );
          setCharts(generateChartConfigs(resolution));
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
        toast.error("Failed to load template", {
          description:
            error instanceof Error
              ? error.message
              : "Please try again or contact support",
        });

        // Fallback to default charts
        setCharts(generateChartConfigs(resolution));
      } finally {
        setIsLoading(false);
      }
    },
    [resolution, selectedTheme]
  );

  // Now your fetchTemplates function can use fetchTemplateById
  const fetchTemplates = useCallback(async () => {
    try {
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
        // Add dummy templates as before...
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
        console.log("No templates found, using generated charts");
        setCharts(generateChartConfigs(resolution));
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to fetch templates", {
        description:
          error instanceof Error
            ? error.message
            : "Please try again or contact support",
      });

      // Add dummy templates for testing in case of error
      console.log("Adding dummy templates after error");
      const dummyTemplates = [
        {
          id: "error-dummy1",
          name: "Error Recovery Template",
          description: "Created after API error",
          isDefault: true,
          isFavorite: false,
          frequency: "auto",
          systems: ["svw"],
          graphs: [
            {
              id: "fallback-graph1",
              name: "Fallback Chart",
              position: { x: 0, y: 0, w: 12, h: 4 },
              type: "line" as ChartType,
              primaryKpi: "CPU",
              secondaryKpis: ["Memory"],
            },
          ],
        },
      ];
      setApiTemplates(dummyTemplates);
      setSelectedApiTemplate(dummyTemplates[0].id);
      setCharts(generateChartsFromTemplate(dummyTemplates[0], resolution));
    }
  }, [resolution, fetchTemplateById]);

  // Initialize dashboard with templates
  useEffect(() => {
    let isMounted = true; // Flag to handle component unmounting

    const initialize = async () => {
      try {
        if (!isMounted) return;

        // setIsLoading(true);
        console.log("Initializing dashboard and fetching templates...");

        // First, generate default charts while templates are loading
        const defaultCharts = generateChartConfigs(resolution);
        setCharts(defaultCharts);

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
        // Ensure we have some charts even if template loading fails
        setCharts(generateChartConfigs(resolution));
      } finally {
        if (isMounted) {
          // setIsLoading(false);
        }
      }
    };

    initialize();

    // Cleanup function to handle unmounting
    return () => {
      isMounted = false;
    };
  }, [fetchTemplates, resolution]);

  // Update the handleApiTemplateChange function to ensure proper template loading
  const handleApiTemplateChange = useCallback(
    (templateId: string) => {
      if (templateId === selectedApiTemplate) return;

      console.log(
        `Changing template from ${selectedApiTemplate} to ${templateId}`
      );
      setSelectedApiTemplate(templateId);

      // Set loading state while fetching the new template
      setIsLoading(true);

      // Fetch the template data
      fetchTemplateById(templateId);
    },
    [selectedApiTemplate, fetchTemplateById]
  );

  const refreshData = useCallback(async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      console.log("Refreshing data...");

      // Reset timer to full value
      const option = resolutionOptions.find((opt) => opt.value === resolution);
      setTimeLeft(option?.seconds || null);

      // If a template is selected, reload that template's charts
      if (selectedApiTemplate) {
        // Use a lighter approach that doesn't cause layout shifts
        const template = apiTemplates.find((t) => t.id === selectedApiTemplate);
        if (template) {
          const freshCharts = generateChartsFromTemplate(template, resolution);

          // Update charts without causing a layout shift
          setCharts((prevCharts) => {
            return freshCharts.map((newChart, i) => {
              // Keep layout from previous chart to prevent layout shifts
              const existingChart = prevCharts.find(
                (c) => c.id === newChart.id
              );
              if (existingChart && existingChart.layout) {
                return {
                    ...newChart,
                    layout: existingChart.layout
                };
              }
              return newChart;
            });
          });
        }
      } else {
        // Generate new chart data while preserving layouts
        const newCharts = generateChartConfigs(resolution);
        setCharts((prevCharts) => {
          return newCharts.map((newChart, i) => {
            if (i < prevCharts.length) {
              // Keep the same layout but update the data
              return {
                ...newChart,
                layout: prevCharts[i].layout,
              };
            }
            return newChart;
          });
        });
      }

      toast.success("Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedApiTemplate, resolution, apiTemplates]);

  // Setup timer effect
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // If auto-refresh is disabled (auto mode), don't start timer
    if (!selectedResolutionSeconds) {
      setTimeLeft(null);
      return;
    }

    console.log(`Setting up timer for ${selectedResolutionSeconds} seconds`);

    // Initialize timer
    setTimeLeft(selectedResolutionSeconds);

    // Start countdown
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          // Time's up - refresh data
          console.log("Timer expired, refreshing data...");
          refreshData();
          return selectedResolutionSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [selectedResolutionSeconds, refreshData]);

  // Add a cleanup effect to prevent memory leaks when component unmounts
  useEffect(() => {
    return () => {
      // Cleanup any timers when component unmounts
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  // Improved time formatter for better display
  const formatTimeLeft = useCallback((seconds: number | null) => {
    if (seconds === null) return "";

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins > 0) {
      return `${mins}m ${secs.toString().padStart(2, "0")}s`;
    }
    return `${secs}s`;
  }, []);

  const handleManualRefresh = () => {
    refreshData();
  };

  const handleResolutionChange = useCallback(
    (value: string) => {
      console.log(`Resolution changed to: ${value}`);
      setResolution(value);

      // Find the corresponding seconds for this resolution
      const option = resolutionOptions.find((opt) => opt.value === value);
      const seconds = option?.seconds || 0;

      try {
        // Reset timer immediately on change
        setTimeLeft(seconds);

        // Clear any existing timer first to prevent memory leaks
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // If there are seconds (not 'auto'), start a new timer
        if (seconds > 0) {
          console.log(`Starting new timer for ${seconds} seconds`);

          // Start the new timer using a safer approach
          timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
              if (prev === null) return null;
              if (prev <= 1) {
                // Time's up - refresh data without causing a full page reload
                console.log("Timer expired, refreshing data...");
                // Use a try-catch to handle any refresh errors
                try {
                  refreshData();
                } catch (error) {
                  console.error("Error in refresh timer:", error);
                }
                return seconds; // Reset timer
              }
              return prev - 1;
            });
          }, 1000);
        }
      } catch (error) {
        console.error("Error setting up timer:", error);
        // Ensure we don't leave the app in a broken state
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setTimeLeft(null);
      }
    },
    [refreshData]
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
        <div className="container mx-auto px-2 py-6">
          {/* Dashboard header with title and save button */}
          <div className="flex flex-col mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 flex justify-between items-center"
            >
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent tracking-tight">
                Analytics Dashboard
              </h1>
              {/* Only show save button when layout has changed */}
              {layoutChanged && (
                <Button
                  onClick={saveLayout}
                  disabled={!layoutChanged || isSaving}
                  className={cn(
                    "flex items-center gap-2",
                    isSaving && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? "Saving..." : "Save Layout"}
                </Button>
              )}
            </motion.div>

            {/* Controls grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4"
            >
              {/* Templates - 3 columns */}
              <div className="md:col-span-3">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Templates
                </label>
                <Select
                  value={selectedApiTemplate}
                  onValueChange={handleApiTemplateChange}
                  disabled={apiTemplates.length === 0}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {apiTemplates.map((template) => (
                      <SelectItem
                        key={template.id}
                        value={template.id}
                        className="flex items-center gap-2"
                      >
                        <span>{template.name}</span>
                        {template.isDefault && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Default
                          </span>
                        )}
                        {template.isFavorite && (
                          <span className="text-yellow-500">★</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Theme Selection - 3 columns */}
              <div className="md:col-span-3">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Chart Theme
                </label>
                <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                  <SelectTrigger className="w-full h-10">
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
              </div>

              {/* Resolution Dropdown with Timer - Fixed position and improved alignment */}
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block flex items-center justify-between">
                  <span>Resolution</span>
                  {timeLeft !== null && (
                    <span className="font-mono text-xs bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {formatTimeLeft(timeLeft)}
                    </span>
                  )}
                </label>
                <div className="flex gap-2 relative">
                  <Select
                    value={resolution}
                    onValueChange={handleResolutionChange}
                  >
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Resolution" />
                    </SelectTrigger>
                    <SelectContent
                      align="start"
                      sideOffset={4}
                      className="w-[--radix-select-trigger-width]"
                    >
                      {resolutionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className={cn(
                      "h-10 w-10 rounded-md border flex items-center justify-center",
                      "bg-background hover:bg-muted/50 transition-colors",
                      isRefreshing && "opacity-70 cursor-not-allowed"
                    )}
                    title="Refresh data"
                    aria-label="Refresh data"
                  >
                    {isRefreshing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              {/* Date Range - 4 columns (wider) */}
              <div className="md:col-span-4">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Date Range
                </label>
                <DateRangePicker
                  date={globalDateRange}
                  onDateChange={setGlobalDateRange}
                  className="w-full"
                  showTime
                />
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
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : charts.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">
                  No charts available for this template
                </p>
              </div>
            ) : (
              <DynamicLayout
                charts={charts}
                activeKPIs={activeKPIs}
                kpiColors={themedKpiColors}
                globalDateRange={globalDateRange}
                theme={chartThemes[selectedTheme as keyof typeof chartThemes]}
                onLayoutChange={handleLayoutChange}
              />
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
