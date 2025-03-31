"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useState, useEffect } from "react";
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
import { generateDummyData } from "@/utils/data";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";

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

// Utility function to create vibrant, consistent colors for KPIs
const generateConsistentColors = (kpis: string[]) => {
  const colorPalette = [
    "#3B82F6", // blue
    "#8B5CF6", // purple
    "#EC4899", // pink
    "#10B981", // green
    "#F97316", // orange
    "#EF4444", // red
    "#06B6D4", // cyan
    "#84CC16", // lime
    "#F59E0B", // amber
  ];

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
  const [templateData, setTemplateData] = useState({
    name: "",
    system: "",
    timeRange: "auto",
    resolution: "auto",
    isDefault: false,
    isFavorite: false,
    graphs: [] as Graph[], // Initialize graphs as an empty array
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [templates, setTemplates] = useState<Template[]>([]);
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [showGraphs, setShowGraphs] = useState(false);
  const [activeKPIs, setActiveKPIs] = useState<Set<string>>(new Set());
  const [kpiColors, setKpiColors] = useState<
    Record<string, { color: string; name: string }>
  >({});
  const [isLoading, setIsLoading] = useState(false);

  // Fetch templates on mount
  useEffect(() => {
    if (templateId) {
      fetchTemplateForEditing(templateId);
      setIsEditMode(true);
    } else {
      fetchTemplates();
    }
  }, [templateId]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/templates");
      if (!response.ok) {
        throw new Error(ERROR_MESSAGES.FETCH_ERROR);
      }
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      toast.error(ERROR_MESSAGES.FETCH_ERROR, {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const fetchTemplateForEditing = async (templateId: string) => {
    try {
      setIsLoading(true);
      const baseUrl = "https://shwsckbvbt.a.pinggy.link";
      const response = await fetch(
        `${baseUrl}/api/ut?templateId=${templateId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch template for editing");
      }

      const data = await response.json();

      if (!data || !data.length) {
        throw new Error("Template not found");
      }

      // Extract the template data
      const template = data[0];

      // Map the API response to our local state format
      setTemplateData({
        name: template.template_name,
        system: template.systems?.[0]?.system_id || "",
        timeRange: template.frequency || "auto",
        resolution: "auto", // Set a default if not available
        isDefault: template.default || false,
        isFavorite: template.favorite || false,
        graphs: [], // We'll populate this separately
      });

      // Map the graphs from API format to our internal format
      const mappedGraphs = template.graphs.map((apiGraph: any, graphIndex: number) => {
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
      });

      setGraphs(mappedGraphs);
      setShowGraphs(mappedGraphs.length > 0);
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
    if (!validateFields()) {
      toast.error(ERROR_MESSAGES.REQUIRED_FIELDS);
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

  const handleSaveTemplate = async () => {
    if (!validateFields()) {
      toast.error(ERROR_MESSAGES.VALIDATION_ERROR);
      return;
    }

    if (graphs.length === 0) {
      toast.error(ERROR_MESSAGES.MIN_GRAPHS);
      return;
    }

    try {
      // Use existing templateId if in edit mode, otherwise create a new one
      const newTemplateId = isEditMode
        ? searchParams.get("templateId") || ""
        : `USER_TEST_1_${templateData.name
            .toUpperCase()
            .replace(/\s+/g, "_")}_${Date.now()}`;

      // Format each graph according to the API structure
      const apiFormattedGraphs = graphs.map((graph, index) => {
        // Calculate positions based on layout
        const topPos = `${graph.layout.y * 10}:${graph.layout.x * 10}`;
        const bottomPos = `${(graph.layout.y + graph.layout.h) * 10}:${
          (graph.layout.x + graph.layout.w) * 10
        }`;

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
    } catch (error) {
      console.error("Save template error:", error);
      toast.error(ERROR_MESSAGES.SAVE_ERROR, {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    }
  };

  const handleAddGraphToTemplate = (graphData: Graph) => {
    if (graphs.length >= 9) {
      toast.error(ERROR_MESSAGES.MAX_GRAPHS);
      return;
    }

    try {
      // Use the utility function to generate consistent colors
      const allKpis = [graphData.primaryKpi, ...graphData.correlationKpis];
      const { kpiColors: newKpiColors, activeKPIs: newActiveKPIs } = 
        generateConsistentColors(allKpis);

      console.log("Created KPI colors:", newKpiColors);
      console.log("Active KPIs:", newActiveKPIs);

      // Create API-compatible graph object
      const newGraph: Graph = {
        ...graphData,
        id: `graph-${Date.now()}`,
        activeKPIs: newActiveKPIs,
        kpiColors: newKpiColors,
        layout: {
          x: (graphs.length * 4) % 12,
          y: Math.floor(graphs.length / 3) * 3, 
          w: 4,
          h: 2, 
        },
      };

      setGraphs((prev) => [...prev, newGraph]);
      setShowGraphs(true);
      setIsAddGraphSheetOpen(false);

      toast.success(SUCCESS_MESSAGES.GRAPH_ADDED);
    } catch (error) {
      console.error("Error adding graph:", error);
      toast.error(ERROR_MESSAGES.ADD_GRAPH_ERROR);
    }
  };

  const pageTitle = isEditMode ? "Edit Template" : "Create Template";

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-background/98 to-background/95 overflow-hidden">
      {/* <Sidebar /> */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-8 py-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-purple-500 to-purple-600 bg-clip-text text-transparent tracking-tight">
              {pageTitle}
            </h1>
            <p className="text-muted-foreground/90 text-lg">
              Create and manage your monitoring templates
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Card className="p-6 backdrop-blur-sm bg-card/90 border border-border/40 shadow-xl">
              <div className="flex items-center gap-4">
                {/* Template Name */}
                <div className="flex-1">
                  <label className="block text-sm font-medium text-foreground/90 mb-2">
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
                    className={
                      errors.name
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }
                  />
                </div>

                {/* System Select */}
                <div className="w-48">
                  <label className="block text-sm font-medium text-foreground/90 mb-2">
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
                      className={
                        errors.system
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
                    >
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {systemOptions.map((system) => (
                        <SelectItem key={system} value={system.toLowerCase()}>
                          {system}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Time Range */}
                <div className="w-48">
                  <label className="block text-sm font-medium text-foreground/90 mb-2">
                    Time <span className="text-red-500">*</span>
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
                      className={
                        errors.timeRange
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
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
                <div className="w-48">
                  <label className="block text-sm font-medium text-foreground/90 mb-2">
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
                      className={
                        errors.resolution
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
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

                {/* Switches */}
                <div className="flex flex-col gap-2 justify-center ml-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={templateData.isDefault}
                      onCheckedChange={(checked) =>
                        setTemplateData((prev) => ({
                          ...prev,
                          isDefault: checked,
                        }))
                      }
                    />
                    <label className="text-sm font-medium text-foreground/90">
                      Default
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={templateData.isFavorite}
                      onCheckedChange={(checked) =>
                        setTemplateData((prev) => ({
                          ...prev,
                          isFavorite: checked,
                        }))
                      }
                    />
                    <label className="text-sm font-medium text-foreground/90">
                      Favorite
                    </label>
                  </div>
                </div>
              </div>
            </Card>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8"
            >
              {showGraphs && graphs.length > 0 ? (
                <div className="space-y-6">
                  <DynamicLayout
                    charts={graphs.map((graph) => {
                      // Generate more comprehensive dummy data
                      const allKpis = [graph.primaryKpi, ...graph.correlationKpis];
                      console.log("Generating data for KPIs:", allKpis);
                      console.log("Graph active KPIs:", graph.activeKPIs);
                      console.log("Graph KPI colors:", graph.kpiColors);
                      
                      // Generate dummy data for each KPI
                      const dummyData = generateDummyData(allKpis);

                      // Verify data is properly generated
                      console.log("Generated dummy data for chart:", graph.name, dummyData);

                      return {
                        id: graph.id!,
                        type: graph.type,
                        title: graph.name,
                        data: dummyData.length > 0
                          ? dummyData
                          : [
                              // Fallback data if generateDummyData returns empty
                              {
                                category: graph.primaryKpi,
                                date: new Date().toISOString(),
                                value: 1000,
                              },
                              {
                                category: graph.primaryKpi,
                                date: new Date(Date.now() - 3600000).toISOString(),
                                value: 1500,
                              },
                            ],
                        width: graph.layout.w * 100,
                        height: graph.layout.h * 60, // Increased height for better visibility
                        activeKPIs: graph.activeKPIs,
                        kpiColors: graph.kpiColors,
                      };
                    })}
                  />
                  <Card
                    className="p-6 backdrop-blur-sm bg-card/90 border border-border/40 shadow-xl hover:shadow-2xl transition-shadow duration-300 cursor-pointer"
                    onClick={handleAddGraph}
                  >
                    <div className="flex flex-col items-center justify-center py-4">
                      <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                      <h3 className="text-base font-medium text-foreground/90">
                        Add Another Graph
                      </h3>
                    </div>
                  </Card>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveTemplate}>
                      {isEditMode ? "Update Template" : "Save Template"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Card
                  className="p-6 backdrop-blur-sm bg-card/90 border border-border/40 shadow-xl hover:shadow-2xl transition-shadow duration-300 cursor-pointer"
                  onClick={handleAddGraph}
                >
                  <div className="flex flex-col items-center justify-center py-8">
                    <Plus className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-foreground/90">
                      Add Graph
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Click to add a new graph to your template
                    </p>
                  </div>
                </Card>
              )}
            </motion.div>
          </motion.div>

          <Sheet
            isOpen={isAddGraphSheetOpen}
            onClose={() => setIsAddGraphSheetOpen(false)}
            title="Add Graph to Template"
          >
            {selectedTemplate && (
              <AddGraphSheet
                template={selectedTemplate}
                onClose={() => setIsAddGraphSheetOpen(false)}
                onAddGraph={(graphData) => {
                  // Create a proper Graph object here to match the expected type
                  handleAddGraphToTemplate({
                    ...graphData,
                    id: "",  // This will be overwritten in handleAddGraphToTemplate
                    activeKPIs: new Set<string>(),  // Will be populated in the handler
                    kpiColors: {}  // Will be populated in the handler
                  });
                }}
              />
            )}
          </Sheet>
        </div>
      </main>
    </div>
  );
}
