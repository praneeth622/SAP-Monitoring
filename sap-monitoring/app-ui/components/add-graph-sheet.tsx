"use client";

import React, { useState, useEffect, useCallback } from "react";
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
    monitoringAreaDesc?: string;
    kpiGroup: string;
    kpiGroupDesc?: string;
    primaryKpi: string;
    primaryKpiDesc?: string;
    correlationKpis: string[];
    correlationKpisDesc?: string[];
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
    monitoringAreaDesc?: string;
    kpiGroup: string;
    kpiGroupDesc?: string;
    primaryKpi: string;
    primaryKpiDesc?: string;
    correlationKpis: string[];
    correlationKpisDesc?: string[];
    layout: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
    id?: string;
    activeKPIs?: Set<string> | string[];
    kpiColors?: Record<string, { color: string; name: string }>;
    kpisChanged: boolean;
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
  // Only set initial loading if editing
  const [loadingStates, setLoadingStates] = useState({
    initialLoad: editingGraph !== null,
    monitoringAreas: false,
    kpiGroups: false,
    kpis: false
  });
  // Add a dataReady state to prevent flickering
  const [dataReady, setDataReady] = useState(editingGraph === null); // Data is ready immediately for new graphs
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

  // Define callback functions before they're used in useEffect
  const fetchCorrelationKpiGroups = useCallback(async (monitoringArea: string) => {
    if (!monitoringArea || correlationKpiGroups[monitoringArea]) return;

    try {
      // Get all KPI groups for the selected monitoring area
      const response = await axios.get(
        `${baseUrl}/api/kpigrp?mon_area=${monitoringArea}`
      );
      
      // Don't filter by monitoring area to allow selecting any KPI group
      // Just get all unique KPI groups the user has access to 
      const uniqueKpiGroups = [...new Set(
        userAccess.map(ua => ua.kpi_group)
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
  }, [correlationKpiGroups, userAccess, baseUrl, toast]);

  const fetchCorrelationKpis = useCallback(async (kpiGroup: string) => {
    if (!kpiGroup || correlationKpis[kpiGroup]) return;

    try {
      const response = await axios.get(
        `${baseUrl}/api/kpi?kpi_grp=${kpiGroup}`
      );
      
      // Get all KPIs the user has access to for this KPI group regardless of monitoring area
      const userAccessKpis = userAccess
        .filter(ua => ua.kpi_group === kpiGroup)
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
  }, [correlationKpis, userAccess, baseUrl, toast]);

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
        // Only show loading indicator when editing an existing graph
        if (editingGraph) {
          setLoadingStates(prev => ({ ...prev, initialLoad: true }));
        }
        
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
      // For new graphs, we'll continue loading monitoring areas in background
      // For edit mode, full loading state is managed in the editingGraph effect
    };

    fetchUserAccess();
  }, [baseUrl, toast, editingGraph]);

  // Step 1: Fetch monitoring areas on component mount
  useEffect(() => {
    const fetchMonitoringAreas = async () => {
      try {
        // For new graphs, don't show loading indicator
        if (editingGraph) {
          setLoadingStates(prev => ({ ...prev, monitoringAreas: true }));
        }
        
        // Fetch monitoring areas first regardless of user access
        const response = await axios.get(`${baseUrl}/api/ma`);
        
        // If no user access data yet, just load all monitoring areas initially
        // This ensures the dropdown is populated and not disabled
        if (userAccess.length === 0) {
          setMonitoringAreas(response.data || []);
          console.log("Loading all monitoring areas initially:", response.data);
        } else {
          // Once we have user access, filter the monitoring areas
          const uniqueMonitoringAreas = [...new Set(userAccess.map(ua => ua.mon_area))];
          const filteredAreas = (response.data || []).filter((area: MonitoringArea) =>
            uniqueMonitoringAreas.includes(area.mon_area_name)
          );
          
          console.log("Filtered monitoring areas by user access:", filteredAreas);
          setMonitoringAreas(filteredAreas);
          
          // Pre-fetch KPI groups for each monitoring area
          filteredAreas.forEach((area: MonitoringArea) => {
            fetchCorrelationKpiGroups(area.mon_area_name);
          });
        }
      } catch (error) {
        console.error("Error fetching monitoring areas:", error);
        toast({
          title: "Error",
          description: "Failed to fetch monitoring areas",
          variant: "destructive",
        });
      } finally {
        // Only update loading states when editing a graph
        // For new graphs, we don't show loading indicators
        if (editingGraph) {
          setLoadingStates(prev => ({ 
            ...prev, 
            monitoringAreas: false,
            // Only mark initial loading as complete here if not in edit mode
            initialLoad: editingGraph ? prev.initialLoad : false
          }));
        }
      }
    };

    fetchMonitoringAreas();
  }, [userAccess, baseUrl, fetchCorrelationKpiGroups, toast, editingGraph]);

  // Step 2: Fetch KPI groups when monitoring area is selected
  useEffect(() => {
    const fetchKpiGroups = async () => {
      if (!formData.monitoringArea) {
        setKpiGroups([]);
        return;
      }

      try {
        setLoadingStates(prev => ({ ...prev, kpiGroups: true }));
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
        setLoadingStates(prev => ({ ...prev, kpiGroups: false }));
      }
    };

    fetchKpiGroups();
  }, [formData.monitoringArea, userAccess, baseUrl, toast]);

  // Step 3: Fetch KPIs when KPI group is selected
  useEffect(() => {
    const fetchKpis = async () => {
      if (!formData.kpiGroup) {
        setKpis([]);
        return;
      }

      try {
        setLoadingStates(prev => ({ ...prev, kpis: true }));
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
        setLoadingStates(prev => ({ ...prev, kpis: false }));
      }
    };

    fetchKpis();
  }, [formData.kpiGroup, formData.monitoringArea, userAccess, baseUrl, toast]);

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

  // Update the isKpiSelected function to check for duplicates across all selections
  const isKpiSelected = (kpiName: string, monitoringArea: string, kpiGroup: string) => {
    // Check if this KPI is selected as primary KPI
    if (formData.kpi === kpiName) {
      return true;
    }

    // Check if this KPI is selected in any correlation KPI
    return formData.correlationKpis.some(
      (corrKpi) => corrKpi.kpi === kpiName
    );
  };

  // Update the handleKPIChange function to prevent duplicates
  const handleKPIChange = (value: string) => {
    if (isKpiSelected(value, formData.monitoringArea, formData.kpiGroup)) {
      toast({
        title: "Error",
        description: "This KPI is already selected either as primary KPI or in correlation KPIs",
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

  const canAddMoreCorrelationKpis = () => {
    if (formData.correlationKpis.length === 0) return true;

    const lastCorrelationKpi = formData.correlationKpis[formData.correlationKpis.length - 1];
    return lastCorrelationKpi.monitoringArea && lastCorrelationKpi.kpiGroup && lastCorrelationKpi.kpi;
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

    // Create a new correlation KPI entry with an empty monitoring area
    // This allows the user to select any monitoring area
    setFormData((prev) => ({
      ...prev,
      correlationKpis: [
        ...prev.correlationKpis,
        {
          id: `corr-${Date.now()}-${prev.correlationKpis.length}`,
          monitoringArea: "", // Leave empty for user to select any monitoring area
          kpiGroup: "",
          kpi: "",
        },
      ],
    }));
  };

  // Update the handleCorrelationKpiChange function to prevent duplicates
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
        
        // Always fetch KPI groups for this monitoring area, regardless of primary KPI
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
        // Check for duplicate KPIs across all selections
        if (isKpiSelected(value, newCorrelationKpis[index].monitoringArea, newCorrelationKpis[index].kpiGroup)) {
          toast({
            title: "Error",
            description: "This KPI is already selected either as primary KPI or in correlation KPIs",
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

  // Update the handleSubmit function to include description fields
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple submissions
    if (loadingStates.initialLoad) {
      return;
    }
    
    // Set a temporary submission loading state
    setLoadingStates(prev => ({ ...prev, initialLoad: true }));

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
      setLoadingStates(prev => ({ ...prev, initialLoad: false }));
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
      setLoadingStates(prev => ({ ...prev, initialLoad: false }));
      return;
    }

    // Get descriptions for monitoring area, KPI group, and primary KPI
    const monitoringAreaObj = monitoringAreas.find(
      area => area.mon_area_name === formData.monitoringArea
    );
    const kpiGroupObj = kpiGroups.find(
      group => group.kpi_grp_name === formData.kpiGroup
    );
    const kpiObj = kpis.find(k => k.kpi_name === formData.kpi);

    // Get descriptions for correlation KPIs
    const correlationKpisDesc = formData.correlationKpis
      .filter(kpi => kpi.kpi)
      .map(kpi => {
        // Find the KPI in the correlationKpis object
        const kpiList = correlationKpis[kpi.kpiGroup] || [];
        const kpiObj = kpiList.find(k => k.kpi_name === kpi.kpi);
        return kpiObj?.kpi_desc || "";
      });

    // For edit mode, we only need to validate that the name is provided
    if (editingGraph) {
      // Determine if KPIs have changed by comparing old and new KPI lists
      const oldKpis = [editingGraph.primaryKpi, ...editingGraph.correlationKpis].filter(Boolean).map(k => k.toLowerCase()).sort();
      const newKpis = [formData.kpi, ...formData.correlationKpis.filter(k => k.kpi).map(k => k.kpi)].filter(Boolean).map(k => k.toLowerCase()).sort();
      
      // Check if KPIs have changed by comparing sorted, lowercase arrays
      const kpisChanged = JSON.stringify(oldKpis) !== JSON.stringify(newKpis);
      
      console.log("Graph update - KPIs changed:", kpisChanged);
      console.log("Old KPIs:", oldKpis);
      console.log("New KPIs:", newKpis);
      
      // Create the graph data with updated fields and descriptions
      const graphData = {
        name: formData.graphName,
        type: formData.graphType as "line" | "bar",
        monitoringArea: formData.monitoringArea,
        monitoringAreaDesc: monitoringAreaObj?.mon_area_desc || editingGraph.monitoringAreaDesc || "",
        kpiGroup: formData.kpiGroup,
        kpiGroupDesc: kpiGroupObj?.kpi_grp_desc || editingGraph.kpiGroupDesc || "",
        primaryKpi: formData.kpi,
        primaryKpiDesc: kpiObj?.kpi_desc || editingGraph.primaryKpiDesc || "",
        correlationKpis: formData.correlationKpis
          .filter((kpi) => kpi.kpi)
          .map((kpi) => kpi.kpi),
        correlationKpisDesc: correlationKpisDesc,
        layout: editingGraph.layout || { x: 0, y: 0, w: 4, h: 4 },
        id: editingGraph.id,
        activeKPIs: editingGraph.activeKPIs || new Set(),
        kpiColors: editingGraph.kpiColors || {},
        // Add a flag to indicate KPIs have changed - this will be used by the parent component
        kpisChanged: kpisChanged,
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
      
      // Reset loading state
      setLoadingStates(prev => ({ ...prev, initialLoad: false }));
      return;
    }

    // Create the graph data to pass back to the parent component with descriptions
    const graphData = {
      name: formData.graphName,
      type: formData.graphType as "line" | "bar",
      monitoringArea: formData.monitoringArea,
      monitoringAreaDesc: monitoringAreaObj?.mon_area_desc || "",
      kpiGroup: formData.kpiGroup,
      kpiGroupDesc: kpiGroupObj?.kpi_grp_desc || "",
      primaryKpi: formData.kpi,
      primaryKpiDesc: kpiObj?.kpi_desc || "",
      correlationKpis: formData.correlationKpis
        .filter((kpi) => kpi.kpi)
        .map((kpi) => kpi.kpi),
      correlationKpisDesc: correlationKpisDesc,
      layout: { x: 0, y: 0, w: 4, h: 4 },
      // For new graphs, KPIs are always considered "changed" since there's no previous state
      kpisChanged: true,
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
    
    // Reset loading state
    setLoadingStates(prev => ({ ...prev, initialLoad: false }));
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

  // Make sure this useEffect runs when editingGraph changes
  useEffect(() => {
    if (editingGraph) {
      // Set data as not ready at the start of loading
      setDataReady(false);
      
      const loadEditData = async () => {
        try {
          // Set initial loading state
          setLoadingStates({
            initialLoad: true,
            monitoringAreas: true,
            kpiGroups: true,
            kpis: true
          });

          // Load everything in parallel to speed up loading
          const fetchPromises = [];
          
          // Step 1: Fetch user access if not already loaded
          let userAccessData = userAccess;
          if (userAccess.length === 0) {
            const userAccessPromise = axios.get(
              `${baseUrl}/api/ua?userId=${app_globals.default_user_id}`
            ).then(response => {
              userAccessData = response.data || [];
              setUserAccess(userAccessData);
            });
            fetchPromises.push(userAccessPromise);
          }
          
          // Step 2: Fetch all monitoring areas
          let allMonitoringAreas: MonitoringArea[] = [];
          const monAreasPromise = axios.get(`${baseUrl}/api/ma`)
            .then(response => {
              allMonitoringAreas = response.data || [];
            });
          fetchPromises.push(monAreasPromise);
          
          // Step 3: Fetch KPI groups for the editing graph's monitoring area
          let allKpiGroups: KpiGroup[] = [];
          if (editingGraph.monitoringArea) {
            const kpiGroupsPromise = axios.get(
              `${baseUrl}/api/kpigrp?mon_area=${editingGraph.monitoringArea}`
            ).then(response => {
              allKpiGroups = response.data || [];
            });
            fetchPromises.push(kpiGroupsPromise);
          }
          
          // Step 4: Fetch KPIs for the editing graph's KPI group
          let primaryKpis: Kpi[] = [];
          if (editingGraph.kpiGroup) {
            const kpiPromise = axios.get(
              `${baseUrl}/api/kpi?kpi_grp=${editingGraph.kpiGroup}`
            ).then(response => {
              primaryKpis = response.data || [];
            });
            fetchPromises.push(kpiPromise);
          }
          
          // Step 5: Prepare and fetch correlation KPI data
          const tempCorrelationKpiGroups: Record<string, KpiGroup[]> = {};
          const tempCorrelationKpis: Record<string, Kpi[]> = {};
          
          // Initialize correlation KPIs with proper structure
          const correlationKpisForForm = editingGraph.correlationKpis.map((kpi, index) => ({
            id: `corr-${Date.now()}-${index}`,
            monitoringArea: editingGraph.monitoringArea,
            kpiGroup: editingGraph.kpiGroup,
            kpi: kpi
          }));
          
          // Fetch correlation data for the main monitoring area
          if (editingGraph.monitoringArea) {
            const maGroupsPromise = axios.get(`${baseUrl}/api/kpigrp?mon_area=${editingGraph.monitoringArea}`)
              .then(response => {
                tempCorrelationKpiGroups[editingGraph.monitoringArea] = response.data || [];
              });
            fetchPromises.push(maGroupsPromise);
          }
          
          // Fetch correlation KPIs for the main KPI group
          if (editingGraph.kpiGroup) {
            const maKpisPromise = axios.get(`${baseUrl}/api/kpi?kpi_grp=${editingGraph.kpiGroup}`)
              .then(response => {
                tempCorrelationKpis[editingGraph.kpiGroup] = response.data || [];
              });
            fetchPromises.push(maKpisPromise);
          }
          
          // Wait for all parallel fetches to complete
          await Promise.all(fetchPromises);
          
          // Now process and update all states at once
          
          // 1. Filter monitoring areas based on user access
          if (userAccessData.length > 0) {
            const uniqueMonitoringAreas = [...new Set(userAccessData.map(ua => ua.mon_area))];
            const filteredAreas = allMonitoringAreas.filter(area => 
              uniqueMonitoringAreas.includes(area.mon_area_name)
            );
            setMonitoringAreas(filteredAreas);
          } else {
            setMonitoringAreas(allMonitoringAreas);
          }
          
          // 2. Filter KPI groups based on user access
          if (userAccessData.length > 0 && editingGraph.monitoringArea) {
            const uniqueKpiGroups = [...new Set(
              userAccessData
                .filter(ua => ua.mon_area === editingGraph.monitoringArea)
                .map(ua => ua.kpi_group)
            )];
            const filteredGroups = allKpiGroups.filter(group => 
              uniqueKpiGroups.includes(group.kpi_grp_name)
            );
            setKpiGroups(filteredGroups);
          } else {
            setKpiGroups(allKpiGroups);
          }
          
          // 3. Filter KPIs based on user access
          if (userAccessData.length > 0 && editingGraph.monitoringArea && editingGraph.kpiGroup) {
            const userAccessKpis = userAccessData
              .filter(ua => 
                ua.mon_area === editingGraph.monitoringArea && 
                ua.kpi_group === editingGraph.kpiGroup
              )
              .map(ua => ua.kpi_id);
            const filteredKpis = primaryKpis.filter(kpi => 
              userAccessKpis.includes(kpi.kpi_name)
            );
            setKpis(filteredKpis);
          } else {
            setKpis(primaryKpis);
          }
          
          // 4. Update correlation KPI data
          setCorrelationKpiGroups(prev => {
            const newData = { ...prev };
            Object.keys(tempCorrelationKpiGroups).forEach(key => {
              newData[key] = tempCorrelationKpiGroups[key];
            });
            return newData;
          });
          
          setCorrelationKpis(prev => {
            const newData = { ...prev };
            Object.keys(tempCorrelationKpis).forEach(key => {
              newData[key] = tempCorrelationKpis[key];
            });
            return newData;
          });
          
          // 5. Finally update form data
          setFormData({
            monitoringArea: editingGraph.monitoringArea,
            kpiGroup: editingGraph.kpiGroup,
            kpi: editingGraph.primaryKpi,
            correlationKpis: correlationKpisForForm,
            graphType: editingGraph.type,
            timeInterval: template.timeRange,
            resolution: template.resolution,
            graphName: editingGraph.name
          });

          // Mark data as ready to show UI
          setDataReady(true);
          
        } catch (error) {
          console.error("Error loading data for edit graph:", error);
          toast({
            title: "Error",
            description: "Failed to load data for editing graph",
            variant: "destructive",
          });
          
          // Even on error, mark data as ready to show something
          setDataReady(true);
        } finally {
          // Mark all loading as complete
          setLoadingStates({
            initialLoad: false,
            monitoringAreas: false,
            kpiGroups: false,
            kpis: false
          });
        }
      };

      loadEditData();
    } else {
      // If not editing, mark as ready immediately
      setDataReady(true);
      setLoadingStates({
        initialLoad: false,
        monitoringAreas: false,
        kpiGroups: false,
        kpis: false
      });
    }
  }, [editingGraph, baseUrl, toast, template.timeRange, template.resolution, userAccess]);

  return (
    <TooltipProvider>
      <motion.form
        initial="hidden"
        animate="visible"
        variants={formVariants}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
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
              disabled={loadingStates.initialLoad || monitoringAreas.length === 0}
            >
              <SelectTrigger 
                className={`${showValidationErrors && !formData.monitoringArea ? "border-destructive focus:ring-destructive" : ""} 
                  ${(editingGraph !== null && !dataReady) ? "opacity-70 backdrop-blur-sm animate-pulse" : ""}`}
              >
                {loadingStates.monitoringAreas || (editingGraph !== null && !dataReady) ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                    <span className="text-muted-foreground">Loading...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Select monitoring area">
                    {formData.monitoringArea || "Select Monitoring Area"}
                  </SelectValue>
                )}
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
                !formData.monitoringArea || loadingStates.initialLoad || kpiGroups.length === 0
              }
            >
              <SelectTrigger 
                className={`${showValidationErrors && !formData.kpiGroup ? "border-destructive focus:ring-destructive" : ""}
                  ${(editingGraph !== null && !dataReady) ? "opacity-70 backdrop-blur-sm animate-pulse" : ""}`}
              >
                {loadingStates.kpiGroups || (editingGraph !== null && !dataReady) ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                    <span className="text-muted-foreground">Loading...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Select KPI group">
                    {formData.kpiGroup || "Select KPI Group"}
                  </SelectValue>
                )}
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
              disabled={!formData.kpiGroup || loadingStates.initialLoad || kpis.length === 0}
            >
              <SelectTrigger 
                className={`${showValidationErrors && !formData.kpi ? "border-destructive focus:ring-destructive" : ""}
                  ${(editingGraph !== null && !dataReady) ? "opacity-70 backdrop-blur-sm animate-pulse" : ""}`}
              >
                {loadingStates.kpis || (editingGraph !== null && !dataReady) ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                    <span className="text-muted-foreground">Loading...</span>
                  </div>
                ) : (
                  <SelectValue placeholder="Select KPI">
                    {formData.kpi ? (() => {
                      const selectedKpi = kpis.find(k => k.kpi_name === formData.kpi);
                      return selectedKpi?.kpi_desc || formData.kpi;
                    })() : "Select KPI"}
                  </SelectValue>
                )}
              </SelectTrigger>
              <SelectContent>
                {kpis
                  // Filter out KPIs that are already selected in correlation KPIs
                  .filter(kpi => !formData.correlationKpis.some(corrKpi => corrKpi.kpi === kpi.kpi_name))
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
            {showValidationErrors && !formData.kpi && (
              <p className="text-sm text-destructive mt-1">Please select a primary KPI</p>
            )}
          </div>

          <div className={`${(editingGraph !== null && !dataReady) ? "opacity-70 filter blur-[1px]" : ""}`}>
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
                disabled={editingGraph !== null && !dataReady}
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
                disabled={editingGraph !== null && !dataReady}
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

          <div className={`grid grid-cols-2 gap-4 ${(editingGraph !== null && !dataReady) ? "opacity-70 filter blur-[1px]" : ""}`}>
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                Time Interval
              </label>
              <Select
                value={formData.timeInterval}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, timeInterval: value }));
                  setShowValidationErrors(false);
                }}
                disabled={editingGraph !== null && !dataReady}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select time interval" />
                </SelectTrigger>
                <SelectContent>
                  {["auto", "last 1 hour", "today", "yesterday", "last 7 days", "last 30 days", "last 90 days", "custom"].map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Individual graph time interval
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                Resolution
              </label>
              <Select
                value={formData.resolution}
                onValueChange={(value) => {
                  setFormData((prev) => ({ ...prev, resolution: value }));
                  setShowValidationErrors(false);
                }}
                disabled={editingGraph !== null && !dataReady}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select resolution" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: "auto", label: "Auto" },
                    { value: "1m", label: "1 Minute" },
                    { value: "5m", label: "5 Minutes" },
                    { value: "15m", label: "15 Minutes" },
                    { value: "1h", label: "1 Hour" },
                    { value: "1d", label: "1 Day" }
                  ].map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Individual graph resolution
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
                <div key={corrKpi.id} className={`flex items-center gap-2 ${(editingGraph !== null && !dataReady) ? "opacity-70 backdrop-blur-sm animate-pulse" : ""}`}>
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
                        disabled={editingGraph !== null && !dataReady}
                      >
                        <SelectTrigger className={`${showValidationErrors && !corrKpi.monitoringArea ? "border-destructive focus:ring-destructive" : ""}`}>
                          <SelectValue placeholder="Monitoring Area">
                            <span className="text-xs">{corrKpi.monitoringArea || "Monitoring Area"}</span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {/* Show all monitoring areas without filtering */}
                          {monitoringAreas.map((ma) => (
                            <SelectItem key={ma.mon_area_name} value={ma.mon_area_name}>
                              <span className="text-xs">{ma.mon_area_name} - {ma.mon_area_desc}</span>
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
                        disabled={!corrKpi.monitoringArea || (editingGraph !== null && !dataReady)}
                      >
                        <SelectTrigger className={`${showValidationErrors && !corrKpi.kpiGroup ? "border-destructive focus:ring-destructive" : ""}`}>
                          <SelectValue placeholder="KPI Group">
                            {corrKpi.kpiGroup ? (correlationKpiGroups[corrKpi.monitoringArea]?.find(g => g.kpi_grp_name === corrKpi.kpiGroup)?.kpi_grp_desc || corrKpi.kpiGroup) : "KPI Group"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(correlationKpiGroups[corrKpi.monitoringArea] || []).map((group) => (
                            <SelectItem key={group.kpi_grp_name} value={group.kpi_grp_name}>
                              {group.kpi_grp_name} - {group.kpi_grp_desc}
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
                        disabled={!corrKpi.kpiGroup || (editingGraph !== null && !dataReady)}
                      >
                        <SelectTrigger className={`${showValidationErrors && !corrKpi.kpi ? "border-destructive focus:ring-destructive" : ""}`}>
                          <SelectValue placeholder="Select KPI">
                            {corrKpi.kpi && correlationKpis[corrKpi.kpiGroup] 
                              ? (() => {
                                  const selectedKpi = correlationKpis[corrKpi.kpiGroup].find(k => k.kpi_name === corrKpi.kpi);
                                  return selectedKpi?.kpi_desc || corrKpi.kpi;
                                })() 
                              : "Select KPI"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {(correlationKpis[corrKpi.kpiGroup] || [])
                            // Filter out KPIs that are already selected anywhere
                            .filter(kpi => !isKpiSelected(kpi.kpi_name, corrKpi.monitoringArea, corrKpi.kpiGroup))
                            .map((kpi) => (
                              <SelectItem key={kpi.kpi_name} value={kpi.kpi_name}>
                                {kpi.kpi_desc}
                              </SelectItem>
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
                    disabled={editingGraph !== null && !dataReady}
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
                  !canAddMoreCorrelationKpis() ||
                  (editingGraph !== null && !dataReady)
                }
                className={`${(editingGraph !== null && !dataReady) ? "opacity-70" : ""}`}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Correlation KPI
              </Button>
            </div>
          </div>

          <div className={`${(editingGraph !== null && !dataReady) ? "opacity-70 filter blur-[1px]" : ""}`}>
            <label className="block text-sm font-medium text-foreground/90 mb-2">
              Graph Name
            </label>
            <input
              type="text"
              name="graphName"
              value={formData.graphName}
              onChange={handleChange}
              placeholder="Enter graph name"
              disabled={editingGraph !== null && !dataReady}
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
          <Button type="submit" disabled={editingGraph !== null && !dataReady}>
            {editingGraph ? "Update Graph" : "Add Graph"}
          </Button>
        </motion.div>
      </motion.form>
    </TooltipProvider>
  );
};

export default AddGraphSheet;
