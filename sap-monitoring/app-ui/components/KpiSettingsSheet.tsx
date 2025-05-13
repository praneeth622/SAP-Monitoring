import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import axios from "axios";
import { toast } from "sonner";

interface FilterOption {
  id: string;
  filterName: string;
  operator: "EQ" | "NE" | "CP";
  value: string;
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

export const KpiSettingsSheet = ({
  open,
  onClose,
  kpi,
  setOsKpis,
  setJobsKpis
}: {
  open: boolean;
  onClose: () => void;
  kpi: KPI | null;
  setOsKpis: React.Dispatch<React.SetStateAction<KPI[]>>;
  setJobsKpis: React.Dispatch<React.SetStateAction<KPI[]>>;
}) => {
  const [isLoading, setIsLoading] = useState(false);
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
      g2y: "",
      y2r: "",
    },
    criticality: "Low",
    alertWaitTime: "5",
    filters: [] as FilterOption[],
  });
  const [availableFilters, setAvailableFilters] = useState<string[]>([]);
  const [isLoadingFilterOptions, setIsLoadingFilterOptions] = useState(false);
  const [comparisonDirection, setComparisonDirection] = useState<"gt" | "lt">("gt");

  const kpiSheetFetchFilterValues = async (kpiName: string) => {
    try {
      setIsLoadingFilters(true);
      setFilterError(null);
      setIsLoadingFilterOptions(true);
      const response = await axios.get(`https://shwsckbvbt.a.pinggy.link/api/filter?kpiName=${kpiName}`);
      if (response.status === 200) {
        const filterNames = response.data.map((item: { filter_name: string }) => item.filter_name);
        setAvailableFilters(filterNames);
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
      setFilterError("Failed to load filter options");
      setAvailableFilters([]);
    } finally {
      setIsLoadingFilters(false);
      setIsLoadingFilterOptions(false);
    }
  };

  useEffect(() => {
    if (kpi) {
      setConfiguration({
        isActive: kpi.is_active || false,
        isDrilldown: kpi.drilldown === true,
        frequency: {
          sap: kpi.sap_frequency || "",
          sys: kpi.sys_frequency || "",
        },
        thresholds: {
          g2y: kpi.g2y?.toString() || "",
          y2r: kpi.y2r?.toString() || "",
        },
        criticality: kpi.criticality || "Low",
        alertWaitTime: "5",
        filters: [],
      });
      setComparisonDirection(kpi.direction === "lt" ? "lt" : "gt");
      if (kpi.filter === true) {
        kpiSheetFetchFilterValues(kpi.kpi_name);
      } else {
        setFilterValues([]);
      }
    }
  }, [kpi]);

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

  const handleFilterChange = (id: string, field: keyof FilterOption, value: string) => {
    setConfiguration((prev) => ({
      ...prev,
      filters: prev.filters.map((filter) => (filter.id === id ? { ...filter, [field]: value } : filter)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!validateThresholds()) {
        toast.error("Invalid thresholds", {
          description: comparisonDirection === "gt"
            ? `For \"greater than\" (>), Green to Yellow (${configuration.thresholds.g2y}) must be higher than Yellow to Red (${configuration.thresholds.y2r})`
            : `For \"less than\" (<), Green to Yellow (${configuration.thresholds.g2y}) must be lower than Yellow to Red (${configuration.thresholds.y2r})`,
        });
        return;
      }
      setIsLoading(true);
      const formattedFilters = configuration.filters.map((filter) => ({
        name: filter.filterName,
        operator: filter.operator,
        value: filter.value,
      }));
      const formData = new FormData();
      formData.append("kpiName", kpi?.kpi_name || "");
      formData.append("g2y", configuration.thresholds.g2y);
      formData.append("y2r", configuration.thresholds.y2r);
      formData.append("criticality", configuration.criticality);
      formData.append("alertWaitTime", configuration.alertWaitTime);
      formData.append("isActive", configuration.isActive.toString());
      formData.append("isDrilldown", configuration.isDrilldown.toString());
      formData.append("direction", comparisonDirection);
      formData.append("filters", JSON.stringify(formattedFilters));
      const response = await fetch(`https://shwsckbvbt.a.pinggy.link/api/kpi/${kpi?.kpi_name}/settings`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to save settings");
      if (kpi) {
        const updatedKpi = {
          ...kpi,
          g2y: configuration.thresholds.g2y ? parseFloat(configuration.thresholds.g2y) : null,
          y2r: configuration.thresholds.y2r ? parseFloat(configuration.thresholds.y2r) : null,
          criticality: configuration.criticality,
          is_active: configuration.isActive,
          drilldown: configuration.isDrilldown,
          direction: comparisonDirection,
        };
        if (updatedKpi.kpi_group.startsWith("OS")) {
          setOsKpis((prev: KPI[]) => prev.map((k: KPI) => k.kpi_name === updatedKpi.kpi_name ? updatedKpi : k));
        } else {
          setJobsKpis((prev: KPI[]) => prev.map((k: KPI) => k.kpi_name === updatedKpi.kpi_name ? updatedKpi : k));
        }
      }
      toast.success("Settings Updated", {
        description: "KPI configuration has been updated successfully",
      });
      onClose();
    } catch (error) {
      toast.error("Failed to save settings", {
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: string, subField?: string) => {
    const value = e.target.value;
    if (value && (!/^\d+$/.test(value) || Number.parseInt(value) < 0)) {
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

  const validateThresholds = () => {
    const g2y = Number.parseFloat(configuration.thresholds.g2y);
    const y2r = Number.parseFloat(configuration.thresholds.y2r);
    if (isNaN(g2y) || isNaN(y2r)) {
      return true;
    }
    if (comparisonDirection === "gt") {
      return g2y > y2r;
    } else {
      return g2y < y2r;
    }
  };

  if (!kpi) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="space-y-6 w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-2xl font-bold">Alert Config</SheetTitle>
          <SheetDescription>
            Configure settings for <span className="font-medium">{kpi.kpi_desc}</span>
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Threshold Settings</h3>
            <div className="grid gap-4 bg-accent/5">
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
                    onChange={(e) => handleNumberInputChange(e, "thresholds", "g2y")}
                    placeholder="Enter threshold"
                    className={`text-center ${!validateThresholds() && configuration.thresholds.g2y && configuration.thresholds.y2r ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
                <div className="col-span-1 flex justify-center items-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full h-8 w-8 p-0 flex items-center justify-center"
                    onClick={() => setComparisonDirection((prev) => (prev === "gt" ? "lt" : "gt"))}
                  >
                    {comparisonDirection === "gt" ? (
                      <p className="text-lg"> &gt; </p>
                    ) : (
                      <p className="text-lg"> &lt; </p>
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
                    onChange={(e) => handleNumberInputChange(e, "thresholds", "y2r")}
                    placeholder="Enter threshold"
                    className={`text-center ${!validateThresholds() && configuration.thresholds.g2y && configuration.thresholds.y2r ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                </div>
              </div>
              {!validateThresholds() && configuration.thresholds.g2y && configuration.thresholds.y2r && (
                <div className="text-red-500 text-sm px-2">
                  {comparisonDirection === "gt" ? (
                    <>
                      <span className="font-medium">Invalid thresholds:</span> When using <span> &gt; </span>, Green to
                      Yellow ({configuration.thresholds.g2y}) must be lower than Yellow to Red (
                      {configuration.thresholds.y2r})
                    </>
                  ) : (
                    <>
                      <span className="font-medium">Invalid thresholds:</span> When using <span> &lt; </span>, Green to Yellow
                      ({configuration.thresholds.g2y}) must be higher than Yellow to Red ({configuration.thresholds.y2r}
                      )
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Alert Wait Time (In Minutes)</h3>
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
                  <div className="text-center text-red-500 p-4">{filterError}</div>
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
                        <div key={filter.id} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-4">
                            <Select
                              value={filter.filterName}
                              onValueChange={(value) => handleFilterChange(filter.id, "filterName", value)}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select filter" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableFilters.map((filterName) => (
                                  <SelectItem key={filterName} value={filterName}>
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
                                handleFilterChange(filter.id, "operator", value as "EQ" | "NE" | "CP")
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
                              onChange={(e) => handleFilterChange(filter.id, "value", e.target.value)}
                              placeholder="Enter value"
                            />
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveFilter(filter.id)}>
                              ×
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
                      + Add Filter
                    </Button>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground p-4">No filter options available for this KPI</div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-4 border rounded-lg">
                Filtering is not available for this KPI
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
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