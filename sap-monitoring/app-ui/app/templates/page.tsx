"use client"

import { motion } from "framer-motion"
import { Plus, Search, Star, StarOff } from "lucide-react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Sheet from "@/components/sheet"
import AddGraphSheet from "@/components/add-graph-sheet"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {Sidebar} from "@/components/sidebar"
import { useToast } from "@/hooks/use-toast"
import { DynamicLayout } from "@/components/charts/DynamicLayout"
import ChartContainer from "@/components/charts/ChartContainer"

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
  type: 'line' | 'bar';
  monitoringArea: string;
  kpiGroup: string;
  primaryKpi: string;
  correlationKpis: string[];
  position?: number;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

const timeRangeOptions = [
  'auto',
  'last 1 hour',
  'today',
  'yesterday',
  'last 7 days',
  'last 30 days',
  'last 90 days',
  'custom'
];

const systemOptions = ['SVW', 'System 1', 'System 2'];

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [isAddGraphSheetOpen, setIsAddGraphSheetOpen] = useState(false)
  const [templateData, setTemplateData] = useState({
    name: "",
    system: "",
    timeRange: "auto",
    resolution: "auto",
    isDefault: false,
    isFavorite: false
  })
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const { toast } = useToast()
  const [templates, setTemplates] = useState<Template[]>([]);
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [showGraphs, setShowGraphs] = useState(false)
  const [activeKPIs, setActiveKPIs] = useState<Set<string>>(new Set())
  const [kpiColors, setKpiColors] = useState<Record<string, { color: string; name: string }>>({})

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch templates",
        variant: "destructive"
      });
    }
  };

  const validateFields = () => {
    const newErrors: Record<string, boolean> = {}
    if (!templateData.name.trim()) newErrors.name = true
    if (!templateData.system) newErrors.system = true
    if (!templateData.timeRange) newErrors.timeRange = true
    if (!templateData.resolution) newErrors.resolution = true

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddGraph = () => {
    if (!validateFields()) {
      toast({
        title: "Required Fields Missing",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive"
      })
      return
    }

    setSelectedTemplate({
      id: Date.now().toString(),
      ...templateData,
      graphs
    })
    setIsAddGraphSheetOpen(true)
  }

  const handleSaveTemplate = async () => {
    if (!validateFields() || graphs.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one graph to the template",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...templateData,
          graphs
        })
      });

      if (!response.ok) throw new Error('Failed to save template');

      const savedTemplate = await response.json();
      setTemplates(prev => [...prev, savedTemplate]);
      
      toast({
        title: "Success",
        description: "Template saved successfully",
      });

      // Reset form
      setTemplateData({
        name: "",
        system: "",
        timeRange: "auto",
        resolution: "auto",
        isDefault: false,
        isFavorite: false
      });
      setGraphs([]);
      setShowGraphs(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save template",
        variant: "destructive"
      });
    }
  };

  const handleAddGraphToTemplate = (graph: Graph) => {
    setGraphs(prev => [...prev, {
      ...graph,
      id: `graph-${Date.now()}`,
      layout: {
        x: (prev.length * 4) % 12,
        y: Math.floor(prev.length / 3) * 4,
        w: 4,
        h: 4
      }
    }]);
    setShowGraphs(true);
    setIsAddGraphSheetOpen(false);

    // Update active KPIs and colors
    setActiveKPIs(prev => {
      const newSet = new Set(prev)
      newSet.add(graph.primaryKpi)
      graph.correlationKpis.forEach(kpi => newSet.add(kpi))
      return newSet
    })

    // Assign colors to new KPIs
    const newColors = { ...kpiColors }
    if (!newColors[graph.primaryKpi]) {
      newColors[graph.primaryKpi] = {
        color: `hsl(${Object.keys(newColors).length * 60}, 70%, 50%)`,
        name: graph.primaryKpi
      }
    }
    graph.correlationKpis.forEach(kpi => {
      if (!newColors[kpi]) {
        newColors[kpi] = {
          color: `hsl(${Object.keys(newColors).length * 60}, 70%, 50%)`,
          name: kpi
        }
      }
    })
    setKpiColors(newColors)
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
                      setTemplateData(prev => ({ ...prev, name: e.target.value }))
                      setErrors(prev => ({ ...prev, name: false }))
                    }}
                    placeholder="Enter template name"
                    className={errors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground/90 mb-2">
                    Select a system <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={templateData.system}
                    onValueChange={(value) => {
                      setTemplateData(prev => ({ ...prev, system: value }))
                      setErrors(prev => ({ ...prev, system: false }))
                    }}
                  >
                    <SelectTrigger className={errors.system ? "border-red-500 focus-visible:ring-red-500" : ""}>
                      <SelectValue placeholder="Select system" />
                    </SelectTrigger>
                    <SelectContent>
                      {systemOptions.map(system => (
                        <SelectItem key={system} value={system.toLowerCase()}>{system}</SelectItem>
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
                        setTemplateData(prev => ({ ...prev, timeRange: value }))
                        setErrors(prev => ({ ...prev, timeRange: false }))
                      }}
                    >
                      <SelectTrigger className={errors.timeRange ? "border-red-500 focus-visible:ring-red-500" : ""}>
                        <SelectValue placeholder="Select time range" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeRangeOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
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
                        setTemplateData(prev => ({ ...prev, resolution: value }))
                        setErrors(prev => ({ ...prev, resolution: false }))
                      }}
                    >
                      <SelectTrigger className={errors.resolution ? "border-red-500 focus-visible:ring-red-500" : ""}>
                        <SelectValue placeholder="Select resolution" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeRangeOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={templateData.isDefault}
                      onCheckedChange={(checked) => setTemplateData(prev => ({ ...prev, isDefault: checked }))}
                    />
                    <label className="text-sm font-medium text-foreground/90">Set as Default</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={templateData.isFavorite}
                      onCheckedChange={(checked) => setTemplateData(prev => ({ ...prev, isFavorite: checked }))}
                    />
                    <label className="text-sm font-medium text-foreground/90">Mark as favorite</label>
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
                    charts={graphs.map(graph => ({
                      id: graph.id!,
                      type: graph.type,
                      title: graph.name,
                      data: [], // You'll need to fetch actual data here
                      width: graph.layout.w * 100,
                      height: graph.layout.h * 100,
                      activeKPIs: activeKPIs,
                      kpiColors: kpiColors
                    }))}
                  />
                  <Card 
                    className="p-6 backdrop-blur-sm bg-card/90 border border-border/40 shadow-xl hover:shadow-2xl transition-shadow duration-300 cursor-pointer"
                    onClick={handleAddGraph}
                  >
                    <div className="flex flex-col items-center justify-center py-4">
                      <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                      <h3 className="text-base font-medium text-foreground/90">Add Another Graph</h3>
                    </div>
                  </Card>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveTemplate}>
                      Save Template
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
                    <h3 className="text-lg font-medium text-foreground/90">Add Graph</h3>
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
              />
            )}
          </Sheet>
        </div>
      </main>
    </div>
  )
}