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
import { app_globals } from "@/config/config";

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
  kpi_grp_name: string;
  kpi_grp_desc?: string;
}

interface Kpi {
  kpi_name: string;
  kpi_desc?: string;
  parent: boolean;
}

interface UserAccess {
  kpi_id: string;
  kpi_group: string;
  mon_area: string;
  system_name: string;
}

interface AddGraphSheetProps {
  template: Template;
  onClose: () => void;
  editingGraph?: {
    id: string;
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
    activeKPIs?: Set<string> | string[];
    kpiColors?: Record<string, { color: string; name: string }>;
  } | null;
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
  editingGraph = null,
  onAddGraph,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);

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

  const [formData, setFormData] = useState<FormData>(() => {
    if (editingGraph) {
      // Initialize correlation KPIs as objects with required structure
      const correlationKpis = editingGraph.correlationKpis.map((kpi, index) => ({
        id: `corr-${Date.now()}-${index}`,
        monitoringArea: editingGraph.monitoringArea, // Assuming same monitoring area and KPI group
        kpiGroup: editingGraph.kpiGroup,
        kpi,
      }));

      return {
        monitoringArea: editingGraph.monitoringArea,
        kpiGroup: editingGraph.kpiGroup,
        kpi: editingGraph.primaryKpi,
        correlationKpis,
        graphType: editingGraph.type,
        timeInterval: template.timeRange,
        resolution: template.resolution,
        graphName: editingGraph.name,
      };
    }

    // Default values for new graph
    return {
      monitoringArea: "",
      kpiGroup: "",
      kpi: "",
      correlationKpis: [] as CorrelationKpiField[],
      graphType: "line",
      timeInterval: template.timeRange,
      resolution: template.resolution,
      graphName: "",
    };
  });

  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Fetch user access data
  useEffect(() => {
    const fetchUserAccess = async () => {
      try {
        const response = await axios.get(
          `${baseUrl}/api/ua?userId=${app_globals.default_user_id}`
        );
        setUserAccess(response.data || []);
      } catch (error) {
        console.error("Error fetching user access:", error);
        toast({
          title: "Error",
          description: "Failed to fetch user access data",
          variant: "destructive",
        });
      }
    };

    fetchUserAccess();
  }, []);

  // Step 1: Fetch monitoring areas on component mount
  useEffect(() => {
    const fetchMonitoringAreas = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${baseUrl}/api/ma`);
        // Filter monitoring areas based on user access
        const uniqueMonitoringAreas = [...new Set(userAccess.map(ua => ua.mon_area))];
        const filteredAreas = (response.data || []).filter((area: MonitoringArea) => 
          uniqueMonitoringAreas.includes(area.mon_area_name)
        );
        setMonitoringAreas(filteredAreas);
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
  }, [userAccess]);

  // Step 2: Fetch KPI groups when monitoring area is selected
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
        // Filter KPI groups based on user access
        const uniqueKpiGroups = [...new Set(
          userAccess
            .filter(ua => ua.mon_area === formData.monitoringArea)
            .map(ua => ua.kpi_group)
        )];
        const filteredGroups = (response.data || []).filter((group: KpiGroup) => 
          uniqueKpiGroups.includes(group.kpi_grp_name)
        );
        setKpiGroups(filteredGroups);
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
  }, [formData.monitoringArea, userAccess]);

  // Step 3: Fetch KPIs when KPI group is selected
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
        
        // Get all KPIs the user has access to for this monitoring area and KPI group
        const userAccessKpis = userAccess
          .filter(ua => 
            ua.mon_area === formData.monitoringArea && 
            ua.kpi_group === formData.kpiGroup
          )
          .map(ua => ua.kpi_id);

        // Only show KPIs that are in the user's access list
        const filteredKpis = (response.data || []).filter((kpi: Kpi) => 
          userAccessKpis.includes(kpi.kpi_name)
        );

        setKpis(filteredKpis);
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
  }, [formData.kpiGroup, formData.monitoringArea, userAccess]);

  // Fetch data for correlation KPIs when needed
  const fetchCorrelationKpiGroups = async (monitoringArea: string) => {
    if (!monitoringArea || correlationKpiGroups[monitoringArea]) return;

    try {
      const response = await axios.get(
        `${baseUrl}/api/kpigrp?mon_area=${monitoringArea}`
      );
      // Filter KPI groups based on user access
      const uniqueKpiGroups = [...new Set(
        userAccess
          .filter(ua => ua.mon_area === monitoringArea)
          .map(ua => ua.kpi_group)
      )];
      const filteredGroups = (response.data || []).filter((group: KpiGroup) => 
        uniqueKpiGroups.includes(group.kpi_grp_name)
      );
      setCorrelationKpiGroups((prev) => ({
        ...prev,
        [monitoringArea]: filteredGroups,
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
      
      // Get all KPIs the user has access to for this monitoring area and KPI group
      const userAccessKpis = userAccess
        .filter(ua => 
          ua.mon_area === formData.monitoringArea && 
          ua.kpi_group === kpiGroup
        )
        .map(ua => ua.kpi_id);

      // Only show KPIs that are in the user's access list
      const filteredKpis = (response.data || []).filter((kpi: Kpi) => 
        userAccessKpis.includes(kpi.kpi_name)
      );

      setCorrelationKpis((prev) => ({
        ...prev,
        [kpiGroup]: filteredKpis,
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

  const isKpiSelected = (kpiName: string, monitoringArea: string, kpiGroup: string) => {
    // Check if this KPI is selected as primary KPI with same monitoring area and KPI group
    if (formData.monitoringArea === monitoringArea &&
        formData.kpiGroup === kpiGroup &&
        formData.kpi === kpiName) {
      return true;
    }

    // Check if this KPI is selected in any correlation KPI with same monitoring area and KPI group
    return formData.correlationKpis.some(
      (corrKpi) =>
        corrKpi.monitoringArea === monitoringArea &&
        corrKpi.kpiGroup === kpiGroup &&
        corrKpi.kpi === kpiName
    );
  };

  const canAddMoreCorrelationKpis = () => {
    if (formData.correlationKpis.length === 0) return true;

    const lastCorrelationKpi = formData.correlationKpis[formData.correlationKpis.length - 1];
    return lastCorrelationKpi.monitoringArea && lastCorrelationKpi.kpiGroup && lastCorrelationKpi.kpi;
  };

  const handleKPIChange = (value: string) => {
    if (isKpiSelected(value, formData.monitoringArea, formData.kpiGroup)) {
      toast({
        title: "Error",
        description: "This KPI is already selected for this monitoring area and KPI group",
        variant: "destructive",
      });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      kpi: value,
      // Set the graph name to the KPI description when a KPI is selected
      graphName: kpis.find(k => k.kpi_name === value)?.kpi_desc || prev.graphName
    }));
  };

  const addCorrelationKpi = () => {
    // Check if already has maximum allowed correlation KPIs (4)
    if (formData.correlationKpis.length >= 4) {
      toast({
        title: "Error",
        description: "Maximum 4 correlation KPIs allowed",
        variant: "destructive",
      });
      return;
    }

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
      } else if (field === "kpi") {
        // Check for duplicate KPIs only if monitoring area and KPI group are the same
        if (isKpiSelected(value, newCorrelationKpis[index].monitoringArea, newCorrelationKpis[index].kpiGroup)) {
          toast({
            title: "Error",
            description: "This KPI is already selected for this monitoring area and KPI group",
            variant: "destructive",
          });
          return prev;
        }
        newCorrelationKpis[index] = {
          ...newCorrelationKpis[index],
          [field]: value,
        };
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

  // Update the handleSubmit function to prevent duplicate submissions
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (isLoading) {
      return;
    }
    setIsLoading(true);

    // Check if any required field is empty
    if (
      !formData.graphName.trim() ||
      !formData.monitoringArea ||
      !formData.kpiGroup ||
      !formData.kpi
    ) {
      setShowValidationErrors(true);
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Check if any visible correlation KPI fields are empty
    const hasEmptyCorrelationFields = formData.correlationKpis.some(
      corrKpi => !corrKpi.monitoringArea || !corrKpi.kpiGroup || !corrKpi.kpi
    );

    if (hasEmptyCorrelationFields) {
      setShowValidationErrors(true);
      toast({
        title: "Error",
        description: "Please fill in all correlation KPI fields",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // For edit mode, we only need to validate that the name is provided
    if (editingGraph) {
      // Create the graph data with updated fields
      const graphData = {
        name: formData.graphName,
        type: formData.graphType as "line" | "bar",
        monitoringArea: formData.monitoringArea,
        kpiGroup: formData.kpiGroup,
        primaryKpi: formData.kpi,
        correlationKpis: formData.correlationKpis
          .filter((kpi) => kpi.kpi)
          .map((kpi) => kpi.kpi),
        layout: editingGraph.layout || { x: 0, y: 0, w: 4, h: 4 },
        id: editingGraph.id,
      };

      // Pass the data back to the parent component
      onAddGraph(graphData);

      // Close the sheet
      onClose();

      // Show success message
      toast({
        title: "Graph Updated",
        description: "Graph has been updated successfully",
      });
      return;
    }

    // Create the graph data to pass back to the parent component
    const graphData = {
      name: formData.graphName,
      type: formData.graphType as "line" | "bar",
      monitoringArea: formData.monitoringArea,
      kpiGroup: formData.kpiGroup,
      primaryKpi: formData.kpi,
      correlationKpis: formData.correlationKpis
        .filter((kpi) => kpi.kpi)
        .map((kpi) => kpi.kpi),
      layout: { x: 0, y: 0, w: 4, h: 4 },
    };

    // Pass the data back to the parent component
    onAddGraph(graphData);

    // Close the sheet
    onClose();

    // Show success message
    toast({
      title: "Graph Added",
      description: "Graph has been added successfully",
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Reset validation errors when user starts typing
    setShowValidationErrors(false);
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

  // Update the submit button text based on whether editing or adding
  const submitButtonText = editingGraph ? "Update Graph" : "Add Graph";

  // Make sure this useEffect runs when editingGraph changes
  useEffect(() => {
    if (editingGraph) {
      const loadEditData = async () => {
        try {
          setIsLoading(true);

          // Step 1: Fetch monitoring areas first
          const monAreasResponse = await axios.get(`${baseUrl}/api/ma`);
          const monAreas = monAreasResponse.data || [];
          setMonitoringAreas(monAreas);

          // Step 2: Fetch KPI groups for the editing graph's monitoring area
          if (editingGraph.monitoringArea) {
            const kpiGroupsResponse = await axios.get(
              `${baseUrl}/api/kpigrp?mon_area=${editingGraph.monitoringArea}`
            );
            const groups = kpiGroupsResponse.data || [];
            setKpiGroups(groups);

            // Step 3: Fetch KPIs for the editing graph's KPI group
            if (editingGraph.kpiGroup) {
              const kpiResponse = await axios.get(
                `${baseUrl}/api/kpi?kpi_grp=${editingGraph.kpiGroup}`
              );
              const kpis = kpiResponse.data || [];
              setKpis(kpis);
            }
          }

          // Step 4: Load data for correlation KPIs
          if (editingGraph.correlationKpis && editingGraph.correlationKpis.length > 0) {
            // Initialize correlation KPIs with proper structure
            const correlationKpis = editingGraph.correlationKpis.map((kpi, index) => ({
              id: `corr-${Date.now()}-${index}`,
              monitoringArea: editingGraph.monitoringArea,
              kpiGroup: editingGraph.kpiGroup,
              kpi: kpi
            }));

            // Update form data with correlation KPIs
            setFormData(prev => ({
              ...prev,
              correlationKpis
            }));

            // Fetch KPI groups and KPIs for correlation KPIs
            for (const corrKpi of correlationKpis) {
              if (corrKpi.monitoringArea) {
                await fetchCorrelationKpiGroups(corrKpi.monitoringArea);
                if (corrKpi.kpiGroup) {
                  await fetchCorrelationKpis(corrKpi.kpiGroup);
                }
              }
            }
          }

          // Update form data with editing graph values
          setFormData(prev => ({
            ...prev,
            monitoringArea: editingGraph.monitoringArea,
            kpiGroup: editingGraph.kpiGroup,
            kpi: editingGraph.primaryKpi,
            graphType: editingGraph.type,
            graphName: editingGraph.name
          }));

        } catch (error) {
          console.error("Error loading data for edit graph:", error);
          toast({
            title: "Error",
            description: "Failed to load data for editing graph",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };

      loadEditData();
    }
  }, [editingGraph, baseUrl]);

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
              onValueChange={(value) => {
                handleMonitoringAreaChange(value);
                setShowValidationErrors(false);
              }}
              disabled={isLoading || monitoringAreas.length === 0}
            >
              <SelectTrigger className={`${showValidationErrors && !formData.monitoringArea ? "border-destructive focus:ring-destructive" : ""}`}>
                <SelectValue placeholder="Select monitoring area">
                  {formData.monitoringArea || "Select Monitoring Area"}
                </SelectValue>
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
            {showValidationErrors && !formData.monitoringArea && (
              <p className="text-sm text-destructive mt-1">Please select a monitoring area</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-2">
              KPI Group
            </label>
            <Select
              value={formData.kpiGroup}
              onValueChange={(value) => {
                handleKPIGroupChange(value);
                setShowValidationErrors(false);
              }}
              disabled={
                !formData.monitoringArea || isLoading || kpiGroups.length === 0
              }
            >
              <SelectTrigger className={`${showValidationErrors && !formData.kpiGroup ? "border-destructive focus:ring-destructive" : ""}`}>
                <SelectValue placeholder="Select KPI group">
                  {formData.kpiGroup || "Select KPI Group"}
                </SelectValue>
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
            {showValidationErrors && !formData.kpiGroup && (
              <p className="text-sm text-destructive mt-1">Please select a KPI group</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/90 mb-2">
              Primary KPI
            </label>
            <Select
              value={formData.kpi}
              onValueChange={(value) => {
                handleKPIChange(value);
                setShowValidationErrors(false);
              }}
              disabled={!formData.kpiGroup || isLoading || kpis.length === 0}
            >
              <SelectTrigger className={`${showValidationErrors && !formData.kpi ? "border-destructive focus:ring-destructive" : ""}`}>
                <SelectValue placeholder="Select KPI">
                  {formData.kpi ? kpis.find(k => k.kpi_name === formData.kpi)?.kpi_desc || "Select KPI" : "Select KPI"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {kpis.map((kpi) => (
                  <Tooltip key={kpi.kpi_desc}>
                    <TooltipTrigger asChild>
                      <SelectItem value={kpi.kpi_name}>
                        {kpi.kpi_desc}
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
            {showValidationErrors && !formData.kpi && (
              <p className="text-sm text-destructive mt-1">Please select a primary KPI</p>
            )}
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
                readOnly
                disabled
                className="w-full px-4 py-2 rounded-lg border border-border bg-background/80 focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 cursor-not-allowed opacity-70"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set at template level
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                Resolution
              </label>
              <input
                type="text"
                name="resolution"
                value={formData.resolution}
                readOnly
                disabled
                className="w-full px-4 py-2 rounded-lg border border-border bg-background/80 focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 cursor-not-allowed opacity-70"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set at template level
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-foreground/90">
                Correlation KPIs <span className="text-xs text-muted-foreground">(max 4)</span>
              </label>
            </div>
            <div className="space-y-3">
              {formData.correlationKpis.map((corrKpi, index) => (
                <div key={corrKpi.id} className="flex items-center gap-2">
                  <div className="grid grid-cols-3 gap-2 flex-grow">
                    <div className="space-y-1">
                      <Select
                        value={corrKpi.monitoringArea}
                        onValueChange={(value) => {
                          handleCorrelationKpiChange(index, "monitoringArea", value);
                          // Reset KPI group and KPI when monitoring area changes
                          handleCorrelationKpiChange(index, "kpiGroup", "");
                          handleCorrelationKpiChange(index, "kpi", "");
                          // Fetch KPI groups for this monitoring area
                          fetchCorrelationKpiGroups(value);
                        }}
                      >
                        <SelectTrigger className={`${showValidationErrors && !corrKpi.monitoringArea ? "border-destructive focus:ring-destructive" : ""}`}>
                          <SelectValue placeholder="Monitoring Area">
                            <span className="text-xs">{corrKpi.monitoringArea || "Monitoring Area"}</span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {monitoringAreas.map((ma) => (
                            <SelectItem key={ma.mon_area_name} value={ma.mon_area_name}>
                              <span className="text-xs">{ma.mon_area_name}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {showValidationErrors && !corrKpi.monitoringArea && (
                        <p className="text-xs text-destructive">Please select a monitoring area</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Select
                        value={corrKpi.kpiGroup}
                        onValueChange={(value) => {
                          handleCorrelationKpiChange(index, "kpiGroup", value);
                          // Reset KPI when KPI group changes
                          handleCorrelationKpiChange(index, "kpi", "");
                          // Fetch KPIs for this KPI group
                          fetchCorrelationKpis(value);
                        }}
                        disabled={!corrKpi.monitoringArea}
                      >
                        <SelectTrigger className={`${showValidationErrors && !corrKpi.kpiGroup ? "border-destructive focus:ring-destructive" : ""}`}>
                          <SelectValue placeholder="KPI Group">
                            {corrKpi.kpiGroup || "KPI Group"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(correlationKpiGroups[corrKpi.monitoringArea] || []).map((group) => (
                            <SelectItem key={group.kpi_grp_name} value={group.kpi_grp_name}>
                              {group.kpi_grp_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {showValidationErrors && !corrKpi.kpiGroup && (
                        <p className="text-xs text-destructive">Please select a KPI group</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Select
                        value={corrKpi.kpi}
                        onValueChange={(value) =>
                          handleCorrelationKpiChange(index, "kpi", value)
                        }
                        disabled={!corrKpi.kpiGroup}
                      >
                        <SelectTrigger className={`${showValidationErrors && !corrKpi.kpi ? "border-destructive focus:ring-destructive" : ""}`}>
                          <SelectValue placeholder="Select KPI">
                            {corrKpi.kpi ? correlationKpis[corrKpi.kpiGroup]?.find(k => k.kpi_name === corrKpi.kpi)?.kpi_desc || "Select KPI" : "Select KPI"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(correlationKpis[corrKpi.kpiGroup] || [])
                            .filter(kpi => !isKpiSelected(kpi.kpi_name, corrKpi.monitoringArea, corrKpi.kpiGroup))
                            .map((kpi) => (
                              <Tooltip key={kpi.kpi_desc}>
                                <TooltipTrigger asChild>
                                  <SelectItem value={kpi.kpi_name}>
                                    {kpi.kpi_desc}
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
                      {showValidationErrors && !corrKpi.kpi && (
                        <p className="text-xs text-destructive">Please select a KPI</p>
                      )}
                    </div>
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
                  formData.correlationKpis.length >= 4 ||
                  !formData.kpiGroup ||
                  !canAddMoreCorrelationKpis()
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
              className={`w-full px-4 py-2 rounded-lg border transition-all duration-200 ${
                showValidationErrors && !formData.graphName.trim()
                  ? "border-destructive focus:ring-destructive"
                  : "border-border focus:ring-ring"
              } focus:ring-2 focus:border-transparent bg-background/50`}
            />
            {showValidationErrors && !formData.graphName.trim() && (
              <p className="text-sm text-destructive mt-1">Please enter a graph name</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Default name is the primary KPI description. You can edit it as needed.
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="flex items-center justify-end gap-4 pt-6 border-t border-border"
        >
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{submitButtonText}</Button>
        </motion.div>
      </motion.form>
    </TooltipProvider>
  );
};

export default AddGraphSheet;
