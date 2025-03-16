"use client";

import React, { useState, useEffect } from "react";
import { Check, ChevronDown, Info, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import axios from "axios";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Initialize empty KPI data arrays
const jobsKpiData: KPI[] = [];
const osKpiData: KPI[] = [];
const kpiData = [...jobsKpiData, ...osKpiData];

// Interfaces
interface SystemResponse {
  system_id: string;
  instance: string;
  client: string;
  type: string;
  polling: boolean;
  connection: boolean;
  description: string;
}

interface MonitoringArea {
  mon_area_name: string;
  mon_area_desc: string;
  created_at: string;
  created_by: string;
  modified_at: string;
  modified_by: string;
}

interface KPIGroup {
  sapfrequency: string;
  mon_area: string;
  instance: boolean;
  is_active: boolean;
  sysfrequency: string;
  modified_by: string;
  created_at: string;
  kpi_grp_desc: string;
  modified_at: string;
  created_by: string;
  kpi_grp_name: string;
}

interface KPI {
  kpi_name: string;
  kpi_desc: string;
  kpi_group: string;
  parent: boolean | string;
  unit: string;
  drilldown: boolean | string;
  filter: boolean | string;
  g2y: number | null;
  y2r: number | null;
  direction: string;
  criticality: string;
}

// Updated interfaces
interface TableKPI extends KPI {
  isExpanded?: boolean; // For tracking parent KPI expansion state
  children?: KPI[]; // For storing child KPIs
}

const steps = [
  { id: 1, name: "KPI Config", completed: true, current: false },
  { id: 2, name: "Extraction Config", completed: false, current: true },
  { id: 3, name: "Filters", completed: false, current: false },
  { id: 4, name: "User Access", completed: false, current: false },
];

const fetchWithError = async (url: string) => {
  const response = await axios.get(url);
  if (!response.ok) {
    console.error("Error fetching data:", response.statusText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.data;
};

export default function ConfigDashboard() {
  const [systems, setSystems] = useState<SystemResponse[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<string>("");
  const [monitoringAreas, setMonitoringAreas] = useState<MonitoringArea[]>([]);
  const [kpiGroups, setKpiGroups] = useState<KPIGroup[]>([]);

  // KPI Groups state - separate by monitoring area
  const [osKpiGroup, setOsKpiGroup] = useState<KPIGroup[]>([]);
  const [jobsKpiGroup, setJobsKpiGroup] = useState<KPIGroup[]>([]);

  // KPIs state - separate by monitoring area
  const [osKpis, setOsKpis] = useState<KPI[]>([]);
  const [jobsKpis, setJobsKpis] = useState<KPI[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [areaSearch, setAreaSearch] = useState("");
  const [kpiSearch, setKpiSearch] = useState("");
  const [activeAreas, setActiveAreas] = useState<Set<string>>(new Set());
  const [activeStep, setActiveStep] = useState(2);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [selectedKpis, setSelectedKpis] = useState<Set<string>>(new Set());

  // Add this state for KPI expansion
  const [expandedKpis, setExpandedKpis] = useState<Set<string>>(new Set());

  // Add KPI search state and filter function
  const [kpiSearchTerm, setKpiSearchTerm] = useState("");

  const filteredKpis = (kpis: KPI[]) => {
    if (!kpiSearchTerm) return kpis;

    return kpis.filter(
      (kpi) =>
        kpi.kpi_name.toLowerCase().includes(kpiSearchTerm.toLowerCase()) ||
        kpi.kpi_desc.toLowerCase().includes(kpiSearchTerm.toLowerCase()) ||
        kpi.kpi_group.toLowerCase().includes(kpiSearchTerm.toLowerCase())
    );
  };

  // Add new state for KPI Groups
  const [activeKpiGroups, setActiveKpiGroups] = useState<Set<string>>(
    new Set()
  );

  // Add these state declarations at the top of your component
  const [frequencies, setFrequencies] = useState<
    Record<string, { sap: string; sys: string }>
  >({});

  // Add these to your existing state declarations
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedKpiSettings, setSelectedKpiSettings] = useState<KPI | null>(
    null
  );

  // Add useEffect to initialize activeKpiGroups from API data
  useEffect(() => {
    const initialActiveGroups = new Set(
      [...osKpiGroup, ...jobsKpiGroup]
        .filter((group) => group.is_active)
        .map((group) => group.kpi_grp_name)
    );
    setActiveKpiGroups(initialActiveGroups);
  }, [osKpiGroup, jobsKpiGroup]); // Dependencies array

  // Fetch systems - runs only once on component mount
  useEffect(() => {
    const fetchSystems = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/sys");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setSystems(data);
      } catch (error) {
        console.error("Error loading systems:", error);
        toast.error("Failed to load systems");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSystems();
  }, []); // Empty dependency array - runs once

  // Fetch monitoring areas when system is selected
  useEffect(() => {
    const fetchMonitoringAreas = async () => {
      if (!selectedSystem) return;

      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch("/api/ma");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setMonitoringAreas(data);

        // Reset states when system changes
        setActiveAreas(new Set());
        setKpiGroups([]);
        setOsKpiGroup([]);
        setJobsKpiGroup([]);
        setOsKpis([]);
        setJobsKpis([]);
      } catch (error) {
        console.error("Error loading monitoring areas:", error);
        toast.error("Failed to load monitoring areas");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonitoringAreas();
  }, [selectedSystem]); // Only runs when selectedSystem changes

  // Handle monitoring area toggle - optimized to prevent unnecessary API calls
  const handleMonitoringAreaToggle = async (areaName: string) => {
    try {
      setIsLoading(true);

      if (activeAreas.has(areaName)) {
        // Remove area
        setActiveAreas((prev) => {
          const next = new Set(prev);
          next.delete(areaName);
          return next;
        });

        // Clear KPIs for this area but keep KPI groups
        if (areaName === "OS") {
          setOsKpis([]);
        } else if (areaName === "JOBS") {
          setJobsKpis([]);
        }

        // Clear active KPI groups for this area
        const groupsToRemove = [...osKpiGroup, ...jobsKpiGroup]
          .filter((group) => group.mon_area === areaName)
          .map((group) => group.kpi_grp_name);

        setActiveKpiGroups((prev) => {
          const next = new Set(prev);
          groupsToRemove.forEach((name) => next.delete(name));
          return next;
        });
      } else {
        // Add area and fetch its KPI groups
        const response = await fetch(`/api/kpigrp?mon_area=${areaName}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch KPI groups for ${areaName}`);
        }

        const kpiGroupData = await response.json();
        setActiveAreas((prev) => new Set(prev).add(areaName));

        // Set KPI groups based on area
        if (areaName === "OS") {
          setOsKpiGroup(kpiGroupData);
        } else if (areaName === "JOBS") {
          setJobsKpiGroup(kpiGroupData);
        }
      }
    } catch (error) {
      console.error("Error toggling monitoring area:", error);
      toast.error(`Failed to load data for ${areaName}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Optimized system change handler
  const handleSystemChange = (value: string) => {
    if (value === selectedSystem) return; // Prevent unnecessary updates
    setSelectedSystem(value);
    // Reset all dependent states
    setMonitoringAreas([]);
    setKpiGroups([]);
    setActiveAreas(new Set());
    setOsKpiGroup([]);
    setJobsKpiGroup([]);
    setOsKpis([]);
    setJobsKpis([]);
  };

  // Filter functions
  const filteredMonitoringAreas = monitoringAreas.filter(
    (area) =>
      area.mon_area_name.toLowerCase().includes(areaSearch.toLowerCase()) ||
      area.mon_area_desc.toLowerCase().includes(areaSearch.toLowerCase())
  );

  const filteredKpiGroups = kpiGroups.filter(
    (kpi) =>
      kpi.kpi_name?.toLowerCase().includes(kpiSearch.toLowerCase()) ||
      kpi.kpi_desc?.toLowerCase().includes(kpiSearch.toLowerCase())
  );

  // Add handler for KPI group selection
  const handleKpiGroupSelect = async (groupName: string, monArea: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/kpi?kpi_grp=${groupName}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch KPIs for ${groupName}`);
      }

      const kpiData = await response.json();

      // Set KPIs based on monitoring area
      if (monArea === "OS") {
        setOsKpis(kpiData);
      } else if (monArea === "JOBS") {
        setJobsKpis(kpiData);
      }
    } catch (error) {
      console.error("Error loading KPIs:", error);
      toast.error(`Failed to load KPIs for ${groupName}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function to handle KPI expansion
  const handleKpiExpand = (kpiName: string) => {
    setExpandedKpis((prev) => {
      const next = new Set(prev);
      if (next.has(kpiName)) {
        next.delete(kpiName);
      } else {
        next.add(kpiName);
      }
      return next;
    });
  };

  // Add this function inside your component
  const handleFrequencyChange = (
    groupName: string,
    type: "sap" | "sys",
    value: string
  ) => {
    // Ensure value is a positive number or empty
    if (value && !/^\d+$/.test(value)) return;

    setFrequencies((prev) => ({
      ...prev,
      [groupName]: {
        ...prev[groupName],
        [type]: value,
      },
    }));
  };

  // Update card styles for tables
  const tableContainerStyles = "max-h-[600px] overflow-y-auto custom-scrollbar";

  // Update the Monitoring Areas table render
  const renderMonitoringAreas = () => (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Monitoring Areas</h2>
        <Input
          placeholder="Search areas..."
          value={areaSearch}
          onChange={(e) => setAreaSearch(e.target.value)}
          className="w-[200px]"
        />
      </div>

      <div className="sticky top-0 z-10 bg-background grid grid-cols-4 gap-4 mb-2 px-2 font-medium text-sm text-gray-500">
        <div>Area</div>
        <div>Description</div>
        <div className="text-center">Active</div>
        <div className="text-center">Select</div>
      </div>

      <div className={tableContainerStyles}>
        {filteredMonitoringAreas.map((area) => (
          <div
            key={area.mon_area_name}
            className="grid grid-cols-4 gap-4 items-center p-2 hover:bg-accent/5 rounded-lg"
          >
            <div>{area.mon_area_name}</div>
            <div className="text-sm text-gray-600">{area.mon_area_desc}</div>
            <div className="flex justify-center">
              <Switch
                checked={activeAreas.has(area.mon_area_name)}
                onCheckedChange={() =>
                  handleMonitoringAreaToggle(area.mon_area_name)
                }
              />
            </div>
            <div className="flex justify-center">
              <Checkbox />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );

  // Update the KPI Groups table render
  const renderKPIGroups = () => (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">KPI Groups</h2>
        <Input
          placeholder="Search KPI groups..."
          value={kpiSearch}
          onChange={(e) => setKpiSearch(e.target.value)}
          className="w-[200px]"
        />
      </div>

      <div className="sticky top-0 z-10 bg-background grid grid-cols-5 gap-4 mb-2 px-2 font-medium text-sm text-gray-500">
        <div>Group</div>
        <div>Description</div>
        <div className="text-center">SAP Frequency</div>
        <div className="text-center">System Frequency</div>
        <div className="text-center">Active</div>
      </div>

      <div className={tableContainerStyles}>
        {[...osKpiGroup, ...jobsKpiGroup].map((group) => {
          // Initialize frequencies if not already set
          if (!frequencies[group.kpi_grp_name]) {
            frequencies[group.kpi_grp_name] = {
              sap: group.sapfrequency || "60",
              sys: group.sysfrequency || "60",
            };
          }

          return (
            <div
              key={group.kpi_grp_name}
              className="grid grid-cols-5 gap-4 items-center p-2 hover:bg-accent/5 rounded-lg"
            >
              <div>{group.kpi_grp_name}</div>
              <div className="text-sm text-gray-600">{group.kpi_grp_desc}</div>
              <div className="flex justify-center">
                <Input
                  type="text"
                  value={frequencies[group.kpi_grp_name]?.sap || ""}
                  onChange={(e) =>
                    handleFrequencyChange(
                      group.kpi_grp_name,
                      "sap",
                      e.target.value
                    )
                  }
                  className="w-20 text-center"
                  disabled={!activeAreas.has(group.mon_area)}
                />
              </div>
              <div className="flex justify-center">
                <Input
                  type="text"
                  value={frequencies[group.kpi_grp_name]?.sys || ""}
                  onChange={(e) =>
                    handleFrequencyChange(
                      group.kpi_grp_name,
                      "sys",
                      e.target.value
                    )
                  }
                  className="w-20 text-center"
                  disabled={!activeAreas.has(group.mon_area)}
                />
              </div>
              <div className="flex justify-center">
                <Switch
                  checked={activeKpiGroups.has(group.kpi_grp_name)}
                  onCheckedChange={() =>
                    handleKpiGroupToggle(group.kpi_grp_name, group.mon_area)
                  }
                  disabled={!activeAreas.has(group.mon_area)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );

  // Update the KPIs table render with parent/child structure
  const renderKPIs = () => {
    const parentKpis = filteredKpis(
      [...osKpis, ...jobsKpis].filter((kpi) => kpi.parent === true)
    );
    const childKpis = [...osKpis, ...jobsKpis].filter((kpi) => !kpi.parent);

    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">KPIs</h2>
          <Input
            placeholder="Search KPIs..."
            value={kpiSearchTerm}
            onChange={(e) => setKpiSearchTerm(e.target.value)}
            className="w-[300px]"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Spinner className="h-6 w-6" />
          </div>
        ) : parentKpis.length > 0 ? (
          <div className={tableContainerStyles}>
            <div className="sticky top-0 z-10 bg-background grid grid-cols-6 gap-4 mb-2 px-2 font-medium text-sm text-gray-500">
              <div>KPI Name</div>
              <div>Monitoring Area</div>
              <div>KPI Desc</div>
              {/* <div>Dependency</div> */}
              {/* <div className="text-center">Active</div> */}
              <div className="text-center">Settings</div>
            </div>

            <div className="space-y-2">
              {parentKpis.map((kpi) => (
                <div key={kpi.kpi_name}>
                  <div
                    className="grid grid-cols-6 gap-4 items-center p-2 hover:bg-accent/5 rounded-lg cursor-pointer"
                    onClick={() => handleKpiExpand(kpi.kpi_name)}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          expandedKpis.has(kpi.kpi_name) ? "rotate-180" : ""
                        }`}
                      />
                      {kpi.kpi_name}
                    </div>
                    <div>{kpi.kpi_group}</div>
                    <div>{kpi.kpi_desc}</div>
                    {/* <div>{kpi.parent ? "Parent" : "Child"}</div> */}
                    {/* <div className="flex justify-center">
                      <Switch />
                    </div> */}
                    <div className="flex justify-center">
                      {kpi.parent && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleKpiSettings(kpi, e)}
                          className="h-8 w-8"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Child KPIs */}
                  {expandedKpis.has(kpi.kpi_name) && (
                    <div className="ml-8 space-y-2 mt-2">
                      {childKpis
                        .filter((child) => child.kpi_group === kpi.kpi_group)
                        .map((child) => (
                          <div
                            key={child.kpi_name}
                            className="grid grid-cols-5 gap-4 items-center p-2 hover:bg-accent/5 rounded-lg"
                          >
                            <div>{child.kpi_name}</div>
                            <div>{child.kpi_group}</div>
                            <div>{child.kpi_desc}</div>
                            {/* <div>Child</div> */}
                            {/* <div className="flex justify-center">
                              <Switch />
                            </div> */}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">
            {kpiSearchTerm
              ? "No matching KPIs found"
              : "Select a monitoring area to view KPIs"}
          </div>
        )}
      </Card>
    );
  };

  // Move handleKpiGroupToggle inside the component
  const handleKpiGroupToggle = async (groupName: string, monArea: string) => {
    try {
      setIsLoading(true);

      if (activeKpiGroups.has(groupName)) {
        setActiveKpiGroups((prev) => {
          const next = new Set(prev);
          next.delete(groupName);
          return next;
        });

        // Clear KPIs for this group
        if (monArea === "OS") {
          setOsKpis([]);
        } else if (monArea === "JOBS") {
          setJobsKpis([]);
        }
      } else {
        setActiveKpiGroups((prev) => new Set(prev).add(groupName));

        // Fetch KPIs for this group
        const response = await fetch(`/api/kpi?kpi_grp=${groupName}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch KPIs for ${groupName}`);
        }

        const kpiData = await response.json();
        if (monArea === "OS") {
          setOsKpis(kpiData);
        } else if (monArea === "JOBS") {
          setJobsKpis(kpiData);
        }
      }
    } catch (error) {
      console.error("Error toggling KPI group:", error);
      toast.error(`Failed to toggle KPI group ${groupName}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKpiSettings = (kpi: KPI, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding when clicking settings
    setSelectedKpiSettings(kpi);
    setIsSettingsOpen(true);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Progress Steps */}
      {/* <div className="flex justify-between mb-12 px-4">
        {steps.map((step) => (
          <div key={step.id} className="flex flex-1 items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full
                ${
                  step.completed
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground"
                } mr-2 transition-all duration-200 hover:scale-105 hover:shadow-md`}
            >
              {step.completed ? <Check className="h-5 w-5" /> : step.id}
            </div>
            <div
              className={`text-sm font-medium ${
                step.current
                  ? "text-primary font-semibold"
                  : step.completed
                  ? "text-primary/80"
                  : "text-muted-foreground"
              }`}
            >
              {step.name}
            </div>
            {step.id < steps.length && (
              <div
                className={`flex-1 h-1 mx-4 rounded-full transition-colors duration-200
                ${step.completed ? "bg-primary" : "bg-muted"}`}
              />
            )}
          </div>
        ))}
      </div> */}

      {/* Header Card */}
      <Card className="mb-8 p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:bg-accent/5">
        <div className="flex justify-between items-center">
          <div className="flex items-center justify-space-between space-x-6">
            <div>
              <h1 className="text-2xl font-bold">Select system</h1>
            </div>
            <Select
              value={selectedSystem}
              onValueChange={handleSystemChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[280px]">
                <SelectValue>
                  {isLoading
                    ? "Loading..."
                    : selectedSystem
                    ? systems.find((sys) => sys.system_id === selectedSystem)
                        ?.system_id
                    : "Select System"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {systems.length > 0 ? (
                  systems.map((system) => (
                    <SelectItem key={system.system_id} value={system.system_id}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {system.system_id} ({system.client})
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {system.type} - {system.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-systems" disabled>
                    {isLoading
                      ? "Loading systems..."
                      : error
                      ? "Failed to load systems"
                      : "No systems available"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          {/* <Button
            onClick={() => setActiveStep((prev) => prev + 1)}
            variant="default"
          >
            Next: Filters
          </Button> */}
        </div>
      </Card>

      {/* Main Content Grid - Updated Layout */}
      <div className="flex flex-col gap-8">
        {/* First Row - Monitoring Areas and KPI Groups */}
        <div className="grid grid-cols-2 gap-8">
          {/* Monitoring Areas Card */}
          <div>{renderMonitoringAreas()}</div>

          {/* KPI Groups Card */}
          <div>{renderKPIGroups()}</div>
        </div>

        {/* Second Row - Full Width KPIs Table */}
        <div className="w-full">{renderKPIs()}</div>
      </div>

      <KpiSettingsSheet
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        kpi={selectedKpiSettings}
      />

      {/* KPI Settings Sheet */}
      <KpiSettingsSheet
        open={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false);
          setSelectedKpiSettings(null);
        }}
        kpi={selectedKpiSettings}
      />
    </div>
  );
}

const KpiSettingsSheet = ({
  open,
  onClose,
  kpi,
}: {
  open: boolean;
  onClose: () => void;
  kpi: KPI | null;
}) => {
  // Add loading state
  const [isLoading, setIsLoading] = useState(false);

  const [configuration, setConfiguration] = useState({
    isActive: false,
    isDrilldown: false,

    frequency: {
      sap: "",
      sys: "",
    },
  });

  useEffect(() => {
    if (kpi) {
      setConfiguration({
        isActive: kpi.is_active || false,
        isDrilldown: Boolean(kpi.drilldown),

        frequency: {
          sap: kpi.sap_frequency || "",
          sys: kpi.sys_frequency || "",
        },
      });
    }
  }, [kpi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true); // Set loading state before API call

      // API call to save configuration
      const response = await fetch(`/api/kpi/${kpi?.kpi_name}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configuration),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      toast.success("KPI configuration updated successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to save KPI settings. Please try again.");
    } finally {
      setIsLoading(false); // Reset loading state after API call
    }
  };

  if (!kpi) return null;

  return (
    <>
      {/* Add backdrop */}
      {open && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
      )}

      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:w-[600px] overflow-y-auto border-l bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SheetHeader className="border-b pb-4">
            <SheetTitle className="text-2xl font-bold">KPI Settings</SheetTitle>
            <SheetDescription>
              Configure settings for{" "}
              <span className="font-medium">{kpi.kpi_name}</span>
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-6">
            {/* Basic Settings Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Settings</h3>
              <div className="grid gap-4 p-4 border rounded-lg bg-accent/5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive" className="font-medium">
                    Active Status
                  </Label>
                  <Switch
                    id="isActive"
                    checked={configuration.isActive}
                    onCheckedChange={(checked) =>
                      setConfiguration((prev) => ({
                        ...prev,
                        isActive: checked,
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="isDrilldown" className="font-medium">
                    Enable Drilldown
                  </Label>
                  <Switch
                    id="isDrilldown"
                    checked={configuration.isDrilldown}
                    onCheckedChange={(checked) =>
                      setConfiguration((prev) => ({
                        ...prev,
                        isDrilldown: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Thresholds Section */}

            {/* Frequency Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Frequency Settings</h3>
              <div className="grid gap-4 p-4 border rounded-lg bg-accent/5">
                <div className="grid gap-2">
                  <Label htmlFor="sapFrequency">SAP Frequency (seconds)</Label>
                  <Input
                    id="sapFrequency"
                    type="number"
                    value={configuration.frequency.sap}
                    onChange={(e) =>
                      setConfiguration((prev) => ({
                        ...prev,
                        frequency: { ...prev.frequency, sap: e.target.value },
                      }))
                    }
                    placeholder="Enter SAP frequency"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="systemFrequency">
                    System Frequency (seconds)
                  </Label>
                  <Input
                    id="systemFrequency"
                    type="number"
                    value={configuration.frequency.sys}
                    onChange={(e) =>
                      setConfiguration((prev) => ({
                        ...prev,
                        frequency: {
                          ...prev.frequency,
                          sys: e.target.value,
                        },
                      }))
                    }
                    placeholder="Enter system frequency"
                  />
                </div>
              </div>
            </div>

            {/* Notification Settings */}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⌛</span>
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
};
