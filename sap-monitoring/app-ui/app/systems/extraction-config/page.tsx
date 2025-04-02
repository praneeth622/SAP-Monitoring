"use client";

import { useState, useEffect } from "react";
// Remove useToast import if it exists
import {
  ChevronDown,
  Settings,
  X,
  Plus,
  ArrowUpIcon,
  ArrowDownIcon,
} from "lucide-react";
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
  is_active: boolean;
  sap_frequency?: string;
  sys_frequency?: string;
}

interface FilterOption {
  id: string;
  filterName: string;
  operator: "EQ" | "NE" | "CP";
  value: string;
}

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

  // Add these state declarations at the top of your ConfigDashboard component
  const [isUpdating, setIsUpdating] = useState<string>("");

  // Add useEffect to initialize activeKpiGroups from API data
  useEffect(() => {
    const initialActiveGroups = new Set(
      [...osKpiGroup, ...jobsKpiGroup]
        .filter((group) => group.is_active)
        .map((group) => group.kpi_grp_name)
    );
    setActiveKpiGroups(initialActiveGroups);
  }, [osKpiGroup, jobsKpiGroup]); // Dependencies array

  // Fetch systems with auto-selection of single system
  useEffect(() => {
    const fetchSystems = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await axios.get(
          "https://shwsckbvbt.a.pinggy.link/api/sys"
        );

        // Store systems
        setSystems(response.data);

        // Auto-select the system if there's only one
        if (response.data && response.data.length === 1) {
          const singleSystem = response.data[0];
          setSelectedSystem(singleSystem.system_id);

          // Show a notification to inform the user
          toast.info("System auto-selected", {
            description: `${singleSystem.system_id} (${singleSystem.client}) was automatically selected as it's the only available system.`,
          });
        }
      } catch (error) {
        console.error("Error loading systems:", error);
        toast.error("Failed to load systems", {
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
        setError("Failed to load systems");
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
        const response = await fetch("https://shwsckbvbt.a.pinggy.link/api/ma");
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
        toast.error("Failed to load monitoring areas", {
          description:
            error instanceof Error ? error.message : "Please try again",
        });
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

        toast.info(`Monitoring Area Deactivated`, {
          description: `${areaName} monitoring area has been deactivated`,
        });
      } else {
        // Add area and fetch its KPI groups
        const response = await fetch(
          `https://shwsckbvbt.a.pinggy.link/api/kpigrp?mon_area=${areaName}`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch KPI groups for ${areaName}`);
        }

        const kpiGroupData = await response.json();
        setActiveAreas((prev) => new Set(prev).add(areaName));

        // Set KPI groups based on area
        if (areaName === "OS") {
          setOsKpiGroup(kpiGroupData);
          if (kpiGroupData.mon_area_name) {
          }
        } else if (areaName === "JOBS") {
          setJobsKpiGroup(kpiGroupData);
        }

        toast.success(`Monitoring Area Activated`, {
          description: `${areaName} monitoring area has been activated`,
        });
      }
    } catch (error) {
      console.error("Error toggling monitoring area:", error);
      toast.error(`Failed to toggle ${areaName}`, {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
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

  // Add the handleKpiStatusChange function
  const handleKpiStatusChange = async (kpi: KPI) => {
    try {
      setIsUpdating(kpi.kpi_name);

      const response = await fetch(
        `https://shwsckbvbt.a.pinggy.link/api/kpi/${kpi.kpi_name}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: !kpi.is_active,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update KPI status");
      }

      // Update local state based on monitoring area
      if (kpi.kpi_group.startsWith("OS")) {
        setOsKpis((prev) =>
          prev.map((item) =>
            item.kpi_name === kpi.kpi_name
              ? { ...item, is_active: !item.is_active }
              : item
          )
        );
      } else if (kpi.kpi_group.startsWith("JOBS")) {
        setJobsKpis((prev) =>
          prev.map((item) =>
            item.kpi_name === kpi.kpi_name
              ? { ...item, is_active: !item.is_active }
              : item
          )
        );
      }

      toast.success(`KPI Status Updated`, {
        description: `KPI ${kpi.kpi_name} has been ${
          !kpi.is_active ? "activated" : "deactivated"
        }`,
      });
    } catch (error) {
      console.error("Error updating KPI status:", error);
      toast.error(`Failed to update KPI ${kpi.kpi_name} status`, {
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsUpdating("");
    }
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
                  className="w-20 text-center"
                  disabled
                />
              </div>
              <div className="flex justify-center">
                <Input
                  type="nu"
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

  // Update the KPIs table render with proper alignment
  const renderKPIs = () => {
    const parentKpis = filteredKpis(
      [...osKpis, ...jobsKpis].filter((kpi) => kpi.parent === true)
    );
    const childKpis = [...osKpis, ...jobsKpis].filter((kpi) => !kpi.parent);
    const [showChildren, setShowChildren] = useState(false);

    return (
      <Card className="p-6">
        {/* Header with Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">KPIs Configuration</h2>
            <p className="text-sm text-muted-foreground">
              Manage and configure your key performance indicators
            </p>
          </div>
          <div className="w-[300px]">
            <Input
              placeholder="Search KPIs..."
              value={kpiSearchTerm}
              onChange={(e) => setKpiSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <Spinner className="h-6 w-6" />
          </div>
        ) : parentKpis.length > 0 ? (
          <div className={tableContainerStyles}>
            {/* Table Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="grid grid-cols-12 gap-4 py-3 px-4 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-4">KPI Name</div>
                {/* <div className="col-span-3">KPI Name</div> */}
                <div className="col-span-2">Area</div>
                <div className="col-span-4 text-center">Status</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="space-y-0">
              {parentKpis.map((kpi) => (
                <div key={kpi.kpi_name} className="group">
                  {/* Parent KPI Row */}
                  <div
                    className="grid grid-cols-12 gap-4 py-2 px-4 hover:bg-accent/5 rounded-lg cursor-pointer items-center"
                    // onClick={() => handleKpiExpand(kpi.kpi_name)}
                  >
                    {/* <div className="col-span-3 flex items-center gap-2"> */}
                    {/* <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          expandedKpis.has(kpi.kpi_name) ? "rotate-180" : ""
                        }`}
                      /> */}
                    {/* <span className="font-medium">{kpi.kpi_name}</span>
                    </div> */}
                    <div className="col-span-4 text-sm text-muted-foreground truncate">
                      {kpi.kpi_desc}
                    </div>
                    <div className="col-span-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-xs font-medium">
                        {kpi.kpi_group}
                      </span>
                    </div>
                    <div className="col-span-4 flex justify-center">
                      <Switch
                        checked={kpi.is_active}
                        onCheckedChange={() => handleKpiStatusChange(kpi)}
                        disabled={isUpdating === kpi.kpi_name}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleKpiSettings(kpi, e)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Child KPIs
                  {expandedKpis.has(kpi.kpi_name) && (
                    <div className="pl-6 space-y-1 ml-4 border-l border-accent">
                      {childKpis
                        .filter((child) => child.kpi_group === kpi.kpi_group)
                        .map((child) => (
                          <div
                            key={child.kpi_name}
                            className="grid grid-cols-12 gap-4 py-2 px-4 hover:bg-accent/5 rounded-lg items-center"
                          >
                            <div className="col-span-3 pl-6">
                              {child.kpi_name}
                            </div>
                            <div className="col-span-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-accent/50 text-xs font-medium">
                                Child
                              </span>
                            </div>
                            <div className="col-span-4 text-sm text-muted-foreground truncate">
                              {child.kpi_desc}
                            </div>
                            <div className="col-span-2 flex justify-center">
                              <Switch
                                checked={child.is_active}
                                onCheckedChange={() =>
                                  handleKpiStatusChange(child)
                                }
                                disabled={isUpdating === child.kpi_name}
                              />
                            </div>
                            <div className="col-span-1" />
                          </div>
                        ))}
                    </div>
                  )} */}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {kpiSearchTerm
              ? "No matching KPIs found"
              : "Select a KPI group to view KPIs"}
          </div>
        )}

        {/* Children Section */}
        {childKpis.length > 0 && (
          <div className="mt-6 border-t pt-4">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowChildren(!showChildren)}
            >
              <ChevronDown
                className={`h-4 w-4 mr-2 transition-transform ${
                  showChildren ? "rotate-180" : ""
                }`}
              />
              {showChildren ? "Hide" : "Show"} Child KPIs ({childKpis.length})
            </Button>

            {showChildren && (
              <div className="mt-4 space-y-1">
                {childKpis.map((kpi) => (
                  <div
                    key={kpi.kpi_name}
                    className="grid grid-cols-12 gap-4 py-3 px-4 hover:bg-accent/5 rounded-lg items-center"
                  >
                    <div className="col-span-6">{kpi.kpi_desc}</div>
                    <div className="col-span-6">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-xs font-medium">
                        {kpi.kpi_group}
                      </span>
                    </div>
                    {/* <div className="col-span-4 text-sm text-muted-foreground truncate">
                      {kpi.kpi_desc}
                    </div> */}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  // Move handleKpiGroupToggle inside the component
  const handleKpiGroupToggle = async (groupName: string, monArea: string) => {
    try {
      setIsLoading(true);
      const willBeActive = !activeKpiGroups.has(groupName);

      if (willBeActive) {
        // First update the UI state
        setActiveKpiGroups((prev) => new Set(prev).add(groupName));

        // Immediately fetch KPIs for this group
        const response = await fetch(
          `https://shwsckbvbt.a.pinggy.link/api/kpi?kpi_grp=${groupName}`
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Failed to fetch KPIs for ${groupName}. Server response: ${response.status} ${errorText}`
          );
        }

        const kpiData = await response.json();

        if (kpiData.length === 0) {
          toast.warning(`No KPIs found for ${groupName}`, {
            description: "The KPI group is active but contains no KPIs.",
          });
        }

        // Update KPIs state based on monitoring area
        if (monArea === "OS") {
          setOsKpis((prev) => [...prev, ...kpiData]);
          toast.success("OS KPIs loaded successfully", {
            description: `${kpiData.length} KPIs activated for ${groupName}`,
          });
        } else if (monArea === "JOBS") {
          setJobsKpis((prev) => [...prev, ...kpiData]);
          toast.success("Job KPIs loaded successfully", {
            description: `${kpiData.length} KPIs activated for ${groupName}`,
          });
        }
      } else {
        // Deactivate the KPI group
        setActiveKpiGroups((prev) => {
          const next = new Set(prev);
          next.delete(groupName);
          return next;
        });

        // Clear KPIs for this group
        if (monArea === "OS") {
          const removedCount = osKpis.filter(
            (kpi) => kpi.kpi_group === groupName
          ).length;
          setOsKpis((prev) =>
            prev.filter((kpi) => kpi.kpi_group !== groupName)
          );
          toast.info("OS KPIs removed", {
            description: `${removedCount} KPIs deactivated for ${groupName}`,
          });
        } else if (monArea === "JOBS") {
          const removedCount = jobsKpis.filter(
            (kpi) => kpi.kpi_group === groupName
          ).length;
          setJobsKpis((prev) =>
            prev.filter((kpi) => kpi.kpi_group !== groupName)
          );
          toast.info("Job KPIs removed", {
            description: `${removedCount} KPIs deactivated for ${groupName}`,
          });
        }
      }
    } catch (error) {
      console.error("Error toggling KPI group:", error);
      toast.error(`Failed to toggle KPI group ${groupName}`, {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again or contact support.",
      });

      // Roll back the UI state on error
      if (activeKpiGroups.has(groupName)) {
        // If we were trying to deactivate it, don't change the state
        // as the KPIs are still active on the server
      } else {
        // If we were trying to activate it but failed, remove it from active groups
        setActiveKpiGroups((prev) => {
          const next = new Set(prev);
          next.delete(groupName);
          return next;
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKpiSettings = (kpi: KPI, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding when clicking settings
    setSelectedKpiSettings(kpi);
    setIsSettingsOpen(true);
    toast.info("Opening KPI Settings", {
      description: `Configuring settings for ${kpi.kpi_name}`,
    });
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
  const [isLoading, setIsLoading] = useState(false);
  // Add state for filter values
  const [filterValues, setFilterValues] = useState<string[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);

  const [configuration, setConfiguration] = useState({
    isActive: false,
    isDrilldown: false,
    frequency: {
      sap: "",
      sys: "",
    },
    thresholds: {
      g2y: "", // Green to Yellow
      y2r: "", // Yellow to Red
    },
    criticality: "Low", // Default value
    alertWaitTime: "5", // Default wait time in minutes
    // Update filters to be an array of FilterOption objects
    filters: [] as FilterOption[],
  });

  const [availableFilters, setAvailableFilters] = useState<string[]>([]);
  const [isLoadingFilterOptions, setIsLoadingFilterOptions] = useState(false);

  const [comparisonDirection, setComparisonDirection] = useState<"gt" | "lt">(
    "gt"
  );

  // Fetch filter values when the KPI is set and has filter=true
  useEffect(() => {
    if (kpi) {
      setConfiguration({
        isActive: kpi.is_active || false,
        isDrilldown: Boolean(kpi.drilldown),
        frequency: {
          sap: kpi.sap_frequency || "",
          sys: kpi.sys_frequency || "",
        },
        thresholds: {
          g2y: kpi.g2y?.toString() || "",
          y2r: kpi.y2r?.toString() || "",
        },
        criticality: kpi.criticality || "Low",
        alertWaitTime: "5", // Default value if not provided by API
        filters: [], // Reset filters
      });

      // If KPI has filter=true, fetch the filter values
      if (kpi.filter === true) {
        fetchFilterValues(kpi.kpi_name);
      } else {
        // Reset filter values if KPI doesn't have filters
        setFilterValues([]);
      }
    }
  }, [kpi]);

  // Function to fetch filter values for a KPI
  const fetchFilterValues = async (kpiName: string) => {
    try {
      setIsLoadingFilters(true);
      setFilterError(null);
      setIsLoadingFilterOptions(true);

      // Fetch filter names for this KPI
      const response = await axios.get(
        `https://shwsckbvbt.a.pinggy.link/api/filter?kpiName=${kpiName}`
      );

      if (response.status === 200) {
        // Extract filter names from response
        const filterNames = response.data.map(
          (item: { filter_name: string }) => item.filter_name
        );
        setAvailableFilters(filterNames);

        // Initialize with one empty filter if there are available filters
        if (filterNames.length > 0 && configuration.filters.length === 0) {
          setConfiguration((prev) => ({
            ...prev,
            filters: [
              {
                id: `filter-${Date.now()}`,
                filterName: filterNames[0],
                operator: "EQ",
                value: "",
              },
            ],
          }));
        }
      } else {
        throw new Error("Failed to fetch filter options");
      }
    } catch (error) {
      console.error("Error fetching filter options:", error);
      setFilterError("Failed to load filter options");
      setAvailableFilters([]);
    } finally {
      setIsLoadingFilters(false);
      setIsLoadingFilterOptions(false);
    }
  };

  const handleAddFilter = () => {
    if (availableFilters.length === 0) return;

    setConfiguration((prev) => ({
      ...prev,
      filters: [
        ...prev.filters,
        {
          id: `filter-${Date.now()}`,
          filterName: availableFilters[0],
          operator: "EQ",
          value: "",
        },
      ],
    }));
  };

  const handleRemoveFilter = (id: string) => {
    setConfiguration((prev) => ({
      ...prev,
      filters: prev.filters.filter((filter) => filter.id !== id),
    }));
  };

  const handleFilterChange = (
    id: string,
    field: keyof FilterOption,
    value: string
  ) => {
    setConfiguration((prev) => ({
      ...prev,
      filters: prev.filters.map((filter) =>
        filter.id === id ? { ...filter, [field]: value } : filter
      ),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);

      // Format the filters for the API
      const formattedFilters = configuration.filters.map((filter) => ({
        name: filter.filterName,
        operator: filter.operator,
        value: filter.value,
      }));

      // API call to save configuration
      const response = await fetch(
        `https://shwsckbvbt.a.pinggy.link/api/kpi/${kpi?.kpi_name}/settings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...configuration,
            filters: formattedFilters,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to save settings");

      toast.success("Settings Updated", {
        description: "KPI configuration has been updated successfully",
      });
      onClose();
    } catch (error) {
      toast.error("Failed to save settings", {
        description:
          error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper for handling number input changes
  const handleNumberInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
    subField?: string
  ) => {
    const value = e.target.value;

    // Only allow positive numbers
    if (value && (!/^\d+$/.test(value) || parseInt(value) < 0)) {
      return;
    }

    if (subField) {
      setConfiguration((prev) => ({
        ...prev,
        [field]: {
          ...(prev[field as keyof typeof prev] as Record<string, any>),
          [subField]: value,
        },
      }));
    } else {
      setConfiguration((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  // Add these validation functions to KpiSettingsSheet component
  const validateThresholds = () => {
    const g2y = parseFloat(configuration.thresholds.g2y);
    const y2r = parseFloat(configuration.thresholds.y2r);

    if (isNaN(g2y) || isNaN(y2r)) {
      return true; // Skip validation if values are not numbers yet
    }

    if (comparisonDirection === "gt") {
      // For greater than (>), yellow threshold should be less than red threshold
      return g2y < y2r;
    } else {
      // For less than (<), yellow threshold should be greater than red threshold
      return g2y > y2r;
    }
  };

  if (!kpi) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="space-y-6 w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-2xl font-bold">Alert Config</SheetTitle>
          <SheetDescription>
            Configure settings for{" "}
            <span className="font-medium">{kpi.kpi_desc}</span>
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-6">
          {/* Section 1: Threshold Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Threshold Settings</h3>
            <div className="grid gap-4  bg-accent/5">
              <div className="grid grid-cols-5 gap-2 items-center">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="g2y" className="font-medium text-green-600">
                    Green to Yellow
                  </Label>
                  <Input
                    id="g2y"
                    type="text"
                    inputMode="numeric"
                    value={configuration.thresholds.g2y}
                    onChange={(e) =>
                      handleNumberInputChange(e, "thresholds", "g2y")
                    }
                    placeholder="Enter threshold"
                    className={`text-center ${
                      !validateThresholds() &&
                      configuration.thresholds.g2y &&
                      configuration.thresholds.y2r
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }`}
                  />
                </div>

                <div className="col-span-1 flex justify-center items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full h-8 w-8 p-0 flex items-center justify-center"
                    onClick={() =>
                      setComparisonDirection((prev) =>
                        prev === "gt" ? "lt" : "gt"
                      )
                    }
                  >
                    {comparisonDirection === "gt" ? (
                      <p className="text-lg"> &lt; </p>
                    ) : (
                      <p className="text-lg"> &gt; </p>
                    )}
                  </Button>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="y2r" className="font-medium text-red-600">
                    Yellow to Red
                  </Label>
                  <Input
                    id="y2r"
                    type="text"
                    inputMode="numeric"
                    value={configuration.thresholds.y2r}
                    onChange={(e) =>
                      handleNumberInputChange(e, "thresholds", "y2r")
                    }
                    placeholder="Enter threshold"
                    className={`text-center ${
                      !validateThresholds() &&
                      configuration.thresholds.g2y &&
                      configuration.thresholds.y2r
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }`}
                  />
                </div>
              </div>
              {/* Error message */}
              {!validateThresholds() &&
                configuration.thresholds.g2y &&
                configuration.thresholds.y2r && (
                  <div className="text-red-500 text-sm px-2">
                    {comparisonDirection === "gt" ? (
                      <>
                        <span className="font-medium">Invalid thresholds:</span>{" "}
                        When using <span> &gt; </span>, Green to Yellow (
                        {configuration.thresholds.g2y}) must be lower than
                        Yellow to Red ({configuration.thresholds.y2r})
                      </>
                    ) : (
                      <>
                        <span className="font-medium">Invalid thresholds:</span>{" "}
                        When using <p> &lt; </p>, Green to Yellow (
                        {configuration.thresholds.g2y}) must be higher than
                        Yellow to Red ({configuration.thresholds.y2r})
                      </>
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* Section 2: Alert Criticality */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Alert Criticality</h3>
            <div className="grid gap-4 ">
              <div className="grid gap-2">
                <Select
                  value={configuration.criticality}
                  onValueChange={(value) =>
                    setConfiguration((prev) => ({
                      ...prev,
                      criticality: value,
                    }))
                  }
                >
                  <SelectTrigger id="criticality">
                    <SelectValue placeholder="Select criticality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Very High">Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 3: Alert Wait Time */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Alert Wait Time (In Minutes)
            </h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Input
                  id="alertWaitTime"
                  type="text"
                  inputMode="numeric"
                  value={configuration.alertWaitTime}
                  onChange={(e) => handleNumberInputChange(e, "alertWaitTime")}
                  placeholder="Enter wait time"
                />
              </div>
            </div>
          </div>

          {/* Basic Settings Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Status Settings</h3>
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

          {/* Filter Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Filter Settings</h3>

            {kpi.filter === true ? (
              <div className="grid gap-4 ">
                {isLoadingFilters ? (
                  <div className="flex justify-center p-4">
                    <Spinner className="h-6 w-6" />
                    <span className="ml-2">Loading filters...</span>
                  </div>
                ) : filterError ? (
                  <div className="text-center text-red-500 p-4">
                    {filterError}
                  </div>
                ) : availableFilters.length > 0 ? (
                  <>
                    <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground">
                      <div className="col-span-4">Filter Name</div>
                      <div className="col-span-3">Options</div>
                      <div className="col-span-4">Value</div>
                      <div className="col-span-1"></div>
                    </div>

                    <div className="space-y-3">
                      {configuration.filters.map((filter) => (
                        <div
                          key={filter.id}
                          className="grid grid-cols-12 gap-2 items-center"
                        >
                          <div className="col-span-4">
                            <Select
                              value={filter.filterName}
                              onValueChange={(value) =>
                                handleFilterChange(
                                  filter.id,
                                  "filterName",
                                  value
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select filter" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFilters.map((filterName) => (
                                  <SelectItem
                                    key={filterName}
                                    value={filterName}
                                  >
                                    {filterName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="col-span-3">
                            <Select
                              value={filter.operator}
                              onValueChange={(value) =>
                                handleFilterChange(
                                  filter.id,
                                  "operator",
                                  value as "EQ" | "NE" | "CP"
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Op" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EQ">EQ</SelectItem>
                                <SelectItem value="NE">NE</SelectItem>
                                <SelectItem value="CP">CP</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="col-span-4">
                            <Input
                              value={filter.value}
                              required
                              onChange={(e) =>
                                handleFilterChange(
                                  filter.id,
                                  "value",
                                  e.target.value
                                )
                              }
                              placeholder="Enter value"
                            />
                          </div>

                          <div className="col-span-1 flex justify-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveFilter(filter.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddFilter}
                      className="mt-2"
                      disabled={isLoadingFilterOptions}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Filter
                    </Button>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground p-4">
                    No filter options available for this KPI
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-4 border rounded-lg">
                Filtering is not available for this KPI
              </div>
            )}
          </div>

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
            <Button type="submit" disabled={isLoading || !validateThresholds()}>
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
  );
};


