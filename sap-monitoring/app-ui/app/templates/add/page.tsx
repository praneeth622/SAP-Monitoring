"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Sheet from "@/components/sheet";
import AddGraphSheet from "@/components/add-graph-sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DynamicLayout } from "@/components/charts/DynamicLayout";
import { generateDummyData, fetchTemplateChartData } from "@/utils/data";
import { getTemplateChartDummyData, getTemplateDummyData } from "@/utils/template-dummy-data";
import { toast } from "sonner";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import debounce from "lodash/debounce";
import { app_globals } from "@/config/config";
import { Layout } from "react-grid-layout";
import React from "react";

interface Template {
  id: string;
  name: string;
  system: string;
  timeRange: string;
  resolution: string;
  isDefault: boolean;
  isFavorite: boolean;
  graphs: Graph[];
}

// Update the Graph interface to include the description fields
interface Graph {
  id?: string;
  name: string;
  type: "line" | "bar";
  monitoringArea: string;
  monitoringAreaDesc?: string;
  kpiGroup: string;
  kpiGroupDesc?: string;
  primaryKpi: string;
  primaryKpiDesc?: string;
  correlationKpis: string[];
  correlationKpisDesc?: string[];
  primaryFilterValues?: any[];
  secondaryKpisData?: any[];
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  activeKPIs: Set<string> | string[];
  kpiColors: Record<string, { color: string; name: string }>;
  timeInterval?: string; // Add this field
  resolution?: string;   // Add this field
  
  // Add this property for stable color references
  stableKpiColors?: Record<string, { color: string; name: string }>;
  
  // Legacy API properties - added to fix linter errors
  primary_kpi_ma?: string; // Monitoring area in legacy format
  primary_kpi_kpigrp?: string; // KPI group in legacy format
  primary_kpi_id?: string; // Primary KPI in legacy format
  secondary_kpis?: Array<{ kpi_id: string, [key: string]: any }>; // Secondary KPIs in legacy format
  top_xy_pos?: string; // Position in legacy format (x:y)
  bottom_xy_pos?: string; // Position in legacy format (x:y)
}

interface DataPoint {
  category: string;
  date: string;
  value: number;
}

interface System {
  system_id: string;
  instance: string;
  activeStatus: boolean;
  client: number;
  description: string;
  type: string;
  pollingStatus: boolean;
}

const timeRangeOptions = [
  "auto",
  "last 1 hour",
  "today",
  "yesterday",
  "last 7 days",
  "last 30 days",
  "last 90 days",
  "custom",
];

// Add a map for display labels
const timeRangeLabels: Record<string, string> = {
  "auto": "Auto",
  "last 1 hour": "Last 1 Hour",
  "today": "Today",
  "yesterday": "Yesterday",
  "last 7 days": "Last 7 Days",
  "last 30 days": "Last 30 Days",
  "last 90 days": "Last 90 Days",
  "custom": "Custom"
};

const dummyData = generateDummyData();

// Add this near the top of the file with other constants
const resolutionOptions = [
  { value: "auto", label: "Auto" },
  { value: "1m", label: "1 Minute" },
  { value: "5m", label: "5 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "1d", label: "1 Day" },
];

// Utility function to create vibrant, consistent colors for KPIs
const generateConsistentColors = (kpis: string[]) => {
  // Use our default theme colors for consistency
  const colorPalette = defaultChartTheme.colors;

  const kpiColors: Record<string, { color: string; name: string }> = {};
  const activeKPIs = new Set<string>();

  kpis.forEach((kpi, index) => {
    if (!kpi) return; // Skip empty KPIs
    
    const kpiLower = kpi.toLowerCase();
    activeKPIs.add(kpiLower);
    
    // Format the KPI name to be more user-friendly for display
    const displayName = kpi
      .replace(/_/g, ' ')  // Replace underscores with spaces
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Title case each word
      .join(' ');
    
    kpiColors[kpiLower] = {
      color: colorPalette[index % colorPalette.length],
      name: displayName || kpi,  // Use formatted display name or original if formatting fails
    };
  });

  return { kpiColors, activeKPIs };
};

const ERROR_MESSAGES = {
  MAX_GRAPHS: "Maximum 9 graphs allowed per template",
  MIN_GRAPHS: "Please add at least one graph to the template",
  REQUIRED_FIELDS: "Please fill in all required fields before proceeding",
  FETCH_ERROR: "Failed to fetch templates",
  SAVE_ERROR: "Failed to save template",
  ADD_GRAPH_ERROR: "Failed to add graph",
  VALIDATION_ERROR: "All required fields must be filled",
  GRAPH_TYPE_ERROR: "Invalid graph type",
  LAYOUT_ERROR: "Invalid layout configuration",
};

const SUCCESS_MESSAGES = {
  TEMPLATE_SAVED: "Template saved successfully",
  GRAPH_ADDED: "Graph added successfully",
};

// Add a default theme for all template charts
const defaultChartTheme = {
  name: "Default",
  colors: [
    "#3B82F6",
    "#8B5CF6",
    "#EC4899",
    "#10B981",
    "#F97316",
    "#EF4444",
    "#06B6D4",
    "#84CC16",
    "#F59E0B",
  ],
};

// Add this function near the top of the file, outside the component
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

// Add this utility function to normalize filter values
const normalizeFilterValues = (filterValues: any) => {
  if (!filterValues) return [];
  if (Array.isArray(filterValues)) return filterValues;
  // If it's an object, convert to array with single item
  if (typeof filterValues === "object" && !Array.isArray(filterValues)) {
    return [filterValues];
  }
  return [];
};

// First, add a Loading component we can use throughout the page
const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-8 space-y-3">
    <div className="relative">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
        <div className="h-6 w-6 bg-card rounded-full"></div>
      </div>
    </div>
    <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
  </div>
);

// Create a new component that will use useSearchParams
function TemplatePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const templateId = searchParams.get("templateId");
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null
  );
  const [isAddGraphSheetOpen, setIsAddGraphSheetOpen] = useState(false);
  const [systems, setSystems] = useState<System[]>([]);
  const [templateData, setTemplateData] = useState({
    name: "",
    system: "",
    timeRange: "auto",
    resolution: "auto",
    isDefault: false,
    isFavorite: false,
    graphs: [] as Graph[],
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [showGraphs, setShowGraphs] = useState(false);
  const [activeKPIs, setActiveKPIs] = useState<Set<string>>(new Set());
  const [kpiColors, setKpiColors] = useState<
    Record<string, { color: string; name: string }>
  >({});
  const [isLoading, setIsLoading] = useState(false);

  const [chartDataCache, setChartDataCache] = useState<
    Record<string, DataPoint[]>
  >({});
  const [isChartDataLoading, setIsChartDataLoading] = useState<
    Record<string, boolean>
  >({});

  // Add a ref to track mounted status for API call management
  const isMounted = useRef(true);

  // Add a ref to store debounced fetch functions
  const debouncedFetchRef = useRef<{ [key: string]: (...args: any[]) => void }>(
    {}
  );

  // Improved cache state - add a loading state map
  const [chartDataLoadState, setChartDataLoadState] = useState<{
    [key: string]: "idle" | "loading" | "success" | "error";
  }>({});

  // Add this state to track specific loading states
  const [loadingState, setLoadingState] = useState({
    fetchingTemplate: false,
    fetchingSystems: false,
    savingTemplate: false,
    loadingCharts: false,
  });

  // Add this state for the currently editing graph
  const [editingGraph, setEditingGraph] = useState<Graph | null>(null);

  // Add this state variable if it doesn't exist
  const [hasChanges, setHasChanges] = useState(false);

  // Add this new state for tracking validity
  const [isFormValid, setIsFormValid] = useState(false);

  // Add these state variables near the top of your component
  const [dataRefreshState, setDataRefreshState] = useState({
    isRefreshing: false,
    lastRefreshTimestamp: null as number | null,
    pendingRefresh: false,
  });

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add a debounced setter for template data to prevent flickering
  const setTemplateDataDebounced = useCallback((updates: Partial<typeof templateData>) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      setTemplateData(prev => ({
        ...prev,
        ...updates
      }));
      debounceTimeoutRef.current = null;
    }, 300);
  }, []);

  // Improved validation function that ensures all required fields are completed
  const validateRequiredFields = () => {
    const newErrors: Record<string, boolean> = {};
    let isValid = true;

    if (!templateData.name.trim()) {
      newErrors.name = true;
      isValid = false;
    }
    if (!templateData.system) {
      newErrors.system = true;
      isValid = false;
    }
    if (!templateData.timeRange) {
      newErrors.timeRange = true;
      isValid = false;
    }
    if (!templateData.resolution) {
      newErrors.resolution = true;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Update the useEffect for isFormValid to properly handle templates with graphs
  useEffect(() => {
    const isValid =
      templateData.name.trim() !== "" &&
      templateData.system !== "" &&
      templateData.timeRange !== "" &&
      templateData.resolution !== "";

    setIsFormValid(isValid);
  }, [
    templateData.name,
    templateData.system,
    templateData.timeRange,
    templateData.resolution,
  ]);

  // Add a function to handle editing a graph
  const handleEditGraph = (graphId: string) => {
    const graphToEdit = graphs.find((graph) => graph.id === graphId);
    
    if (graphToEdit) {
      console.log("Editing graph:", graphToEdit);

      // Create a properly formatted editing graph object with all required fields
      const formattedEditingGraph: Graph = {
        id: graphToEdit.id,
        name: graphToEdit.name,
        type: graphToEdit.type,
        
        // Ensure monitoring area is properly handled
        monitoringArea: graphToEdit.monitoringArea ?? graphToEdit.primary_kpi_ma ?? '', 
        monitoringAreaDesc: graphToEdit.monitoringAreaDesc ?? '',
        
        // Ensure KPI group is properly handled
        kpiGroup: graphToEdit.kpiGroup ?? graphToEdit.primary_kpi_kpigrp ?? '', 
        kpiGroupDesc: graphToEdit.kpiGroupDesc ?? '',
        
        // Ensure primary KPI is properly handled
        primaryKpi: graphToEdit.primaryKpi ?? graphToEdit.primary_kpi_id ?? '', 
        primaryKpiDesc: graphToEdit.primaryKpiDesc ?? '',
        
        // Handle both correlation KPIs formats with all descriptions
        correlationKpis: graphToEdit.correlationKpis ??
          (graphToEdit.secondary_kpis?.map(sk => sk.kpi_id) ?? []),
        correlationKpisDesc: graphToEdit.correlationKpisDesc ?? 
          (graphToEdit.secondary_kpis?.map(sk => sk.kpi_desc || '') ?? []),
        
        // Include any filter values
        primaryFilterValues: graphToEdit.primaryFilterValues ?? [],
        secondaryKpisData: graphToEdit.secondaryKpisData ?? [],
        
        // Preserve the layout
        layout: graphToEdit.layout ?? {
          x: parseInt(graphToEdit.top_xy_pos?.split(':')[0] ?? '0') / 10,
          y: parseInt(graphToEdit.top_xy_pos?.split(':')[1] ?? '0') / 10,
          w: 4,
          h: 2
        },
        
        // Preserve KPI colors and active KPIs
        activeKPIs: graphToEdit.activeKPIs ?? new Set(),
        kpiColors: graphToEdit.kpiColors ?? {},
        
        // Include time interval and resolution if available
        timeInterval: graphToEdit.timeInterval ?? templateData.timeRange,
        resolution: graphToEdit.resolution ?? templateData.resolution
      };

      // Set the editing graph
      setEditingGraph(formattedEditingGraph);

      // Set the selectedTemplate with the current template data and graphs
      setSelectedTemplate({
        id: templateId || Date.now().toString(),
        ...templateData,
        graphs,
      });

      // Open the sheet with a slight delay to ensure state updates
      setTimeout(() => {
        setIsAddGraphSheetOpen(true);
      }, 100);
    } else {
      toast.error("Could not find graph to edit");
      console.error("Graph not found with ID:", graphId);
    }
  };

  // Effect to clean up on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Clear any debounced functions
      Object.values(debouncedFetchRef.current).forEach((debouncedFn: any) => {
        if (debouncedFn.cancel) debouncedFn.cancel();
      });
    };
  }, []);

  // Enhance fetch chart data function to use stricter caching
  const fetchChartData = useCallback(
    (
      cacheKey: string,
      params: {
        primaryKpi: string;
        correlationKpis: string[];
        monitoringArea: string;
        dateRange: { from: Date; to: Date };
        resolution: string;
        graphId?: string;  // Added graphId parameter
      }
    ): Promise<void> => {
      // Skip if already loading or loaded
      if (
        chartDataLoadState[cacheKey] === "loading" ||
        chartDataLoadState[cacheKey] === "success"
      ) {
        return Promise.resolve();
      }

      // Create debounced function if it doesn't exist
      if (!debouncedFetchRef.current[cacheKey]) {
        debouncedFetchRef.current[cacheKey] = debounce(async () => {
          if (!isMounted.current) return;

          setChartDataLoadState((prev) => ({
            ...prev,
            [cacheKey]: "loading",
          }));

          try {
            console.log(`Fetching data for ${cacheKey} with params:`, params);
            // Use retry logic for chart data fetching
            const data = await retryFetch(async () => {
              return await fetchTemplateChartData(
                params.primaryKpi,
                params.correlationKpis,
                params.monitoringArea,
                params.dateRange,
                params.resolution,
                { graphId: params.graphId }  // Pass graphId to fetchTemplateChartData
              );
            }, 3);

            if (!isMounted.current) return;

            if (data && data.length > 0) {
              console.log(`Successfully loaded ${data.length} data points for ${cacheKey}`);
              setChartDataCache((prev) => ({
                ...prev,
                [cacheKey]: data,
              }));
              setChartDataLoadState((prev) => ({
                ...prev,
                [cacheKey]: "success",
              }));
            } else {
              console.warn(`No data received for ${cacheKey}, using dummy data instead`);
              // Create meaningful dummy data based on the KPIs
              const dummyData = getTemplateChartDummyData(params.primaryKpi, params.correlationKpis);

              // Store the dummy data in the cache so we don't keep trying to fetch
              setChartDataCache((prev) => ({
                ...prev,
                [cacheKey]: dummyData,
              }));

              setChartDataLoadState((prev) => ({
                ...prev,
                [cacheKey]: "success",
              }));
            }
          } catch (error) {
            if (!isMounted.current) return;

            console.error(`Error fetching data for ${cacheKey}:`, error);
            setChartDataLoadState((prev) => ({
              ...prev,
              [cacheKey]: "error",
            }));

            // Still provide dummy data on error for better UX
            const dummyData = getTemplateChartDummyData(params.primaryKpi, params.correlationKpis);
            setChartDataCache((prev) => ({
              ...prev,
              [cacheKey]: dummyData,
            }));
          }
        }, 300);
      }

      // Execute the debounced function and return a promise
      debouncedFetchRef.current[cacheKey]();
      return Promise.resolve();
    },
    [chartDataLoadState]
  );

  // Add this function to handle deleting a graph
  const handleDeleteGraph = useCallback((graphId: string) => {
    try {
      // Set template-graph-change flag for dynamic layout
      const templateId = params.id || `new-template-${Date.now()}`;
      localStorage.setItem('template-graph-change', JSON.stringify({
        templateId,
        graphCount: graphs.length - 1,
        timestamp: new Date().toISOString(),
        needsReset: true,
        action: 'delete'
      }));

      // Remove the graph from the state
      setGraphs((prev) => prev.filter((graph) => graph.id !== graphId));
      
      // If no graphs left, hide the graphs section
      if (graphs.length <= 1) {
        setShowGraphs(false);
      }
      
      setHasChanges(true);
      toast.success("Graph removed successfully");
      
      // Force a layout refresh with a slight delay
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 300);
    } catch (error) {
      console.error("Error deleting graph:", error);
      toast.error("Failed to remove graph");
    }
  }, [graphs.length, params.id]);

  // Add stable chart data references
  const chartDataRef = useRef<Record<string, DataPoint[]>>({});
  
  // Modify the renderChartConfigs function to use stable references
  const renderChartConfigs = useCallback(
    (graph: Graph) => {
      // Ensure we have valid primary and correlation KPIs
      const primaryKpi = graph.primaryKpi || "DefaultKPI";
      const correlationKpis = Array.isArray(graph.correlationKpis)
        ? graph.correlationKpis
        : [];

      // Create a deduplicated list of all KPIs
      const allKpis = [primaryKpi, ...correlationKpis].filter(Boolean);

      // Determine monitoring area
      const monitoringArea = primaryKpi.toLowerCase().includes("job")
        ? "JOBS"
        : "OS";

      // Create a unique key for this graph that won't change with template data updates
      const cacheKey = `${graph.id}-${primaryKpi}-${correlationKpis.join("-")}`;
      
      // Instead of using localStorage for tracking fetch attempts (which causes quota issues),
      // use in-memory state tracking with a clean naming scheme
      const fetchAttemptKey = `fetch-attempt-${graph.id}`;
      
      // First check if we've already attempted fetching in this session using memory state
      // Or if we already have data in cache
      const hasFetchAttempted = chartDataLoadState[cacheKey] === "loading" || 
                              chartDataLoadState[cacheKey] === "success" || 
                              chartDataLoadState[cacheKey] === "error" || 
                              chartDataRef.current[cacheKey];

      // Only fetch data once per graph, not on every render or header change
      if (!hasFetchAttempted) {
        // Set loading state
        setChartDataLoadState(prev => ({
          ...prev,
          [cacheKey]: "loading"
        }));
        
        // Create a date range for the preview - only when needed
        const previewDateRange = {
          from: new Date(new Date().setDate(new Date().getDate() - 7)),
          to: new Date(),
        };
        
        // Fetch data with the graph ID for better caching
        fetchChartData(cacheKey, {
          primaryKpi,
          correlationKpis,
          monitoringArea,
          dateRange: previewDateRange,
          resolution: templateData.resolution,
          graphId: graph.id  // Pass graph ID for strict caching
        }).then(() => {
          // Update loading state to success when fetch completes
          setChartDataLoadState(prev => ({
            ...prev,
            [cacheKey]: "success"
          }));
        }).catch(() => {
          // Mark as error if fetch fails
          setChartDataLoadState(prev => ({
            ...prev,
            [cacheKey]: "error"
          }));
        });
      }

      // Use cached data if available, otherwise use dummy data
      if (!chartDataRef.current[cacheKey]) {
        // First attempt to use the cached data from state
        if (chartDataCache[cacheKey] && chartDataCache[cacheKey].length > 0) {
          chartDataRef.current[cacheKey] = chartDataCache[cacheKey];
        } else {
          // If no data in cache, generate dummy data once and store it
          chartDataRef.current[cacheKey] = getTemplateChartDummyData(primaryKpi, correlationKpis);
        }
      }
      
      const chartData = chartDataRef.current[cacheKey];
      const isLoading = chartDataLoadState[cacheKey] === "loading";

      // Check if we need to regenerate stable colors
      // Either we don't have them yet OR the KPIs have changed since last render
      let kpiColors;
      if (!graph.stableKpiColors || 
          // Check if the keys in stableKpiColors match our current KPIs
          !allKpis.every(kpi => kpi in (graph.stableKpiColors || {}))) {
        
        // Generate new stable colors
        const newStableColors = allKpis.reduce((colors, kpi, index) => {
          // Try to preserve existing color if available
          if (graph.kpiColors && kpi in graph.kpiColors) {
            colors[kpi] = graph.kpiColors[kpi];
          } else {
            // Otherwise generate a new color
            colors[kpi] = {
              color: defaultChartTheme.colors[index % defaultChartTheme.colors.length],
              name: kpi, // Use the KPI as name (will be displayed in legend)
            };
          }
          return colors;
        }, {} as Record<string, { color: string; name: string }>);
        
        // Update the graph with new stable colors
        graph.stableKpiColors = newStableColors;
        kpiColors = newStableColors;
        
        console.log(`Generated new stable colors for graph ${graph.id}:`, newStableColors);
      } else {
        // Use existing stable colors
        kpiColors = graph.stableKpiColors;
      }

      return {
        id: graph.id!,
        type: graph.type || "line",
        title: graph.name || "Untitled Chart",
        data: chartData,
        width: graph.layout.w * 100,
        height: graph.layout.h * 60,
        activeKPIs: new Set(allKpis),
        kpiColors: kpiColors,
        hideControls: true,
        onDeleteGraph: handleDeleteGraph,
        onEditGraph: handleEditGraph,
        isLoading,
      };
    },
    [
      chartDataCache,
      chartDataLoadState,
      templateData.resolution, // Only depend on resolution from templateData
      handleDeleteGraph,
      handleEditGraph,
      fetchChartData,
    ]
  );

  // Add a memoized charts array that won't change when template header fields are edited
  const memoizedCharts = React.useMemo(() => 
    graphs.map(renderChartConfigs),
    [graphs, renderChartConfigs]
  );

  // Update useEffect that monitors resolution changes to use the debounced refresh
  useEffect(() => {
    if (dataRefreshState.lastRefreshTimestamp) {
      // Set a flag to indicate a pending refresh rather than immediately refreshing
      setDataRefreshState(prev => ({
        ...prev,
        pendingRefresh: true
      }));
      
      // Schedule a delayed refresh if we're not currently refreshing
      if (!dataRefreshState.isRefreshing) {
        const timeoutId = setTimeout(() => {
          // Only do the refresh if we still have a pending flag
          if (dataRefreshState.pendingRefresh) {
            // Force reset of chartDataLoadState to trigger a refresh
            setChartDataLoadState({});
          }
        }, 2000); // Wait 2 seconds before refreshing after resolution changes
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [templateData.resolution]);

  // Add cleanup for debounce timeout
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchSystems = async () => {
      try {
        setLoadingState((prev) => ({ ...prev, fetchingSystems: true }));

        const data = await retryFetch(async () => {
          const response = await fetch(
            "https://shwsckbvbt.a.pinggy.link/api/sys"
          );
          if (!response.ok) {
            throw new Error("Failed to fetch systems");
          }
          return response.json();
        });

        setSystems(data);

        // Auto-select if there's only one system and no system is currently selected
        if (data.length === 1 && !templateData.system) {
          setTemplateData((prev) => ({
            ...prev,
            system: data[0].system_id.toUpperCase(),
          }));
          setErrors((prev) => ({ ...prev, system: false }));
        }
      } catch (error) {
        console.error("Error fetching systems:", error);
        toast.error("Failed to fetch systems");
      } finally {
        setLoadingState((prev) => ({ ...prev, fetchingSystems: false }));
      }
    };

    fetchSystems();
  }, []);

  // Fetch templates on mount
  useEffect(() => {
    if (templateId) {
      fetchTemplateForEditing(templateId);
      setIsEditMode(true);
    }
  }, [templateId]);

  // Update the fetchTemplateForEditing function to correctly set the system ID
  const fetchTemplateForEditing = async (templateId: string) => {
    try {
      setLoadingState((prev) => ({ ...prev, fetchingTemplate: true }));
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
        // Get the system ID from the first system in the array and ensure it's uppercase
        systemId = (template.systems[0].system_id || "").toUpperCase();
        console.log("Found system ID in template:", systemId);
      } else {
        console.warn("No systems found in template data");
        // If no system in template, try to use the first available system
        if (systems.length > 0) {
          systemId = systems[0].system_id.toUpperCase();
          console.log("Using first available system:", systemId);
        }
      }

      // Map the API response to our local state format
      setTemplateData((prev) => ({
        ...prev,
        name: template.template_name || "",
        system: systemId,
        timeRange: template.frequency || "auto",
        resolution: template.resolution || "auto",
        isDefault: template.default || false,
        isFavorite: template.favorite || false,
        graphs: [],
      }));

      console.log("Template data set with system:", systemId);

      // Show chart loading state while mapping
      setLoadingState((prev) => ({ ...prev, loadingCharts: true }));

      // Map the graphs from API format to our internal format
      const mappedGraphs = template.graphs.map(
        (apiGraph: any, graphIndex: number) => {
          // Extract coordinates from top_xy_pos and bottom_xy_pos
          const [topY, topX] = apiGraph.top_xy_pos.split(":").map(Number);
          const [bottomY, bottomX] = apiGraph.bottom_xy_pos
            .split(":")
            .map(Number);

          // Get primary KPI information
          const primaryKpi = apiGraph.primary_kpi_id;
          const monitoringArea = apiGraph.primary_kpi_ma || "";
          const kpiGroup = apiGraph.primary_kpi_kpigrp || "";

          // Extract secondary KPIs
          const secondaryKpis = apiGraph.secondary_kpis || [];
          const correlationKpis = secondaryKpis.map((sk: any) => sk.kpi_id);

          // Use the utility function to generate consistent colors
          const allKpis = [primaryKpi, ...correlationKpis];
          const { kpiColors: newKpiColors, activeKPIs: newActiveKPIs } =
            generateConsistentColors(allKpis);

          // Normalize filter values to ensure consistent format
          const primaryFilterValues = normalizeFilterValues(
            apiGraph.primary_filter_values
          );

          return {
            id: apiGraph.graph_id,
            name: apiGraph.graph_name,
            type: (apiGraph.graph_type?.toLowerCase() === "bar"
              ? "bar"
              : "line") as "line" | "bar",
            monitoringArea: monitoringArea,
            kpiGroup: kpiGroup,
            primaryKpi: primaryKpi,
            correlationKpis: correlationKpis,
            primaryFilterValues: primaryFilterValues,
            secondaryKpisData: secondaryKpis, // Store the full secondary KPIs data
            layout: {
              x: topX / 10,
              y: topY / 10,
              w: (bottomX - topX) / 10,
              h: (bottomY - topY) / 10,
            },
            activeKPIs: newActiveKPIs,
            kpiColors: newKpiColors,
          };
        }
      );

      setGraphs(mappedGraphs);
      setShowGraphs(mappedGraphs.length > 0);

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
      setLoadingState((prev) => ({
        ...prev,
        fetchingTemplate: false,
        loadingCharts: false,
      }));
    }
  };

  const validateFields = () => {
    const newErrors: Record<string, boolean> = {};
    if (!templateData.name.trim()) newErrors.name = true;
    if (!templateData.system) newErrors.system = true;
    if (!templateData.timeRange) newErrors.timeRange = true;
    if (!templateData.resolution) newErrors.resolution = true;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateGraphData = (graphData: Graph) => {
    if (
      !graphData.name ||
      !graphData.monitoringArea ||
      !graphData.kpiGroup ||
      !graphData.primaryKpi
    ) {
      return ERROR_MESSAGES.VALIDATION_ERROR;
    }
    if (!graphData.type || !["line", "bar"].includes(graphData.type)) {
      return ERROR_MESSAGES.GRAPH_TYPE_ERROR;
    }
    if (!graphData.layout || typeof graphData.layout.x !== "number") {
      return ERROR_MESSAGES.LAYOUT_ERROR;
    }
    return null;
  };

  const handleAddGraph = () => {
    if (!validateRequiredFields()) {
      toast.error("Please fill in all required fields", {
        description: "Template name, System, Time Range, and Resolution are required",
        dismissible: true,
      });
      return;
    }
    
    if (graphs.length >= 9) {
      toast.error(ERROR_MESSAGES.MAX_GRAPHS);
      return;
    }
  
    setSelectedTemplate({
      id: Date.now().toString(),
      ...templateData,
      graphs,
    });
    setIsAddGraphSheetOpen(true);
  };

  // Modify the handleSaveTemplate function to check for unique template name
  const handleSaveTemplate = async (e: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    // Validate required fields first
    if (!validateRequiredFields()) {
      toast.error("Please fill in all required fields", {
        description: "Template name, System, Time Range, and Resolution are required",
        dismissible: true,
      });
      return;
    }

    // Then check if we have graphs
    if (graphs.length === 0) {
      toast.error(ERROR_MESSAGES.MIN_GRAPHS, {
        dismissible: true
      });
      return;
    }

    // Rest of the function stays the same...
    try {
      setLoadingState((prev) => ({ ...prev, savingTemplate: true }));

      // First, check if the template name is unique
      const templatesResponse = await fetch(
        `${app_globals.base_url}/api/utl?userId=${app_globals.default_user_id}`
      );

      if (!templatesResponse.ok) {
        throw new Error("Failed to fetch templates for name validation");
      }

      const existingTemplates = await templatesResponse.json();

      // Extract template names (handle the array format from the API)
      const existingTemplateNames = existingTemplates.map((template: any) =>
        Array.isArray(template.template_name)
          ? template.template_name[0].toLowerCase()
          : template.template_name.toLowerCase()
      );

      // Extract current template ID if in edit mode
      const currentTemplateId = isEditMode ? searchParams.get("templateId") : null;

      // Check if name exists, but ignore if it's the same template being edited
      const nameExists = existingTemplates.some((template: any) => {
        const templateName = Array.isArray(template.template_name)
          ? template.template_name[0].toLowerCase()
          : template.template_name.toLowerCase();

        const templateId = Array.isArray(template.template_id)
          ? template.template_id[0]
          : template.template_id;

        // If we're editing and this is the same template, don't count it as a duplicate
        if (isEditMode && templateId === currentTemplateId) {
          return false;
        }

        return templateName === templateData.name.toLowerCase();
      });

      if (nameExists) {
        toast.error("Template name already exists", {
          description: "Please choose a different name for your template",
          dismissible: true,
        });
        setLoadingState((prev) => ({ ...prev, savingTemplate: false }));
        return;
      }

      // Use existing templateId if in edit mode, otherwise create a new one
      const newTemplateId = isEditMode
        ? searchParams.get("templateId") || ""
        : `USER_TEST_1_${templateData.name
            .toUpperCase()
            .replace(/\s+/g, "_")}_${Date.now()}`;
            
      // Make sure all graphs have valid layout positions
      const graphsWithValidLayout = graphs.map((graph, index) => {
        // If graph doesn't have layout or has invalid layout values, assign default values
        if (!graph.layout || 
            typeof graph.layout.x !== 'number' || 
            typeof graph.layout.y !== 'number' || 
            typeof graph.layout.w !== 'number' || 
            typeof graph.layout.h !== 'number') {
          
          // Calculate default position based on index
          const row = Math.floor(index / 3);
          const col = index % 3;
          
          return {
            ...graph,
            layout: {
              x: col * 4,
              y: row * 6,
              w: 4,
              h: 6
            }
          };
        }
        return graph;
      });

      // Format each graph according to the API structure
      const apiFormattedGraphs = graphsWithValidLayout.map((graph, index) => {
        // Ensure layout properties are numbers before multiplying
        const x = Number(graph.layout.x) * 10;
        const y = Number(graph.layout.y) * 10;
        const w = Number(graph.layout.w) * 10;
        const h = Number(graph.layout.h) * 10;
        
        // Calculate positions based on layout
        const topPos = `${y}:${x}`;
        const bottomPos = `${y + h}:${x + w}`;

        // Format secondary KPIs
        const formattedSecondaryKpis = graph.correlationKpis.map(
          (kpi, kpiIndex) => {
            // Get descriptions
            const kpiDesc = graph.correlationKpisDesc?.[kpiIndex] || "";

            // If we have detailed secondaryKpisData, use it
            if (graph.secondaryKpisData && graph.secondaryKpisData[kpiIndex]) {
              return {
                ma: graph.secondaryKpisData[kpiIndex].ma || graph.monitoringArea,
                ma_desc:
                  graph.secondaryKpisData[kpiIndex].ma_desc ||
                  graph.monitoringAreaDesc ||
                  "",
                kpigrp:
                  graph.secondaryKpisData[kpiIndex].kpigrp || graph.kpiGroup,
                kpigrp_desc:
                  graph.secondaryKpisData[kpiIndex].kpigrp_desc ||
                  graph.kpiGroupDesc ||
                  "",
                kpi_id: kpi,
                kpi_desc:
                  graph.secondaryKpisData[kpiIndex].kpi_desc || kpiDesc || "",
                filter_values: normalizeFilterValues(
                  graph.secondaryKpisData[kpiIndex].filter_values || []
                ),
              };
            }

            // Otherwise use the monitoring area and KPI group from the primary KPI
            return {
              ma: graph.monitoringArea,
              ma_desc: graph.monitoringAreaDesc || "",
              kpigrp: graph.kpiGroup,
              kpigrp_desc: graph.kpiGroupDesc || "",
              kpi_id: kpi,
              kpi_desc: kpiDesc || "",
              filter_values: [],
            };
          }
        );

        return {
          graph_id: graph.id || `${newTemplateId}_G${index + 1}`,
          graph_name: graph.name,
          graph_type: graph.type === "bar" ? "Bar" : "Line",
          top_xy_pos: topPos,
          bottom_xy_pos: bottomPos,
          frequency: templateData.timeRange,
          resolution: templateData.resolution,
          systems: [
            {
              system_id: templateData.system.toLowerCase(),
            },
          ],
          // Add all required fields with their values and descriptions
          primary_kpi_ma: graph.monitoringArea,
          primary_kpi_ma_desc: graph.monitoringAreaDesc || "",
          primary_kpi_kpigrp: graph.kpiGroup,
          primary_kpi_kpigrp_desc: graph.kpiGroupDesc || "",
          primary_kpi_id: graph.primaryKpi,
          primary_kpi_desc: graph.primaryKpiDesc || "",
          primary_filter_values: normalizeFilterValues(
            graph.primaryFilterValues
          ),
          secondary_kpis: formattedSecondaryKpis,
        };
      });

      // If this template is being set as default, we need to check other templates
      if (templateData.isDefault) {
        try {
          // First, fetch all templates for the user
          const templatesResponse = await fetch(
            `${app_globals.base_url}/api/utl?userId=${app_globals.default_user_id}`
          );

          if (!templatesResponse.ok) {
            throw new Error("Failed to fetch templates");
          }

          const templates = await templatesResponse.json();

          // Find any template that is currently set as default
          const defaultTemplate = templates.find((template: any) =>
            Array.isArray(template.default) ? template.default[0] : template.default
          );

          // If there is a default template and it's not the current one being edited
          if (defaultTemplate &&
              (!isEditMode ||
               (Array.isArray(defaultTemplate.template_id)
                ? defaultTemplate.template_id[0]
                : defaultTemplate.template_id) !== newTemplateId)) {
                
            // Get the template ID for fetching detailed template data
            const existingDefaultTemplateId = Array.isArray(defaultTemplate.template_id)
              ? defaultTemplate.template_id[0]
              : defaultTemplate.template_id;
              
            // Fetch the FULL detailed template data to ensure we have all graphs
            const detailResponse = await fetch(
              `${app_globals.base_url}/api/ut?templateId=${existingDefaultTemplateId}`
            );
            
            if (!detailResponse.ok) {
              throw new Error("Failed to fetch detailed template data for the previous default template");
            }
            
            const detailData = await detailResponse.json();
            if (!detailData || !Array.isArray(detailData) || !detailData.length) {
              throw new Error("No data returned for the previous default template");
            }
            
            // Use the complete detailed data of the template
            const completeDefaultTemplate = detailData[0];
            
            // Create the update payload with ALL the original data and just change default to false
            const updateDefaultTemplate = {
              user_id: app_globals.default_user_id,
              template_id: existingDefaultTemplateId,
              template_name: Array.isArray(completeDefaultTemplate.template_name)
                ? completeDefaultTemplate.template_name[0]
                : completeDefaultTemplate.template_name,
              template_desc: Array.isArray(completeDefaultTemplate.template_desc)
                ? completeDefaultTemplate.template_desc[0]
                : completeDefaultTemplate.template_desc,
              default: false, // Set default to false
              favorite: Array.isArray(completeDefaultTemplate.favorite)
                ? completeDefaultTemplate.favorite[0]
                : completeDefaultTemplate.favorite,
              frequency: completeDefaultTemplate.frequency
                ? Array.isArray(completeDefaultTemplate.frequency)
                  ? completeDefaultTemplate.frequency[0]
                  : completeDefaultTemplate.frequency
                : "auto",
              systems: completeDefaultTemplate.systems || [],
              graphs: completeDefaultTemplate.graphs || [], // Keep ALL original graphs
            };

            console.log("Updating previous default template with complete data:", 
              JSON.stringify({
                templateId: existingDefaultTemplateId,
                graphCount: updateDefaultTemplate.graphs.length
              }));

            const updateResponse = await fetch(
              `${app_globals.base_url}/api/ut`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(updateDefaultTemplate),
              }
            );

            if (!updateResponse.ok) {
              const errorText = await updateResponse.text();
              console.error("Failed to update existing default template:", errorText);
              throw new Error(`Failed to update existing default template: ${errorText}`);
            }
          }
        } catch (error) {
          console.error("Error handling default template:", error);
          // Show toast but continue with saving the new template
          toast.error("Warning: There was an issue updating the previous default template.", {
            description: "Your template was still saved as default.",
            dismissible: true
          });
        }
      }

      const templatePayload = {
        user_id: app_globals.default_user_id, // Use the centralized user ID from config
        template_id: newTemplateId,
        template_name: templateData.name,
        template_desc: `${templateData.name} Template`, // Description
        default: templateData.isDefault,
        favorite: templateData.isFavorite,
        frequency: templateData.timeRange,
        systems: [
          {
            system_id: templateData.system.toLowerCase(),
          },
        ],
        graphs: apiFormattedGraphs,
      };

      // Log the request to confirm it matches the expected format
      console.log(
        "Submitting template:",
        JSON.stringify(templatePayload, null, 2)
      );

      const response = await fetch(`${app_globals.base_url}/api/ut`, {
        method: "POST", // API uses POST for both create and update
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(templatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || ERROR_MESSAGES.SAVE_ERROR);
      }

      const savedTemplate = await response.json();

      toast.success(
        isEditMode
          ? "Template updated successfully"
          : SUCCESS_MESSAGES.TEMPLATE_SAVED,
        {
          description: isEditMode
            ? "Your template has been updated successfully"
            : "Your template has been saved successfully",
          dismissible: true,
        }
      );

      // Reset form or redirect after successful save
      if (!isEditMode) {
        // Redirect to templates page after adding a new template
        router.push("/templates");
      } else {
        // Already redirects to templates list after editing
        router.push("/templates");
      }

      setHasChanges(false);
    } catch (error) {
      console.error("Save template error:", error);
      toast.error(ERROR_MESSAGES.SAVE_ERROR, {
        description:
          error instanceof Error ? error.message : "Please try again",
        dismissible: true,
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, savingTemplate: false }));
    }
  };


  // Modify the handleAddGraphToTemplate function to capture descriptions

  const handleAddGraphToTemplate = (graphData: Graph) => {
    if (graphs.length >= 9) {
      toast.error(ERROR_MESSAGES.MAX_GRAPHS, {
        dismissible: true
      });
      return;
    }
  
    try {
      // Use the utility function to generate consistent colors
      const allKpis = [graphData.primaryKpi, ...graphData.correlationKpis];
      const { kpiColors: newKpiColors, activeKPIs: newActiveKPIs } =
        generateConsistentColors(allKpis);

      // Set template-graph-change flag for dynamic layout on initial view
      // Use a temporary ID or 'new-template' for templates that don't have an ID yet
      const templateId = params.id || `new-template-${Date.now()}`;
      localStorage.setItem('template-graph-change', JSON.stringify({
        templateId,
        graphCount: graphs.length + 1,
        timestamp: new Date().toISOString(),
        needsReset: true,
        action: 'add'
      }));

      // Calculate optimal layout based on number of graphs
      let layout = { x: 0, y: 0, w: 4, h: 4 }; // Default layout
  
      // Current graph count (not including the one we're adding)
      const currentGraphCount = graphs.length;
      
      // Create layout based on where this graph would go in the sequence
      switch (currentGraphCount) {
        case 0: // First graph (1 total)
          layout = { x: 0, y: 0, w: 12, h: 8 };
          break;
        case 1: // Second graph (2 total)
          layout = { x: 0, y: 8, w: 12, h: 8 };
          break;
        case 2: // Third graph (3 total)
          layout = { x: 0, y: 16, w: 12, h: 8 };
          break;
        case 3: // Fourth graph (4 total)
          // Reposition for 2x2 grid
          // First row, second column
          layout = { x: 6, y: 0, w: 6, h: 8 };
          // Update previous graphs for 2x2 layout
          setGraphs(prev => prev.map((g, i) => {
            if (i === 0) return { ...g, layout: { x: 0, y: 0, w: 6, h: 8 } };
            if (i === 1) return { ...g, layout: { x: 0, y: 8, w: 6, h: 8 } };
            if (i === 2) return { ...g, layout: { x: 6, y: 8, w: 6, h: 8 } };
            return g;
          }));
          break;
        case 4: // Fifth graph (5 total)
          // First row, third column
          layout = { x: 8, y: 0, w: 4, h: 6 };
          // Update previous graphs for new layout
          setGraphs(prev => prev.map((g, i) => {
            if (i === 0) return { ...g, layout: { x: 0, y: 0, w: 4, h: 6 } };
            if (i === 1) return { ...g, layout: { x: 4, y: 0, w: 4, h: 6 } };
            if (i === 2) return { ...g, layout: { x: 0, y: 6, w: 6, h: 6 } };
            if (i === 3) return { ...g, layout: { x: 6, y: 6, w: 6, h: 6 } };
            return g;
          }));
          break;
        case 5: // Sixth graph (6 total)
          // 2x3 grid layout
          layout = { x: 8, y: 6, w: 4, h: 6 };
          break;
        case 6: // Seventh graph (7 total)
          // 7 graph layout - wide graph on bottom
          layout = { x: 0, y: 12, w: 12, h: 6 };
          break;
        case 7: // Eighth graph (8 total)
          // 4x2 grid for 8 graphs
          layout = { x: 6, y: 12, w: 6, h: 6 };
          // Update previous graphs
          setGraphs(prev => prev.map((g, i) => {
            if (i === 6) return { ...g, layout: { x: 0, y: 12, w: 6, h: 6 } };
            return g;
          }));
          break;
        case 8: // Ninth graph (9 total)
          // 3x3 grid for 9 graphs
          layout = { x: 8, y: 12, w: 4, h: 6 };
          // Update previous graphs for 3x3 layout
          setGraphs(prev => prev.map((g, i) => {
            if (i === 6) return { ...g, layout: { x: 0, y: 12, w: 4, h: 6 } };
            if (i === 7) return { ...g, layout: { x: 4, y: 12, w: 4, h: 6 } };
            return g;
          }));
          break;
      }
  
      // Create API-compatible graph object with calculated layout
      const newGraph: Graph = {
        ...graphData,
        id: `graph-${Date.now()}`,
        activeKPIs: newActiveKPIs,
        kpiColors: newKpiColors,

        // Use the selected timeInterval and resolution from the form
        timeInterval: graphData.timeInterval || templateData.timeRange,
        resolution: graphData.resolution || templateData.resolution,

        layout: layout,
      };
  
      // Update graphs and show immediately
      setGraphs((prev) => [...prev, newGraph]);
      setShowGraphs(true);
      setIsAddGraphSheetOpen(false);
      setHasChanges(true);



      // Force a layout refresh with a slight delay to ensure DynamicLayout can recalculate


      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 300);
  
      toast.success(SUCCESS_MESSAGES.GRAPH_ADDED, {
        dismissible: true
      });
    } catch (error) {
      console.error("Error adding graph:", error);
      toast.error(ERROR_MESSAGES.ADD_GRAPH_ERROR, {
        dismissible: true
      });
    }
  };

  // Modify the handleUpdateGraph function to update descriptions
  const handleUpdateGraph = (graphId: string, graphData: any) => {
    try {
      // Create a list of all KPIs (primary + correlation)
      const allKpis = [graphData.primaryKpi, ...graphData.correlationKpis];
      
      // Find the existing graph to preserve properties not included in graphData
      const existingGraph = graphs.find((graph) => graph.id === graphId);
      if (!existingGraph) {
        console.error(`Could not find graph with ID ${graphId} for updating`);
        toast.error("Failed to update graph: Graph not found");
        return;
      }
      
      // Use the kpisChanged flag from graphData to determine if we need to regenerate colors
      const kpisChanged = graphData.kpisChanged ?? false;
      console.log("KPIs changed flag from graph sheet:", kpisChanged);
      
      // Only regenerate colors if KPIs have changed
      let newKpiColors, newActiveKPIs;
      if (kpisChanged) {
        // Generate new colors for changed KPIs
        const { kpiColors, activeKPIs } = generateConsistentColors(allKpis);
        newKpiColors = kpiColors;
        newActiveKPIs = activeKPIs;
        
        console.log("Generated new KPI colors and active KPIs:", {
          kpiColors,
          activeKPIsArray: Array.from(activeKPIs)
        });
      } else {
        // If KPIs haven't changed, preserve the existing colors and active KPIs
        newKpiColors = existingGraph.kpiColors;
        newActiveKPIs = existingGraph.activeKPIs;
      }

      // Log what we're updating for debugging
      console.log("Updating graph with new data:", graphData);

      setGraphs((prev) =>
        prev.map((graph) =>
          graph.id === graphId
            ? {
                ...graph,
                // Basic graph properties
                name: graphData.name,
                type: graphData.type,
                
                // Monitoring area with description
                monitoringArea: graphData.monitoringArea,
                monitoringAreaDesc: graphData.monitoringAreaDesc,
                
                // KPI group with description
                kpiGroup: graphData.kpiGroup,
                kpiGroupDesc: graphData.kpiGroupDesc,
                
                // Primary KPI with description
                primaryKpi: graphData.primaryKpi,
                primaryKpiDesc: graphData.primaryKpiDesc,
                
                // Correlation KPIs with descriptions
                correlationKpis: graphData.correlationKpis,
                correlationKpisDesc: graphData.correlationKpisDesc,
                
                // Preserve filter values and secondary KPI data from existing graph
                // or use the new ones if provided
                primaryFilterValues: graphData.primaryFilterValues || existingGraph.primaryFilterValues || [],
                secondaryKpisData: graphData.secondaryKpisData || existingGraph.secondaryKpisData || [],
                
                // Update active KPIs and KPI colors - important for displaying the right data
                activeKPIs: newActiveKPIs,
                kpiColors: newKpiColors,
                
                // Clear stableKpiColors to force regeneration with the new KPI names
                stableKpiColors: kpisChanged ? undefined : graph.stableKpiColors,
                
                // Preserve time interval and resolution if provided, otherwise keep existing
                timeInterval: graphData.timeInterval || existingGraph.timeInterval || templateData.timeRange,
                resolution: graphData.resolution || existingGraph.resolution || templateData.resolution,

                // Preserve existing layout - this is important for layout persistence
                layout: graph.layout && Object.keys(graph.layout).length === 4
                  ? graph.layout // Use existing layout if valid
                  : { x: 0, y: 0, w: 4, h: 4 }, // Fallback
              }
            : graph
        )
      );

      // Set graph change flag in localStorage to trigger dashboard refresh if needed
      if (kpisChanged && params.id) {
        localStorage.setItem('template-graph-change', JSON.stringify({
          templateId: params.id,
          graphCount: graphs.length,
          timestamp: new Date().toISOString(),
          needsReset: true,
          action: 'update',
          changeId: `update-${graphId}-${Date.now()}`
        }));
      }

      setIsAddGraphSheetOpen(false);
      setEditingGraph(null);
      setHasChanges(true);
      toast.success("Graph updated successfully");

      // Force re-render of charts with new data
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 200);
    } catch (error) {
      console.error("Error updating graph:", error);
      toast.error("Failed to update graph");
    }
  };

  const handleLayoutReset = useCallback(async (newLayout: Layout[]) => {
    console.log("Layout reset requested from DynamicLayout");
    
    // Map the layout to the graphs
    const updatedGraphs = graphs.map((graph, index) => {
      // Find the corresponding layout
      const layout = newLayout.find(l => l.i === graph.id);
      
      if (layout) {
        return {
          ...graph,
          layout: {
            x: layout.x,
            y: layout.y,
            w: layout.w,
            h: layout.h
          }
        };
      }
      
      return graph;
    });
    
    setGraphs(updatedGraphs);
    setHasChanges(true);
    
    // Set a flag to indicate layout has been optimized
    localStorage.setItem('template-layout-optimized', 'true');
    
    return Promise.resolve();
  }, [graphs]);

  // On component mount, check if we need to trigger a layout reset
  
  useEffect(() => {
    if (graphs.length > 0 && !localStorage.getItem('template-layout-optimized')) {
      // Set the flag for layout reset on first render with graphs
      const templateId = params.id ? String(params.id) : `new-template-${Date.now()}`;
      localStorage.setItem('template-graph-change', JSON.stringify({
        templateId,
        graphCount: graphs.length,
        timestamp: new Date().toISOString(),
        needsReset: true,
        action: 'initialize'
      }));
    }
  }, [graphs.length, params]);

  const pageTitle = isEditMode ? "Edit Template" : "Create Template";

  // Instead of early return for loading state, we'll use conditional rendering
    return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background/98 to-background/95 overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        {isLoading ? (
          // Loading state
          <div className="flex h-screen items-center justify-center">
        <div className="bg-card/90 backdrop-blur-sm border border-border/40 shadow-xl p-8 max-w-md">
          <LoadingSpinner
            message={`${isEditMode ? "Loading" : "Creating"} template...`}
          />
        </div>
      </div>
        ) : (
          // Main content when not loading
        <div className="container mx-auto px-2 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed top-0 left-0 right-0 z-50 px-2 py-4 bg-background/95 backdrop-blur-sm border-b border-border/40"
          >
            {/* Combined header with all controls in a single row */}
            <div className="container mx-auto rounded-lg bg-card/90 border border-border/40 shadow-md p-4 backdrop-blur-sm">
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0">
                {/* Left side - title */}
                <div className="md:w-1/5 flex-shrink-0">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent tracking-tight">
                    {pageTitle}
                  </h1>
                  <p className="text-muted-foreground/90 text-sm mt-1 hidden md:block">
                    Create and manage your monitoring templates
                  </p>
                </div>

                {/* Right side - all controls in a row */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-12 gap-3">
                  {/* Template Name */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-foreground/70 mb-1">
                      Template Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                        className={`h-9 text-sm ${
                          errors.name ? "border-red-500 focus-visible:ring-red-500" : ""
                        }`}
                        placeholder="Enter name"
                      value={templateData.name}
                      onChange={(e) => {
                          setTemplateData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }));
                          setErrors((prev) => ({ ...prev, name: false }));
                        }}
                    />
                  </div>

                    {/* System */}
                    <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-foreground/70 mb-1">
                      System <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={templateData.system}
                      onValueChange={(value) => {
                          setTemplateData((prev) => ({
                            ...prev,
                            system: value,
                          }));
                          setErrors((prev) => ({ ...prev, system: false }));
                      }}
                        disabled={loadingState.fetchingSystems}
                    >
                      <SelectTrigger
                        className={`h-9 text-sm ${
                            errors.system ? "border-red-500 focus-visible:ring-red-500" : ""
                        }`}
                        onMouseEnter={(e) => {
                          // Find the button and programmatically click it on hover
                          const button = e.currentTarget.querySelector('button');
                          if (button) button.click();
                        }}
                      >
                          <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
                        {systems.map((system) => (
                            <SelectItem key={system.system_id} value={system.system_id}>
                              {system.system_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Time Range */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-foreground/70 mb-1">
                      Time Range <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={templateData.timeRange}
                      onValueChange={(value) => {
                        setTemplateData((prev) => ({
                          ...prev,
                          timeRange: value,
                        }));
                        setErrors((prev) => ({ ...prev, timeRange: false }));
                      }}
                    >
                      <SelectTrigger
                        className={`h-9 text-sm ${
                          errors.timeRange
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }`}
                        onMouseEnter={(e) => {
                          // Find the button and programmatically click it on hover
                          const button = e.currentTarget.querySelector('button');
                          if (button) button.click();
                        }}
                      >
                        <SelectValue placeholder="Select">
                          {templateData.timeRange ? timeRangeLabels[templateData.timeRange] || templateData.timeRange : "Select"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
                        {timeRangeOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {timeRangeLabels[option] || option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Resolution */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-foreground/70 mb-1">
                      Resolution <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={templateData.resolution}
                      onValueChange={(value) => {
                        setTemplateData((prev) => ({
                          ...prev,
                          resolution: value,
                        }));
                        setErrors((prev) => ({ ...prev, resolution: false }));
                      }}
                    >
                      <SelectTrigger
                        className={`h-9 text-sm ${
                          errors.resolution
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }`}
                        onMouseEnter={(e) => {
                          // Find the button and programmatically click it on hover
                          const button = e.currentTarget.querySelector('button');
                          if (button) button.click();
                        }}
                      >
                        <SelectValue placeholder="Select">
                          {templateData.resolution ? resolutionOptions.find(opt => opt.value === templateData.resolution)?.label || templateData.resolution : "Select"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent onCloseAutoFocus={(e) => e.preventDefault()}>
                        {resolutionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Switches and Save Button */}
                  <div className="md:col-span-2 flex flex-row items-end justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Switch
                          id="default-toggle"
                          checked={templateData.isDefault}
                          onCheckedChange={(checked) =>
                            setTemplateData((prev) => ({
                              ...prev,
                              isDefault: checked,
                            }))
                          }
                          className="scale-90"
                        />
                        <label
                          htmlFor="default-toggle"
                          className="text-xs font-medium cursor-pointer"
                        >
                          Default
                        </label>
                      </div>
                      <div className="flex items-center gap-1">
                        <Switch
                          id="favorite-toggle"
                          checked={templateData.isFavorite}
                          onCheckedChange={(checked) =>
                            setTemplateData((prev) => ({
                              ...prev,
                              isFavorite: checked,
                            }))
                          }
                          className="scale-90"
                        />
                        <label
                          htmlFor="favorite-toggle"
                          className="text-xs font-medium cursor-pointer"
                        >
                          Favorite
                        </label>
                      </div>
                    </div>

                    <Button
                      variant="default"
                      onClick={handleSaveTemplate}
                      type="submit"
                      disabled={
                        !isFormValid || (showGraphs && graphs.length === 0)
                      }
                      className="h-9 px-4 whitespace-nowrap ml-2"
                      size="sm"
                    >
                      {isEditMode ? "Update Template" : "Save Template"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Add padding to account for fixed header */}
          <div className="pt-[120px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-2"
            >
              {/* Add Graph section with border */}
              <div className="border border-border rounded-lg p-4">
                <Card
                  className="p-6 backdrop-blur-sm bg-card/90 border border-border/40 shadow-xl hover:shadow-2xl transition-shadow duration-300 cursor-pointer"
                  onClick={handleAddGraph}
                >
                  <div className="flex flex-col items-center justify-center py-4">
                    <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                    <h3 className="text-base font-medium text-foreground/90">
                      {showGraphs && graphs.length > 0
                        ? "Add Another Graph"
                        : "Add Graph"}
                    </h3>
                    {!showGraphs && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Click to add a new graph to your template
                      </p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Graphs container */}
              {showGraphs && graphs.length > 0 && (
                <div className="mt-6">
                  <DynamicLayout
                    charts={memoizedCharts}
                    theme={defaultChartTheme}
                    resolution={templateData.resolution}
                    onDeleteGraph={handleDeleteGraph}
                    onEditGraph={handleEditGraph}
                    onLayoutReset={handleLayoutReset}
                    isTemplatePage={true}
                    hideControls={true}
                  />
                </div>
              )}
            </motion.div>

              {/* Always render the Sheet component, but control visibility with isOpen prop */}
            <Sheet
              isOpen={isAddGraphSheetOpen}
              onClose={() => {
                setIsAddGraphSheetOpen(false);
                setEditingGraph(null);
              }}
              title={editingGraph ? "Edit Graph" : "Add Graph to Template"}
            >
                {/* Create the content conditionally, not the whole component */}
                {selectedTemplate ? (
                <AddGraphSheet
                  template={selectedTemplate}
                  editingGraph={
                    editingGraph
                      ? {
                          id: editingGraph.id || "",
                          name: editingGraph.name,
                          type: editingGraph.type,
                          monitoringArea: editingGraph.monitoringArea,
                            monitoringAreaDesc: editingGraph.monitoringAreaDesc,
                          kpiGroup: editingGraph.kpiGroup,
                            kpiGroupDesc: editingGraph.kpiGroupDesc,
                          primaryKpi: editingGraph.primaryKpi,
                            primaryKpiDesc: editingGraph.primaryKpiDesc,
                          correlationKpis: editingGraph.correlationKpis,
                            correlationKpisDesc: editingGraph.correlationKpisDesc,
                          layout: editingGraph.layout,
                          activeKPIs: editingGraph.activeKPIs,
                            kpiColors: editingGraph.kpiColors
                        }
                      : null
                  }
                  onClose={() => {
                    setIsAddGraphSheetOpen(false);
                    setEditingGraph(null);
                  }}
                  onAddGraph={(graphData) => {
                    // Prevent multiple calls by immediately disabling the sheet
                    setIsAddGraphSheetOpen(false);

                    if (editingGraph) {
                      // Update existing graph
                      handleUpdateGraph(editingGraph.id!, graphData);
                    } else {
                      // Add new graph
                      const completeGraphData: Graph = {
                        ...graphData,
                        activeKPIs: graphData.activeKPIs || new Set<string>(),
                        kpiColors: graphData.kpiColors || {},
                      };
                      handleAddGraphToTemplate(completeGraphData);
                    }
                  }}
                />
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    Please complete the template details first.
                  </div>
              )}
            </Sheet>
          </div>
        </div>
        )}
      </main>
    </div>
  );
}

// Main component wrapped with Suspense
export default function TemplatesPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading template details..." />}>
      <TemplatePageContent />
    </Suspense>
  );
}
