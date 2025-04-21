"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
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
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import debounce from "lodash/debounce";

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

interface Graph {
  id?: string;
  name: string;
  type: "line" | "bar";
  monitoringArea: string;
  kpiGroup: string;
  primaryKpi: string;
  correlationKpis: string[];
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  activeKPIs: Set<string> | string[]; // Changed to support both Set and Array
  kpiColors: Record<string, { color: string; name: string }>;
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

const systemOptions = ["SVW", "System 1", "System 2"];

// Add this near the top of the file with other constants
const resolutionOptions = [
  { value: "auto", label: "Auto" },
  { value: "1m", label: "1 Minute" },
  { value: "5m", label: "5 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "1d", label: "1 Day" }
];

// Utility function to create vibrant, consistent colors for KPIs
const generateConsistentColors = (kpis: string[]) => {
  // Use our default theme colors for consistency
  const colorPalette = defaultChartTheme.colors;

  const kpiColors: Record<string, { color: string; name: string }> = {};
  const activeKPIs = new Set<string>();

  kpis.forEach((kpi, index) => {
    const kpiLower = kpi.toLowerCase();
    activeKPIs.add(kpiLower);
    kpiColors[kpiLower] = {
      color: colorPalette[index % colorPalette.length],
      name: kpi,
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
        console.log(`API call failed, retrying (${attempt + 1}/${maxRetries})...`, error);

        // Wait before the next retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  // If we've exhausted all retries, throw the last error
  throw lastError;
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

export default function TemplatesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
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

  // Add state for the currently editing graph
  const [editingGraph, setEditingGraph] = useState<Graph | null>(null);

  // Add this state variable if it doesn't exist
  const [hasChanges, setHasChanges] = useState(false);

  // Add this new state for tracking validity
  const [isFormValid, setIsFormValid] = useState(false);

  // Update the useEffect for isFormValid to properly handle templates with graphs
  useEffect(() => {
    const isValid = 
      templateData.name.trim() !== '' &&
      templateData.system !== '' &&
      templateData.timeRange !== '' &&
      templateData.resolution !== '';

    // Set form as valid when all required fields are filled
    setIsFormValid(isValid);
  }, [templateData.name, templateData.system, templateData.timeRange, templateData.resolution]);

  // Add a function to handle editing a graph
  const handleEditGraph = (graphId: string) => {
    // Check if the graph was just added (has a temporary ID)
    const isNewlyAddedGraph = graphId.startsWith('graph-') && !isEditMode && hasChanges;

    if (isNewlyAddedGraph) {
      // Show a friendly toast message instead of letting the error occur
      toast.warning("Please save the template first before editing this newly added graph.");
      return;
    }

    // Otherwise, proceed with normal edit flow
    const graphToEdit = graphs.find(graph => graph.id === graphId);
    if (graphToEdit) {
      // First set the selectedTemplate - this is the key fix
      setSelectedTemplate({
        id: Date.now().toString(),
        ...templateData,
        graphs,
      });

      // Then set the editing graph and open the sheet
      setEditingGraph(graphToEdit);
      setIsAddGraphSheetOpen(true);
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

  // Enhanced fetch chart data function with proper API connection
  const fetchChartData = useCallback(
    (
      cacheKey: string,
      params: {
        primaryKpi: string;
        correlationKpis: string[];
        monitoringArea: string;
        dateRange: { from: Date; to: Date };
        resolution: string;
      }
    ) => {
      // Skip if already loading or loaded
      if (
        chartDataLoadState[cacheKey] === "loading" ||
        chartDataLoadState[cacheKey] === "success"
      ) {
        return;
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
                params.resolution
              );
            }, 3); // Increase retries to 3

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
              const dummyData = generateDummyData([params.primaryKpi, ...params.correlationKpis]);

              // Store the dummy data in the cache so we don't keep trying to fetch
              setChartDataCache((prev) => ({
                ...prev,
                [cacheKey]: dummyData,
              }));

              setChartDataLoadState((prev) => ({
                ...prev,
                [cacheKey]: "success", // Mark as success to prevent re-fetching
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
            const dummyData = generateDummyData([params.primaryKpi, ...params.correlationKpis]);
            setChartDataCache((prev) => ({
              ...prev,
              [cacheKey]: dummyData,
            }));
          }
        }, 300); // 300ms debounce
      }

      // Execute the debounced function
      debouncedFetchRef.current[cacheKey]();
    },
    [chartDataLoadState]
  );

  // Convert to useCallback to avoid stale closure issues
  const handleDeleteGraph = useCallback(
    (graphId: string) => {
      // Ask for confirmation
      if (confirm("Are you sure you want to delete this graph?")) {
        setGraphs((prev) => prev.filter((graph) => graph.id !== graphId));
        setHasChanges(true); // <-- Add this line
        toast.success("Graph deleted successfully");

        // If we deleted the last graph, hide the graphs section
        if (graphs.length === 1) {
          setShowGraphs(false);
        }

        // Force a layout refresh
        setTimeout(() => {
          window.dispatchEvent(new Event("resize"));
        }, 200);
      }
    },
    [graphs.length]
  );

  // Function to render charts with optimized data loading
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

      // Create a date range for the preview
      const previewDateRange = {
        from: new Date(new Date().setDate(new Date().getDate() - 7)),
        to: new Date(),
      };

      // Create a unique key for this graph to use in the cache
      const cacheKey = `${graph.id}-${primaryKpi}-${correlationKpis.join(
        "-"
      )}-${templateData.resolution}`;

      // Trigger data fetch if needed
      if (
        chartDataLoadState[cacheKey] !== "success" &&
        chartDataLoadState[cacheKey] !== "loading"
      ) {
        fetchChartData(cacheKey, {
          primaryKpi,
          correlationKpis,
          monitoringArea,
          dateRange: previewDateRange,
          resolution: templateData.resolution,
        });
      }

      // Use cached data if available, otherwise use dummy data
      const chartData = chartDataCache[cacheKey] || generateDummyData(allKpis);
      const isLoading = chartDataLoadState[cacheKey] === "loading";

      // Ensure we have activeKPIs and kpiColors
      const chartActiveKPIs = new Set(allKpis);
      const chartKpiColors = allKpis.reduce((colors, kpi, index) => {
        colors[kpi] = {
          color:
            defaultChartTheme.colors[index % defaultChartTheme.colors.length],
          name: kpi,
        };
        return colors;
      }, {} as Record<string, { color: string; name: string }>);

      return {
        id: graph.id!,
        type: graph.type || "line",
        title: graph.name || "Untitled Chart",
        data:
          chartData.length > 0
            ? chartData
            : [
                // Fallback data if no data is available
                {
                  category: primaryKpi,
                  date: new Date().toISOString(),
                  value: 1000,
                },
                {
                  category: primaryKpi,
                  date: new Date(Date.now() - 3600000).toISOString(),
                  value: 1500,
                },
              ],
        width: graph.layout.w * 100,
        height: graph.layout.h * 60,
        activeKPIs: chartActiveKPIs,
        kpiColors: chartKpiColors,
        hideControls: true,
        onDeleteGraph: handleDeleteGraph,
        isLoading,
      };
    },
    [
      chartDataCache,
      chartDataLoadState,
      templateData.resolution,
      handleDeleteGraph, // This is now a stable reference
      fetchChartData,
    ]
  );

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

        // Auto-select if there's only one system
        if (data.length === 1) {
          setTemplateData((prev) => ({
            ...prev,
            system: data[0].system_id,
          }));
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
      // In case it's nested or formatted differently than expected
      let systemId = "";

      if (template.systems && template.systems.length > 0) {
        // Get the system ID from the first system in the array
        systemId = template.systems[0].system_id || "";
        console.log("Found system ID in template:", systemId);
      } else {
        console.warn("No systems found in template data");
      }

      // Map the API response to our local state format
      setTemplateData({
        name: template.template_name || "",
        system: systemId, // Set the system ID here
        timeRange: template.frequency || "auto",
        resolution: template.resolution || "auto", // Added fallback
        isDefault: template.default || false,
        isFavorite: template.favorite || false,
        graphs: [], // We'll populate this separately
      });

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

          // Get primary and secondary KPIs
          const primaryKpi = apiGraph.primary_kpi_id;
          const secondaryKpis = apiGraph.secondary_kpis || [];
          const correlationKpis = secondaryKpis.map((sk: any) => sk.kpi_id);

          // Use the utility function to generate consistent colors
          const allKpis = [primaryKpi, ...correlationKpis];
          const { kpiColors: newKpiColors, activeKPIs: newActiveKPIs } =
            generateConsistentColors(allKpis);

          return {
            id: apiGraph.graph_id,
            name: apiGraph.graph_name,
            type: "line" as "line" | "bar", // Default to line chart
            monitoringArea: "", // We'll need to fetch this information
            kpiGroup: "", // We'll need to fetch this information
            primaryKpi: apiGraph.primary_kpi_id,
            correlationKpis: correlationKpis,
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
    if (!isFormValid) {
      // Update to set specific error states for missing fields
      const newErrors: Record<string, boolean> = {};
      if (!templateData.name.trim()) newErrors.name = true;
    }

    setSelectedTemplate({
      id: Date.now().toString(),
      ...templateData,
      graphs,
    });
    setIsAddGraphSheetOpen(true);
  };

  // Update handleSaveTemplate to have more detailed validation
  const handleSaveTemplate = async () => {
    // First check if basic form data is valid
    if (!isFormValid) {
      toast.error(ERROR_MESSAGES.VALIDATION_ERROR, {
        dismissible: true
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

        return {
          graph_id: graph.id || `${newTemplateId}_G${index + 1}`,
          graph_name: graph.name,
          top_xy_pos: topPos,
          bottom_xy_pos: bottomPos,
          frequency: templateData.timeRange,
          resolution: templateData.resolution,
          systems: [
            {
              system_id: templateData.system.toLowerCase(),
            },
          ],
          primary_kpi_id: graph.primaryKpi,
          primary_filter_values: [], // Using empty array as in original code
          secondary_kpis: graph.correlationKpis.map((kpi) => ({
            kpi_id: kpi,
          })),
        };
      });

      // If this template is being set as default, we need to check other templates
      if (templateData.isDefault) {
        try {
          // First, fetch all templates for the user
          const templatesResponse = await fetch(
            `https://shwsckbvbt.a.pinggy.link/api/utl?userId=USER_TEST_1`
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

            // Update the existing default template to set default to false
            const updateDefaultTemplate = {
              user_id: "USER_TEST_1",
              template_id: Array.isArray(defaultTemplate.template_id)
                ? defaultTemplate.template_id[0]
                : defaultTemplate.template_id,
              template_name: Array.isArray(defaultTemplate.template_name)
                ? defaultTemplate.template_name[0]
                : defaultTemplate.template_name,
              template_desc: Array.isArray(defaultTemplate.template_desc)
                ? defaultTemplate.template_desc[0]
                : defaultTemplate.template_desc,
              default: false,
              favorite: Array.isArray(defaultTemplate.favorite)
                ? defaultTemplate.favorite[0]
                : defaultTemplate.favorite,
              frequency: defaultTemplate.frequency
                ? (Array.isArray(defaultTemplate.frequency)
                  ? defaultTemplate.frequency[0]
                  : defaultTemplate.frequency)
                : "auto",
              systems: defaultTemplate.systems || [],
              graphs: defaultTemplate.graphs || [],
            };

            const updateResponse = await fetch(
              "https://shwsckbvbt.a.pinggy.link/api/ut",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(updateDefaultTemplate),
              }
            );

            if (!updateResponse.ok) {
              throw new Error("Failed to update existing default template");
            }
          }
        } catch (error) {
          console.error("Error handling default template:", error);
          // Continue with saving the new template even if default handling fails
        }
      }

      const templatePayload = {
        user_id: "USER_TEST_1", // Hard-coded for now
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

      const baseUrl = "https://shwsckbvbt.a.pinggy.link";
      const response = await fetch(`${baseUrl}/api/ut`, {
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
        }
      );

      // Reset form or redirect after successful save
      if (!isEditMode) {
        // Reset form for new template creation
        setTemplateData({
          name: "",
          system: "",
          timeRange: "auto",
          resolution: "auto",
          isDefault: false,
          isFavorite: false,
          graphs: [],
        });
        setGraphs([]);
        setShowGraphs(false);
        setActiveKPIs(new Set());
        setKpiColors({});
      } else {
        // Redirect to templates list after editing
        router.push("/templates");
      }

      setHasChanges(false);
    } catch (error) {
      console.error("Save template error:", error);
      toast.error(ERROR_MESSAGES.SAVE_ERROR, {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setLoadingState((prev) => ({ ...prev, savingTemplate: false }));
    }
  };

  // Update handleAddGraphToTemplate to ensure proper graph data with valid layout
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
        layout: layout,
      };
  
      // Update graphs and show immediately
      setGraphs((prev) => [...prev, newGraph]);
      setShowGraphs(true);
      setIsAddGraphSheetOpen(false);
      setHasChanges(true);
  
      // Force a layout refresh with a delay
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

  // Add a function to handle updating an existing graph
  const handleUpdateGraph = (graphId: string, graphData: any) => {
    try {
      // Create or update KPI colors and active KPIs as before
      const allKpis = [graphData.primaryKpi, ...graphData.correlationKpis];
      const { kpiColors: newKpiColors, activeKPIs: newActiveKPIs } =
        generateConsistentColors(allKpis);

      // Update the graph with the new data
      setGraphs((prev) =>
        prev.map((graph) =>
          graph.id === graphId
            ? {
                ...graph,
                ...graphData,
                activeKPIs: newActiveKPIs,
                kpiColors: newKpiColors,
                // Preserve existing layout - this is important for layout persistence
                layout: graph.layout && Object.keys(graph.layout).length === 4
                  ? graph.layout // Use existing layout if valid
                  : { x: 0, y: 0, w: 4, h: 4 }, // Fallback
              }
            : graph
        )
      );

      setIsAddGraphSheetOpen(false);
      setEditingGraph(null);
      setHasChanges(true);
      toast.success("Graph updated successfully");

      // Force a layout refresh
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 200);
    } catch (error) {
      console.error("Error updating graph:", error);
      toast.error("Failed to update graph");
    }
  };

  const pageTitle = isEditMode ? "Edit Template" : "Create Template";

  // Show main loading state when initially loading template
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-background via-background/98 to-background/95">
        <div className="bg-card/90 backdrop-blur-sm border border-border/40 shadow-xl rounded-lg p-8 max-w-md">
          <LoadingSpinner
            message={`${isEditMode ? "Loading" : "Creating"} template...`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background/98 to-background/95 overflow-hidden">
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            {/* Combined header with all controls in a single row */}
            <div className="rounded-lg bg-card/90 border border-border/40 shadow-md p-4 backdrop-blur-sm">
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
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-foreground/70 mb-1">
                      Template Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={templateData.name}
                      onChange={(e) => {
                        setTemplateData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }));
                        setErrors((prev) => ({ ...prev, name: false }));
                      }}
                      placeholder="Enter template name"
                      className={`h-9 text-sm ${
                        errors.name
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }`}
                    />
                  </div>

                  {/* System Select */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-foreground/70 mb-1">
                      System <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={templateData.system}
                      onValueChange={(value) => {
                        setTemplateData((prev) => ({ ...prev, system: value }));
                        setErrors((prev) => ({ ...prev, system: false }));
                      }}
                    >
                      <SelectTrigger
                        className={`h-9 text-sm ${
                          errors.system
                            ? "border-red-500 focus-visible:ring-red-500"
                            : ""
                        }`}
                      >
                        <SelectValue placeholder="Select">
                          {templateData.system || "Select"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {isEditMode &&
                          templateData.system &&
                          !systems.some(
                            (sys) => sys.system_id === templateData.system
                          ) && (
                            <SelectItem
                              key={templateData.system}
                              value={templateData.system}
                            >
                              {templateData.system}
                            </SelectItem>
                          )}
                        {systems.map((system) => (
                          <SelectItem
                            key={system.system_id}
                            value={system.system_id}
                          >
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
                      >
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeRangeOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
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
                      >
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {resolutionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Switches and Save Button */}
                  <div className="md:col-span-3 flex flex-row items-end justify-between">
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
                        <label htmlFor="default-toggle" className="text-xs font-medium cursor-pointer">
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
                        <label htmlFor="favorite-toggle" className="text-xs font-medium cursor-pointer">
                          Favorite
                        </label>
                      </div>
                    </div>

                    <Button
                      onClick={handleSaveTemplate}
                      disabled={!isFormValid || graphs.length === 0}
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4"
          >
            {/* Add Graph section with border */}
            <div className="border border-border rounded-lg p-4 mb-6">
              <Card
                className="p-6 backdrop-blur-sm bg-card/90 border border-border/40 shadow-xl hover:shadow-2xl transition-shadow duration-300 cursor-pointer"
                onClick={handleAddGraph}
              >
                <div className="flex flex-col items-center justify-center py-4">
                  <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                  <h3 className="text-base font-medium text-foreground/90">
                    {showGraphs && graphs.length > 0 ? "Add Another Graph" : "Add Graph"}
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
                  charts={graphs.map(renderChartConfigs)}
                  theme={defaultChartTheme}
                  resolution={templateData.resolution}
                  onDeleteGraph={handleDeleteGraph}
                  onEditGraph={handleEditGraph}
                  hideControls={true}
                />
              </div>
            )}
          </motion.div>

          <Sheet
            isOpen={isAddGraphSheetOpen}
            onClose={() => {
              setIsAddGraphSheetOpen(false);
              setEditingGraph(null);
            }}
            title={editingGraph ? "Edit Graph" : "Add Graph to Template"}
          >
            {selectedTemplate && (
              <AddGraphSheet
                template={selectedTemplate}
                onClose={() => {
                  setIsAddGraphSheetOpen(false);
                  setEditingGraph(null);
                }}
                editingGraph={editingGraph ? {
                  ...editingGraph,
                  id: editingGraph.id || `temp-${Date.now()}`
                } : null}
                onAddGraph={(graphData) => {
                  // Prevent multiple calls by immediately disabling the sheet
                  setIsAddGraphSheetOpen(false);

                  if (editingGraph) {
                    handleUpdateGraph(editingGraph.id || `temp-${Date.now()}`, graphData);
                  } else {
                    // Ensure graphData fully conforms to Graph type by providing defaults for optional properties
                    const completeGraphData: Graph = {
                      ...graphData,
                      activeKPIs: graphData.activeKPIs || new Set<string>(),
                      kpiColors: graphData.kpiColors || {}
                    };
                    handleAddGraphToTemplate(completeGraphData);
                  }
                }}
              />
            )}
          </Sheet>
        </div>
      </main>
    </div>
  );
}
