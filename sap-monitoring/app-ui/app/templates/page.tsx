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

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("http://localhost:3000/api/templates");
      if (!response.ok) {
        throw new Error(ERROR_MESSAGES.FETCH_ERROR);
      }
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : ERROR_MESSAGES.FETCH_ERROR
      );
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
    if (!validateFields() || graphs.length === 0) {
      toast.error(ERROR_MESSAGES.MIN_GRAPHS);
      return;
    }

    if (graphs.length > 9) {
      toast.error(ERROR_MESSAGES.MAX_GRAPHS);
      return;
    }

    try {
      // Process graphs to convert Sets to Arrays
      const processedGraphs = graphs.map((graph) => ({
        ...graph,
        id: graph.id || `graph-${Date.now()}`,
        activeKPIs: Array.from(graph.activeKPIs), // Convert Set to Array
        kpiColors: Object.fromEntries(
          Object.entries(graph.kpiColors).map(([key, value]) => [
            key,
            { color: value.color, name: value.name },
          ])
        ),
      }));

      const templatePayload = {
        ...templateData,
        graphs: processedGraphs,
      };

      const response = await fetch("http://localhost:3000/api/templates", {
        method: "POST",
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

      // Update local state with the saved template
      setTemplates((prev) => [...prev, savedTemplate]);

      toast.success(SUCCESS_MESSAGES.TEMPLATE_SAVED);

      // Reset form
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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : ERROR_MESSAGES.SAVE_ERROR
      );
    }
  };

  const handleAddGraphToTemplate = (graphData: Graph) => {
    if (graphs.length >= 9) {
      toast.error(ERROR_MESSAGES.MAX_GRAPHS);
      return;
    }

    try {
      const newKpiColors: Record<string, { color: string; name: string }> = {};
      const newActiveKPIs = new Set<string>();

      // Add primary KPI
      newActiveKPIs.add(graphData.primaryKpi);
      newKpiColors[graphData.primaryKpi] = {
        color: `hsl(${Object.keys(newKpiColors).length * 60}, 70%, 50%)`,
        name: graphData.primaryKpi,
      };

      // Add correlation KPIs
      graphData.correlationKpis.forEach((kpi) => {
        newActiveKPIs.add(kpi);
        newKpiColors[kpi] = {
          color: `hsl(${Object.keys(newKpiColors).length * 60}, 70%, 50%)`,
          name: kpi,
        };
      });

      const newGraph: Graph = {
        ...graphData,
        id: `graph-${Date.now()}`,
        activeKPIs: newActiveKPIs,
        kpiColors: newKpiColors,
        layout: {
          x: (graphs.length * 4) % 12,
          y: Math.floor(graphs.length / 3) * 4,
          w: 4,
          h: 4,
        },
      };

      setGraphs((prev) => [...prev, newGraph]);
      setShowGraphs(true);
      setIsAddGraphSheetOpen(false);

      toast.success(SUCCESS_MESSAGES.GRAPH_ADDED);
    } catch (error) {
      toast.error(ERROR_MESSAGES.ADD_GRAPH_ERROR);
    }
  };

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
              Templates
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
              <div className="space-y-6">
                <div>
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

                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-2">
                    Select a system <span className="text-red-500">*</span>
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
                      <SelectValue placeholder="Select system" />
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
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
                        <SelectValue placeholder="Select time range" />
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
                  <div>
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
                        <SelectValue placeholder="Select resolution" />
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
                </div>

                <div className="flex items-center justify-between">
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
                      Set as Default
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
                      Mark as favorite
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
                    charts={graphs.map((graph) => ({
                      id: graph.id!,
                      type: graph.type,
                      title: graph.name,
                      data: generateDummyData([
                        graph.primaryKpi,
                        ...graph.correlationKpis,
                      ]),
                      width: graph.layout.w * 100,
                      height: graph.layout.h * 100,
                      activeKPIs: graph.activeKPIs,
                      kpiColors: graph.kpiColors,
                    }))}
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
                    <Button onClick={handleSaveTemplate}>Save Template</Button>
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
            title="Add Graph from Template"
          >
            {selectedTemplate && (
              <AddGraphSheet
                template={selectedTemplate}
                onClose={() => setIsAddGraphSheetOpen(false)}
                onAddGraph={handleAddGraphToTemplate}
              />
            )}
          </Sheet>
        </div>
      </main>
    </div>
  );
}
