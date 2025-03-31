"use client";

import React, { useState, useEffect } from "react";
import { BarChart, LineChart, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";
import { Card } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Template {
  id: string;
  name: string;
  system: string;
  timeRange: string;
  resolution: string;
  isDefault: boolean;
  isFavorite: boolean;
}

interface MonitoringArea {
  system_name: string;
  mon_area_name: string;
  mon_area_desc: string;
  created_at: string;
  created_by: string;
  modified_at: string;
  modified_by: string;
}

interface KpiGroup {
  system_name: string;
  kpi_grp_name: string;
  kpi_grp_desc: string;
  mon_area: string;
  instance: boolean;
  is_active: boolean;
  sapfrequency: string;
  sysfrequency: string;
  created_at: string;
  created_by: string;
  modified_at: string;
  modified_by: string;
}

interface Kpi {
  system_name: string;
  kpi_name: string;
  kpi_desc: string;
  kpi_group: string;
  parent: boolean;
  unit: string;
  drilldown: boolean;
  filter: boolean;
  g2y: number | null;
  y2r: number | null;
  direction: string;
  criticality: string;
}

interface AddGraphSheetProps {
  template: Template;
  onClose: () => void;
  onAddGraph: (graphData: {
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
    id?: string;
    activeKPIs?: Set<string> | string[];
    kpiColors?: Record<string, { color: string; name: string }>;
  }) => void;
}

interface FormData {
  monitoringArea: string;
  kpiGroup: string;
  kpi: string;
  correlationKpis: CorrelationKpiField[];
  graphType: string;
  timeInterval: string;
  resolution: string;
  graphName: string;
}

interface CorrelationKpiField {
  id: string;
  monitoringArea: string;
  kpiGroup: string;
  kpi: string;
}

const AddGraphSheet: React.FC<AddGraphSheetProps> = ({
  template,
  onClose,
  onAddGraph,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  // API data states
  const [monitoringAreas, setMonitoringAreas] = useState<MonitoringArea[]>([]);
  const [kpiGroups, setKpiGroups] = useState<KpiGroup[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);

  // Correlation KPI data
  const [correlationKpiGroups, setCorrelationKpiGroups] = useState<
    Record<string, KpiGroup[]>
  >({});
  const [correlationKpis, setCorrelationKpis] = useState<Record<string, Kpi[]>>(
    {}
  );

  const baseUrl = "https://shwsckbvbt.a.pinggy.link";

  const [formData, setFormData] = useState<FormData>({
    monitoringArea: "",
    kpiGroup: "",
    kpi: "",
    correlationKpis: [] as CorrelationKpiField[],
    graphType: "line",
    timeInterval: template.timeRange,
    resolution: template.resolution,
    graphName: "",
  });

  // Step 1: Fetch monitoring areas on component mount
  useEffect(() => {
    const fetchMonitoringAreas = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${baseUrl}/api/ma`);
        setMonitoringAreas(response.data || []);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch monitoring areas",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonitoringAreas();
  }, [baseUrl, toast]);

  // Step 2: Fetch KPI groups when monitoring area changes
  useEffect(() => {
    const fetchKpiGroups = async () => {
      if (!formData.monitoringArea) {
        setKpiGroups([]);
        return;
      }

      try {
        setIsLoading(true);
        const response = await axios.get(
          `${baseUrl}/api/kpigrp?mon_area=${formData.monitoringArea}`
        );
        setKpiGroups(response.data || []);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch KPI groups",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchKpiGroups();
  }, [formData.monitoringArea, baseUrl, toast]);

  // Step 3: Fetch KPIs when KPI group changes
  useEffect(() => {
    const fetchKpis = async () => {
      if (!formData.kpiGroup) {
        setKpis([]);
        return;
      }

      try {
        setIsLoading(true);
        const response = await axios.get(
          `${baseUrl}/api/kpi?kpi_grp=${formData.kpiGroup}`
        );
        setKpis(response.data || []);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch KPIs",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchKpis();
  }, [formData.kpiGroup, baseUrl, toast]);

  // Fetch data for correlation KPIs when needed
  const fetchCorrelationKpiGroups = async (monitoringArea: string) => {
    if (!monitoringArea || correlationKpiGroups[monitoringArea]) return;

    try {
      const response = await axios.get(
        `${baseUrl}/api/kpigrp?mon_area=${monitoringArea}`
      );
      setCorrelationKpiGroups((prev) => ({
        ...prev,
        [monitoringArea]: response.data || [],
      }));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch correlation KPI groups",
        variant: "destructive",
      });
    }
  };

  const fetchCorrelationKpis = async (kpiGroup: string) => {
    if (!kpiGroup || correlationKpis[kpiGroup]) return;

    try {
      const response = await axios.get(
        `${baseUrl}/api/kpi?kpi_grp=${kpiGroup}`
      );
      setCorrelationKpis((prev) => ({
        ...prev,
        [kpiGroup]: response.data || [],
      }));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch correlation KPIs",
        variant: "destructive",
      });
    }
  };

  const handleMonitoringAreaChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      monitoringArea: value,
      kpiGroup: "",
      kpi: "",
      correlationKpis: [],
    }));
  };

  const handleKPIGroupChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      kpiGroup: value,
      kpi: "",
      correlationKpis: [],
    }));
  };

  const handleKPIChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      kpi: value,
    }));
  };

  const addCorrelationKpi = () => {
    setFormData((prev) => ({
      ...prev,
      correlationKpis: [
        ...prev.correlationKpis,
        {
          id: `corr-${Date.now()}-${prev.correlationKpis.length}`,
          monitoringArea: "",
          kpiGroup: "",
          kpi: "",
        },
      ],
    }));
  };

  const handleCorrelationKpiChange = async (
    index: number,
    field: keyof CorrelationKpiField,
    value: string
  ) => {
    setFormData((prev) => {
      const newCorrelationKpis = [...prev.correlationKpis];

      // Reset dependent fields when parent field changes
      if (field === "monitoringArea") {
        newCorrelationKpis[index] = {
          id: newCorrelationKpis[index]?.id || `corr-${Date.now()}-${index}`,
          monitoringArea: value,
          kpiGroup: "",
          kpi: "",
        };
        // Fetch KPI groups for this monitoring area
        fetchCorrelationKpiGroups(value);
      } else if (field === "kpiGroup") {
        newCorrelationKpis[index] = {
          ...newCorrelationKpis[index],
          kpiGroup: value,
          kpi: "",
        };
        // Fetch KPIs for this KPI group
        fetchCorrelationKpis(value);
      } else {
        newCorrelationKpis[index] = {
          ...newCorrelationKpis[index],
          [field]: value,
        };
      }

      return {
        ...prev,
        correlationKpis: newCorrelationKpis,
      };
    });
  };

  const removeCorrelationKpi = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      correlationKpis: prev.correlationKpis.filter((_, i) => i !== index),
    }));
  };

  const isKpiSelected = (kpiName: string) => {
    if (formData.kpi === kpiName) return true;
    return formData.correlationKpis.some((corrKpi) => corrKpi.kpi === kpiName);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.graphName ||
      !formData.monitoringArea ||
      !formData.kpiGroup ||
      !formData.kpi
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Pass the graph data back to parent
    onAddGraph({
      name: formData.graphName,
      type: formData.graphType as "line" | "bar",
      monitoringArea: formData.monitoringArea,
      kpiGroup: formData.kpiGroup,
      primaryKpi: formData.kpi,
      correlationKpis: formData.correlationKpis
        .filter((kpi) => kpi.kpi)
        .map((kpi) => kpi.kpi),
      layout: {
        x: 0,
        y: 0,
        w: 4,
        h: 4,
      },
      id: undefined,
      activeKPIs: undefined,
      kpiColors: undefined,
    });

    onClose();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <TooltipProvider>
      <motion.form
        initial="hidden"
        animate="visible"
        variants={formVariants}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* Form fields */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-2">
              Monitoring Area
            </label>
            <Select
              value={formData.monitoringArea}
              onValueChange={handleMonitoringAreaChange}
              disabled={isLoading || monitoringAreas.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select monitoring area" />
              </SelectTrigger>
              <SelectContent>
                {monitoringAreas.map((area) => (
                  <SelectItem
                    key={area.mon_area_name}
                    value={area.mon_area_name}
                  >
                    {area.mon_area_name} - {area.mon_area_desc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-2">
              KPI Group
            </label>
            <Select
              value={formData.kpiGroup}
              onValueChange={handleKPIGroupChange}
              disabled={
                !formData.monitoringArea || isLoading || kpiGroups.length === 0
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select KPI group" />
              </SelectTrigger>
              <SelectContent>
                {kpiGroups.map((group) => (
                  <SelectItem
                    key={group.kpi_grp_name}
                    value={group.kpi_grp_name}
                  >
                    {group.kpi_grp_name} - {group.kpi_grp_desc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-2">
              Primary KPI
            </label>
            <Select
              value={formData.kpi}
              onValueChange={handleKPIChange}
              disabled={!formData.kpiGroup || isLoading || kpis.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select KPI" />
              </SelectTrigger>
              <SelectContent>
                {kpis.map((kpi) => (
                  <Tooltip key={kpi.kpi_name}>
                    <TooltipTrigger asChild>
                      <SelectItem value={kpi.kpi_name}>
                        {kpi.kpi_name}
                      </SelectItem>
                    </TooltipTrigger>
                    {kpi.kpi_desc && (
                      <TooltipContent>
                        <p>{kpi.kpi_desc}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-2">
              Graph Type
            </label>
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, graphType: "line" }))
                }
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all duration-200 ${
                  formData.graphType === "line"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent/40"
                }`}
              >
                <LineChart className="w-5 h-5" />
                <span>Line Chart</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, graphType: "bar" }))
                }
                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all duration-200 ${
                  formData.graphType === "bar"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent/40"
                }`}
              >
                <BarChart className="w-5 h-5" />
                <span>Bar Chart</span>
              </motion.button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                Time Interval
              </label>
              <input
                type="text"
                name="timeInterval"
                value={formData.timeInterval}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background/50 focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                Resolution
              </label>
              <input
                type="text"
                name="resolution"
                value={formData.resolution}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-border bg-background/50 focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground/90">
                Correlation KPIs
              </label>
            </div>
            <div className="space-y-3">
              {formData.correlationKpis.map((corrKpi, index) => (
                <div key={corrKpi.id} className="flex items-center gap-2">
                  <div className="grid grid-cols-3 gap-2 flex-grow">
                    <Select
                      value={corrKpi.monitoringArea}
                      onValueChange={(value) =>
                        handleCorrelationKpiChange(
                          index,
                          "monitoringArea",
                          value
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select area" />
                      </SelectTrigger>
                      <SelectContent>
                        {monitoringAreas.map((area) => (
                          <SelectItem
                            key={`${corrKpi.id}-area-${area.mon_area_name}`}
                            value={area.mon_area_name}
                          >
                            {area.mon_area_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={corrKpi.kpiGroup}
                      onValueChange={(value) =>
                        handleCorrelationKpiChange(index, "kpiGroup", value)
                      }
                      disabled={!corrKpi.monitoringArea}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {corrKpi.monitoringArea &&
                          correlationKpiGroups[corrKpi.monitoringArea]?.map(
                            (group) => (
                              <SelectItem
                                key={`${corrKpi.id}-group-${group.kpi_grp_name}`}
                                value={group.kpi_grp_name}
                              >
                                {group.kpi_grp_name}
                              </SelectItem>
                            )
                          )}
                      </SelectContent>
                    </Select>

                    <Select
                      value={corrKpi.kpi}
                      onValueChange={(value) =>
                        handleCorrelationKpiChange(index, "kpi", value)
                      }
                      disabled={!corrKpi.kpiGroup}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select KPI" />
                      </SelectTrigger>
                      <SelectContent>
                        {corrKpi.kpiGroup &&
                          correlationKpis[corrKpi.kpiGroup]
                            ?.filter((kpi) => !isKpiSelected(kpi.kpi_name))
                            .map((kpi) => (
                              <SelectItem
                                key={`${corrKpi.id}-kpi-${kpi.kpi_name}`}
                                value={kpi.kpi_name}
                              >
                                {kpi.kpi_name}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCorrelationKpi(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCorrelationKpi}
                disabled={
                  formData.correlationKpis.length >= 5 || !formData.kpiGroup
                }
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Correlation KPI
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-2">
              Graph Name
            </label>
            <input
              type="text"
              name="graphName"
              value={formData.graphName}
              onChange={handleChange}
              placeholder="Enter graph name"
              className="w-full px-4 py-2 rounded-lg border border-border bg-background/50 focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
            />
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex items-center justify-end gap-4 pt-6 border-t border-border"
        >
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add Graph</Button>
        </motion.div>
      </motion.form>
    </TooltipProvider>
  );
};

export default AddGraphSheet;
