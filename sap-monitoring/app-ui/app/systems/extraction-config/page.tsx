"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Settings, X, Plus, ArrowRight, ArrowLeft, Check, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import axios from "axios"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
// Import the KpiSettingsSheet component
import { KpiSettingsSheet } from "@/components/KpiSettingsSheet"

// Table styles
const tableContainerStyles = "max-h-[60vh] overflow-y-auto"

// Initialize empty KPI  data arrays
const jobsKpiData: KPI[] = []
const osKpiData: KPI[] = []
const kpiData = [...jobsKpiData, ...osKpiData]

// Interfaces
interface SystemResponse {
  system_id: string
  instance: string
  client: string
  type: string
  polling: boolean
  connection: boolean
  description: string
}

interface MonitoringArea {
  mon_area_name: string
  mon_area_desc: string
  created_at: string
  created_by: string
  modified_at: string
  modified_by: string
}

interface KPIGroup {
  sapfrequency: string
  mon_area: string
  instance: boolean
  is_active: boolean
  sysfrequency: string
  modified_by: string
  created_at: string
  kpi_grp_desc: string
  modified_at: string
  created_by: string
  kpi_grp_name: string
}

interface KPI {
  kpi_name: string
  kpi_desc: string
  kpi_group: string
  parent: boolean | string
  unit: string
  drilldown: boolean | string
  filter: boolean | string
  g2y: number | null
  y2r: number | null
  direction: string
  criticality: string
  is_active: boolean
  sap_frequency?: string
  sys_frequency?: string
}

interface FilterOption {
  id: string
  filterName: string
  operator: "EQ" | "NE" | "CP"
  value: string
}

// Define steps for the wizard
interface Step {
  id: number
  name: string
  description: string
  completed: boolean
  current: boolean
}

export default function ConfigDashboard() {
  const [systems, setSystems] = useState<SystemResponse[]>([])
  const [selectedSystem, setSelectedSystem] = useState<string>("")
  const [monitoringAreas, setMonitoringAreas] = useState<MonitoringArea[]>([])
  const [kpiGroups, setKpiGroups] = useState<KPIGroup[]>([])

  // KPI Groups state - separate by monitoring area
  const [osKpiGroup, setOsKpiGroup] = useState<KPIGroup[]>([])
  const [jobsKpiGroup, setJobsKpiGroup] = useState<KPIGroup[]>([])

  // KPIs state - separate by monitoring area
  const [osKpis, setOsKpis] = useState<KPI[]>([])
  const [jobsKpis, setJobsKpis] = useState<KPI[]>([])

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [areaSearch, setAreaSearch] = useState("")
  const [kpiSearch, setKpiSearch] = useState("")
  const [activeAreas, setActiveAreas] = useState<Set<string>>(new Set())

  // Add this state for KPI expansion
  const [expandedKpis, setExpandedKpis] = useState<Set<string>>(new Set())

  // Add KPI search state and filter function
  const [kpiSearchTerm, setKpiSearchTerm] = useState("")

  // Add new state for KPI Groups
  const [activeKpiGroups, setActiveKpiGroups] = useState<Set<string>>(new Set())

  // Add these state declarations at the top of your component
  const [frequencies, setFrequencies] = useState<Record<string, { sap: string; sys: string }>>({})

  // Add these to your existing state declarations
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [selectedKpiSettings, setSelectedKpiSettings] = useState<KPI | null>(null)

  // Add these state declarations at the top of your ConfigDashboard component
  const [isUpdating, setIsUpdating] = useState<string>("")

  // Step wizard state
  const [currentStep, setCurrentStep] = useState(1)
  const [steps, setSteps] = useState<Step[]>([
    {
      id: 1,
      name: "KPI Configuration",
      description: "Configure KPI groups and monitoring areas",
      completed: false,
      current: true,
    },
    {
      id: 2,
      name: "Alert Configuration",
      description: "Set thresholds and alert settings",
      completed: false,
      current: false,
    },
    { id: 3, name: "Filter Settings", description: "Configure KPI filters", completed: false, current: false },
  ])

  // Selected KPI for detailed configuration in steps 2 and 3
  const [selectedKpi, setSelectedKpi] = useState<KPI | null>(null)

  // State for KPI children visibility
  const [showKpiChildren, setShowKpiChildren] = useState(false)

  // Alert configuration state
  const [alertConfig, setAlertConfig] = useState({
    thresholds: {
      g2y: "",
      y2r: "",
    },
    criticality: "Low",
    alertWaitTime: "5",
    isActive: false,
    isDrilldown: false,
    comparisonDirection: "gt" as "gt" | "lt",
  })

  // Filter configuration state
  const [filterConfig, setFilterConfig] = useState<FilterOption[]>([])
  const [availableFilters, setAvailableFilters] = useState<string[]>([])
  const [isLoadingFilters, setIsLoadingFilters] = useState(false)

  // Add these state variables for the filter sheet and KPI-specific filter data
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)
  const [selectedFilterKpi, setSelectedFilterKpi] = useState<KPI | null>(null)
  const [kpiFiltersMap, setKpiFiltersMap] = useState<Record<string, { 
    filterNames: string[], 
    filterConfig: FilterOption[]
  }>>({})

  // useRef to hold the activateKpiGroup function
  const activateKpiGroupRef = useRef<any>(null)

  // Function to fetch filter values for a KPI
  const fetchFilterValues = useCallback(async (kpiName: string) => {
    try {
      setIsLoadingFilters(true)
      setFilterConfig([])

      // Fetch filter names for this KPI
      const response = await axios.get(`https://shwsckbvbt.a.pinggy.link/api/filter?kpiName=${kpiName}`)

      if (response.status === 200) {
        // Extract filter names from response
        console.log("Filter names response:", response.data)
        const filterNames = response.data.map((item: { filter_name: string }) => item.filter_name)
        console.log("Filter names:", filterNames)
        setAvailableFilters(filterNames)

        // Initialize with one empty filter if there are available filters
        if (filterNames.length > 0) {
          setFilterConfig([
            {
              id: `filter-${Date.now()}`,
              filterName: filterNames[0],
              operator: "EQ",
              value: "",
            },
          ])
        }
      } else {
        throw new Error("Failed to fetch filter options")
      }
    } catch (error) {
      console.error("Error fetching filter options:", error)
      toast.error("Failed to load filter options", {
        description: error instanceof Error ? error.message : "Please try again",
      })
      setAvailableFilters([])
    } finally {
      setIsLoadingFilters(false)
    }
  }, [])

  // Update steps when current step changes
  useEffect(() => {
    setSteps((prevSteps) =>
      prevSteps.map((step) => ({
        ...step,
        current: step.id === currentStep,
        completed: step.id < currentStep,
      })),
    )
  }, [currentStep])

  const filteredKpis = (kpis: KPI[]) => {
    // First filter by active KPI groups
    const activeKpis = kpis.filter((kpi) => activeKpiGroups.has(kpi.kpi_group))

    // Then apply search filter if there's a search term
    if (!kpiSearchTerm) return activeKpis

    return activeKpis.filter(
      (kpi) =>
        kpi.kpi_name.toLowerCase().includes(kpiSearchTerm.toLowerCase()) ||
        kpi.kpi_desc.toLowerCase().includes(kpiSearchTerm.toLowerCase()) ||
        kpi.kpi_group.toLowerCase().includes(kpiSearchTerm.toLowerCase()),
    )
  }

  // Add this helper function for activating KPI groups
  // Make sure it's defined before any useEffect that calls it
  const activateKpiGroup = useCallback(
    async (groupName: string, monArea: string) => {
      try {
        console.log(`Auto-activating KPI group: ${groupName}`)

        // Add to active KPI groups
        setActiveKpiGroups((prev) => new Set(prev).add(groupName))

        // Fetch KPIs for this group
        const response = await fetch(`https://shwsckbvbt.a.pinggy.link/api/kpi?kpi_grp=${groupName}`)

        if (!response.ok) {
          throw new Error(`Failed to fetch KPIs for ${groupName}`)
        }

        const kpiData = await response.json()

        // Update KPIs state based on monitoring area
        if (monArea === "OS") {
          setOsKpis((prev) => [...prev, ...kpiData])
        } else if (monArea === "JOBS") {
          setJobsKpis((prev) => [...prev, ...kpiData])
        }

        return true
      } catch (error) {
        console.error(`Error activating KPI group ${groupName}:`, error)
        // Don't show error toast here to avoid multiple notifications
        return false
      }
    },
    [setOsKpis, setJobsKpis, setActiveKpiGroups],
  )

  // Make sure to handle the activateKpiGroupRef properly
  useEffect(() => {
    activateKpiGroupRef.current = activateKpiGroup;
  }, [activateKpiGroup])

  // Add useEffect to initialize activeKpiGroups from API data
  useEffect(() => {
    const initialActiveGroups = new Set(
      [...osKpiGroup, ...jobsKpiGroup].filter((group) => group.is_active).map((group) => group.kpi_grp_name),
    )
    setActiveKpiGroups(initialActiveGroups)
  }, [osKpiGroup, jobsKpiGroup, setActiveKpiGroups]) // Dependencies array

  // Fetch systems with auto-selection of single system
  useEffect(() => {
    const fetchSystems = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await axios.get("https://shwsckbvbt.a.pinggy.link/api/sys")

        // Store systems
        setSystems(response.data)

        // Auto-select the system if there's only one
        if (response.data && response.data.length === 1) {
          const singleSystem = response.data[0]
          setSelectedSystem(singleSystem.system_id)

          // Show a notification to inform the user
          toast.info("System auto-selected", {
            description: `${singleSystem.system_id} (${singleSystem.client}) was automatically selected as it's the only available system.`,
          })
        }
      } catch (error) {
        console.error("Error loading systems:", error)
        toast.error("Failed to load systems", {
          description: error instanceof Error ? error.message : "Unknown error occurred",
        })
        setError("Failed to load systems")
      } finally {
        setIsLoading(false)
      }
    }

    fetchSystems()
  }, []) // Empty dependency array - runs once

  // Fetch monitoring areas when system is selected
  useEffect(() => {
    const fetchMonitoringAreas = async () => {
      if (!selectedSystem) return

      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch("https://shwsckbvbt.a.pinggy.link/api/ma")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setMonitoringAreas(data)

        // Set all monitoring areas as active by default and fetch their KPI groups
        const activeAreasSet = new Set<string>(data.map((area: MonitoringArea) => area.mon_area_name))
        setActiveAreas(activeAreasSet)

        // Reset other states
        setKpiGroups([])
        setOsKpiGroup([])
        setJobsKpiGroup([])
        setOsKpis([])
        setJobsKpis([])

        // Fetch KPI groups for all active areas
        for (const area of data) {
          try {
            const groupResponse = await fetch(
              `https://shwsckbvbt.a.pinggy.link/api/kpigrp?mon_area=${area.mon_area_name}`,
            )
            if (!groupResponse.ok) continue

            const kpiGroupData = await groupResponse.json()

            // Set KPI groups based on area
            if (area.mon_area_name === "OS") {
              setOsKpiGroup(kpiGroupData)
            } else if (area.mon_area_name === "JOBS") {
              setJobsKpiGroup(kpiGroupData)
            }

            // Activate all KPI groups by default
            for (const group of kpiGroupData) {
              if (activateKpiGroupRef.current) {
                await activateKpiGroupRef.current(group.kpi_grp_name, area.mon_area_name)
              }
            }
          } catch (error) {
            console.error(`Error loading KPI groups for ${area.mon_area_name}:`, error)
          }
        }
      } catch (error) {
        console.error("Error loading monitoring areas:", error)
        toast.error("Failed to load monitoring areas", {
          description: error instanceof Error ? error.message : "Please try again",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchMonitoringAreas()
  }, [selectedSystem]) // Only runs when selectedSystem changes

  // Handle monitoring area toggle - optimized to prevent unnecessary API calls
  const handleMonitoringAreaToggle = async (areaName: string) => {
    try {
      setIsLoading(true)

      if (activeAreas.has(areaName)) {
        // Deactivate the monitoring area
        setActiveAreas((prev) => {
          const next = new Set(prev)
          next.delete(areaName)
          return next
        })

        // Clear KPIs for this area but keep KPI groups
        if (areaName === "OS") {
          setOsKpis([])
        } else if (areaName === "JOBS") {
          setJobsKpis([])
        }

        // Find all KPI groups for this area
        const groupsToDeactivate = [...osKpiGroup, ...jobsKpiGroup]
          .filter((group) => group.mon_area === areaName)
          .map((group) => group.kpi_grp_name)

        // Deactivate all KPI groups in this area
        for (const groupName of groupsToDeactivate) {
          if (activeKpiGroups.has(groupName)) {
            // Create FormData object
            const formData = new FormData()
            formData.append("kpi_grp", groupName)
            formData.append("is_active", "false")

            // Call API to deactivate the KPI group
            try {
              await fetch("https://shwsckbvbt.a.pinggy.link/api/kpigrp", {
                method: "POST",
                body: formData,
                redirect: "follow",
              })
            } catch (error) {
              console.error(`Error deactivating KPI group ${groupName}:`, error)
            }
          }
        }

        // Update active KPI groups state to remove all groups from this area
        setActiveKpiGroups((prev) => {
          const next = new Set(prev)
          groupsToDeactivate.forEach((name) => next.delete(name))
          return next
        })

        // Update the KPI groups state to reflect deactivation
        if (areaName === "OS") {
          setOsKpiGroup((prev) =>
            prev.map((g) => ({
              ...g,
              is_active: false
            }))
          )
        } else if (areaName === "JOBS") {
          setJobsKpiGroup((prev) =>
            prev.map((g) => ({
              ...g,
              is_active: false
            }))
          )
        }

        toast.info(`Monitoring Area Deactivated`, {
          description: `${areaName} monitoring area has been deactivated with all its KPI groups`,
        })
      } else {
        // Activate the monitoring area
        setActiveAreas((prev) => new Set(prev).add(areaName))

        // Fetch KPI groups for this area
        const response = await fetch(`https://shwsckbvbt.a.pinggy.link/api/kpigrp?mon_area=${areaName}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch KPI groups for ${areaName}`)
        }

        const kpiGroupData = await response.json()

        // Set KPI groups based on area
        if (areaName === "OS") {
          setOsKpiGroup(kpiGroupData)
        } else if (areaName === "JOBS") {
          setJobsKpiGroup(kpiGroupData)
        }

        // MODIFIED: Don't automatically activate KPI groups
        // Instead, leave all KPI groups inactive by default

        // Update the KPI groups state to initialize with all inactive
        if (areaName === "OS") {
          setOsKpiGroup((prev) =>
            prev.map((g) => ({
              ...g,
              is_active: false
            }))
          )
        } else if (areaName === "JOBS") {
          setJobsKpiGroup((prev) =>
            prev.map((g) => ({
              ...g,
              is_active: false
            }))
          )
        }

        toast.success(`Monitoring Area Activated`, {
          description: `${areaName} monitoring area has been activated. You can now enable specific KPI groups.`,
        })
      }
    } catch (error) {
      console.error("Error toggling monitoring area:", error)
      toast.error(`Failed to toggle ${areaName}`, {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Optimized system change handler
  const handleSystemChange = (value: string) => {
    if (value === selectedSystem) return // Prevent unnecessary updates
    setSelectedSystem(value)
    // Reset all dependent states
    setMonitoringAreas([])
    setKpiGroups([])
    setActiveAreas(new Set())
    setOsKpiGroup([])
    setJobsKpiGroup([])
    setOsKpis([])
    setJobsKpis([])
  }

  // Filter functions
  const filteredMonitoringAreas = monitoringAreas.filter(
    (area) =>
      area.mon_area_name.toLowerCase().includes(areaSearch.toLowerCase()) ||
      area.mon_area_desc.toLowerCase().includes(areaSearch.toLowerCase()),
  )

  // Add this function to handle KPI expansion
  const handleKpiExpand = (kpiName: string) => {
    setExpandedKpis((prev) => {
      const next = new Set(prev)
      if (next.has(kpiName)) {
        next.delete(kpiName)
      } else {
        next.add(kpiName)
      }
      return next
    })
  }

  const isValidFrequency = (sapFreq: number, sysFreq: number): boolean => {
    if (sysFreq <= 0 || sapFreq <= 0) return false
    return sysFreq % sapFreq === 0 // System frequency must be a multiple of SAP frequency
  }

  const incrementFrequency = (groupName: string, currentValue: string) => {
    const group = [...osKpiGroup, ...jobsKpiGroup].find((g) => g.kpi_grp_name === groupName)
    if (!group) return

    const sapFreq = Number.parseInt(group.sapfrequency)
    const currentSysFreq = Number.parseInt(currentValue) || sapFreq

    // Increase by SAP frequency to ensure it stays a multiple
    const newValue = (currentSysFreq + sapFreq).toString()

    handleFrequencyChange(groupName, "sys", newValue)
  }

  const decrementFrequency = (groupName: string, currentValue: string) => {
    const group = [...osKpiGroup, ...jobsKpiGroup].find((g) => g.kpi_grp_name === groupName)
    if (!group) return

    const sapFreq = Number.parseInt(group.sapfrequency)
    const currentSysFreq = Number.parseInt(currentValue) || sapFreq

    // Don't go below SAP frequency
    if (currentSysFreq <= sapFreq) {
      handleFrequencyChange(groupName, "sys", sapFreq.toString())
      return
    }

    // Decrease by SAP frequency to ensure it stays a multiple
    const newValue = (currentSysFreq - sapFreq).toString()

    handleFrequencyChange(groupName, "sys", newValue)
  }

  const handleFrequencyChange = (groupName: string, type: "sap" | "sys", value: string) => {
    // We're only modifying system frequency now
    if (type !== "sys") return

    // Ensure value is a positive number
    if (value && !/^\d+$/.test(value)) return

    const numValue = Number.parseInt(value) || 0
    const group = [...osKpiGroup, ...jobsKpiGroup].find((g) => g.kpi_grp_name === groupName)

    if (group) {
      const sapFreq = Number.parseInt(group.sapfrequency)

      // Only allow values that are multiples of SAP frequency
      if (numValue > 0 && numValue % sapFreq !== 0) {
        // Round to nearest multiple
        const multiplier = Math.round(numValue / sapFreq)
        const adjustedValue = (multiplier * sapFreq).toString()

        setFrequencies((prev) => ({
          ...prev,
          [groupName]: {
            ...prev[groupName],
            [type]: adjustedValue,
          },
        }))

        // Call API to update the system frequency
        updateKpiGroupFrequency(groupName, adjustedValue)
      } else {
        setFrequencies((prev) => ({
          ...prev,
          [groupName]: {
            ...prev[groupName],
            [type]: value,
          },
        }))

        // Call API to update the system frequency
        if (numValue > 0) {
          updateKpiGroupFrequency(groupName, value)
        }
      }
    }
  }

  // Update the updateKpiGroupFrequency function with the correct API endpoint and axios
  const updateKpiGroupFrequency = async (groupName: string, frequency: string) => {
    try {
      setIsUpdating(`frequency-${groupName}`)

      const group = [...osKpiGroup, ...jobsKpiGroup].find((g) => g.kpi_grp_name === groupName)

      if (!group) {
        throw new Error(`KPI group ${groupName} not found`)
      }

      // Create FormData for the request
      const formData = new FormData()
      formData.append("kpiGroupName", groupName)
      formData.append("sysFrequency", frequency)

      // Use axios with the correct API endpoint
      const response = await axios.post("https://shwsckbvbt.a.pinggy.link/api/kpigrp?updSysFrequency=X", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      if (response.status === 200) {
        toast.success("Frequency Updated", {
          description: `System frequency for ${groupName} has been updated to ${frequency}`,
        })

        // Update the local state to reflect the change
        if (group.mon_area === "OS") {
          setOsKpiGroup((prev) =>
            prev.map((g) => (g.kpi_grp_name === groupName ? { ...g, sysfrequency: frequency } : g)),
          )
        } else if (group.mon_area === "JOBS") {
          setJobsKpiGroup((prev) =>
            prev.map((g) => (g.kpi_grp_name === groupName ? { ...g, sysfrequency: frequency } : g)),
          )
        }
      } else {
        throw new Error("Failed to update frequency")
      }
    } catch (error) {
      console.error(`Error updating frequency for ${groupName}:`, error)
      toast.error("Update Failed", {
        description: "Failed to update system frequency. Please try again.",
      })
    } finally {
      setIsUpdating("")
    }
  }

  // Update the handleKpiGroupToggle function to use FormData
  const handleKpiGroupToggle = async (groupName: string, monArea: string) => {
    try {
      setIsUpdating(`toggle-${groupName}`)
      const willBeActive = !activeKpiGroups.has(groupName)

      // Get the current group data
      const group = [...osKpiGroup, ...jobsKpiGroup].find((g) => g.kpi_grp_name === groupName)

      if (!group) {
        throw new Error(`KPI group ${groupName} not found`)
      }

      // Create FormData object
      const formData = new FormData()
      formData.append("kpi_grp", groupName)
      formData.append("is_active", willBeActive.toString())

      const response = await fetch("https://shwsckbvbt.a.pinggy.link/api/kpigrp", {
        method: "POST",
        body: formData,
        redirect: "follow",
      })

      if (response.ok) {
        // Update local state
        if (willBeActive) {
          setActiveKpiGroups((prev) => new Set(prev).add(groupName))

          // Fetch KPIs for this group if activated
          const kpiResponse = await fetch(`https://shwsckbvbt.a.pinggy.link/api/kpi?kpi_grp=${groupName}`)

          if (kpiResponse.ok) {
            const kpiData = await kpiResponse.json()

            // Update appropriate KPI state based on monitoring area
            if (monArea === "OS") {
              setOsKpis((prev) => [...prev, ...kpiData])
            } else if (monArea === "JOBS") {
              setJobsKpis((prev) => [...prev, ...kpiData])
            }
          }

          toast.success("KPI Group Activated", {
            description: `${groupName} has been activated with its KPIs`,
          })
        } else {
          setActiveKpiGroups((prev) => {
            const next = new Set(prev)
            next.delete(groupName)
            return next
          })

          // Remove KPIs for this group if deactivated
          if (monArea === "OS") {
            const removedCount = osKpis.filter((kpi) => kpi.kpi_group === groupName).length
            setOsKpis((prev) => prev.filter((kpi) => kpi.kpi_group !== groupName))
            toast.info("OS KPIs removed", {
              description: `${removedCount} KPIs deactivated for ${groupName}`,
            })
          } else if (monArea === "JOBS") {
            const removedCount = jobsKpis.filter((kpi) => kpi.kpi_group === groupName).length
            setJobsKpis((prev) => prev.filter((kpi) => kpi.kpi_group !== groupName))
            toast.info("Job KPIs removed", {
              description: `${removedCount} KPIs deactivated for ${groupName}`,
            })
          }
        }

        // Update the local KPI group state to reflect the change
        if (monArea === "OS") {
          setOsKpiGroup((prev) =>
            prev.map((g) => (g.kpi_grp_name === groupName ? { ...g, is_active: willBeActive } : g)),
          )
        } else if (monArea === "JOBS") {
          setJobsKpiGroup((prev) =>
            prev.map((g) => (g.kpi_grp_name === groupName ? { ...g, is_active: willBeActive } : g)),
          )
        }
      } else {
        throw new Error(`Failed to ${willBeActive ? "activate" : "deactivate"} group`)
      }
    } catch (error) {
      console.error("Error toggling KPI group:", error)
      toast.error("Update Failed", {
        description: "Failed to update KPI group status. Please try again.",
      })
    } finally {
      setIsUpdating("")
    }
  }

  const handleKpiStatusChange = async (kpi: KPI) => {
    try {
      // Set the updating state to show loading indication on this specific KPI
      setIsUpdating(kpi.kpi_name)

      // Toggle the KPI's active status
      const newStatus = !kpi.is_active

      // Make API request to update the KPI status
      const response = await axios.put(`https://shwsckbvbt.a.pinggy.link/api/kpi/${kpi.kpi_name}/status`, {
        is_active: newStatus,
      })

      if (response.status !== 200) {
        throw new Error(`Failed to update status for ${kpi.kpi_desc}`)
      }

      // Update the local state based on which monitoring area the KPI belongs to
      if (kpi.kpi_group.startsWith("OS") || osKpis.some((k) => k.kpi_name === kpi.kpi_name)) {
        setOsKpis((prev) => prev.map((k) => (k.kpi_name === kpi.kpi_name ? { ...k, is_active: newStatus } : k)))
      } else {
        setJobsKpis((prev) => prev.map((k) => (k.kpi_name === kpi.kpi_name ? { ...k, is_active: newStatus } : k)))
      }

      // Show success notification
      toast.success(newStatus ? "KPI Activated" : "KPI Deactivated", {
        description: `${kpi.kpi_desc} has been ${newStatus ? "activated" : "deactivated"}`,
      })
    } catch (error) {
      console.error("Error updating KPI status:", error)
      toast.error("Failed to update KPI status", {
        description: error instanceof Error ? error.message : "Please try again",
      })

      // Revert UI changes in case of error - optional
    } finally {
      setIsUpdating("") // Clear the updating state
    }
  }

  const handleKpiSettings = (kpi: KPI, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent expanding when clicking settings
    setSelectedKpiSettings(kpi)
    setIsSettingsOpen(true)
  }

  // Function to select a KPI for detailed configuration
  const handleSelectKpi = (kpi: KPI) => {
    // Store the selected KPI
    setSelectedKpi(kpi)

    // Initialize alert configuration based on KPI data
    setAlertConfig({
      thresholds: {
        g2y: kpi.g2y?.toString() || "",
        y2r: kpi.y2r?.toString() || "",
      },
      criticality: kpi.criticality || "Low",
      alertWaitTime: "5", // Default value if not provided
      isActive: kpi.is_active || false,
      isDrilldown: kpi.drilldown === true, // Ensure proper boolean conversion
      comparisonDirection: kpi.direction === "lt" ? "lt" : "gt", // Default to "gt" if not specified
    })

    // Fetch filter values if the KPI has filters
    if (kpi.filter === true) {
      fetchFilterValues(kpi.kpi_name)
    }

    // Move to step 2
    setCurrentStep(2)
  }

  // Function to add a new filter
  const handleAddFilter = () => {
    if (availableFilters.length === 0) return

    setFilterConfig((prev) => [
      ...prev,
      {
        id: `filter-${Date.now()}`,
        filterName: availableFilters[0],
        operator: "EQ",
        value: "",
      },
    ])
  }

  // Function to remove a filter
  const handleRemoveFilter = (id: string) => {
    setFilterConfig((prev) => prev.filter((filter) => filter.id !== id))
  }

  // Function to update a filter
  const handleFilterChange = (id: string, field: keyof FilterOption, value: string) => {
    setFilterConfig((prev) => prev.map((filter) => (filter.id === id ? { ...filter, [field]: value } : filter)))
  }

  // Function to validate thresholds
  const validateThresholds = () => {
    const g2y = Number.parseFloat(alertConfig.thresholds.g2y)
    const y2r = Number.parseFloat(alertConfig.thresholds.y2r)

    if (isNaN(g2y) || isNaN(y2r)) {
      return true // Skip validation if values are not numbers yet
    }

    if (alertConfig.comparisonDirection === "gt") {
      // For greater than (>), yellow threshold should be less than red threshold
      return g2y < y2r
    } else {
      // For less than (<), yellow threshold should be greater than red threshold
      return g2y > y2r
    }
  }

  // Function to handle number input changes
  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: string, subField?: string) => {
    const value = e.target.value

    // Only allow positive numbers
    if (value && (!/^\d+$/.test(value) || Number.parseInt(value) < 0)) {
      return
    }

    if (subField) {
      setAlertConfig((prev) => ({
        ...prev,
        [field]: {
          ...(prev[field as keyof typeof prev] as Record<string, any>),
          [subField]: value,
        },
      }))
    } else {
      setAlertConfig((prev) => ({
        ...prev,
        [field]: value,
      }))
    }
  }

  // Function to save alert configuration
  const handleSaveAlertConfig = async () => {
    if (!selectedKpi) return

    try {
      setIsLoading(true)

      // API call to save alert configuration
      const formData = new FormData()
      formData.append("kpiName", selectedKpi.kpi_name)
      formData.append("g2y", alertConfig.thresholds.g2y)
      formData.append("y2r", alertConfig.thresholds.y2r)
      formData.append("criticality", alertConfig.criticality)
      formData.append("alertWaitTime", alertConfig.alertWaitTime)
      formData.append("isActive", alertConfig.isActive.toString())
      formData.append("isDrilldown", alertConfig.isDrilldown.toString())
      formData.append("direction", alertConfig.comparisonDirection)

      // Log the data being sent to API for debugging
      console.log("Saving alert configuration:", {
        kpiName: selectedKpi.kpi_name,
        g2y: alertConfig.thresholds.g2y,
        y2r: alertConfig.thresholds.y2r,
        criticality: alertConfig.criticality,
        alertWaitTime: alertConfig.alertWaitTime,
        isActive: alertConfig.isActive,
        isDrilldown: alertConfig.isDrilldown,
        direction: alertConfig.comparisonDirection
      })

      const response = await axios.post(`https://shwsckbvbt.a.pinggy.link/api/kpi/${selectedKpi.kpi_name}/settings`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })

      if (response.status === 200) {
        // Update the local KPI data with the new settings
        const updatedKpi = {
          ...selectedKpi,
          g2y: alertConfig.thresholds.g2y ? parseFloat(alertConfig.thresholds.g2y) : null,
          y2r: alertConfig.thresholds.y2r ? parseFloat(alertConfig.thresholds.y2r) : null,
          criticality: alertConfig.criticality,
          is_active: alertConfig.isActive,
          drilldown: alertConfig.isDrilldown,
          direction: alertConfig.comparisonDirection,
        }

        // Update the KPI in the appropriate array
        if (updatedKpi.kpi_group.startsWith("OS") || osKpis.some(k => k.kpi_name === updatedKpi.kpi_name)) {
          setOsKpis(prev => prev.map(k => k.kpi_name === updatedKpi.kpi_name ? updatedKpi : k))
        } else {
          setJobsKpis(prev => prev.map(k => k.kpi_name === updatedKpi.kpi_name ? updatedKpi : k))
        }

        toast.success("Alert Configuration Saved", {
          description: "Alert settings have been updated successfully",
        })

        // Move to step 3
        setCurrentStep(3)
      } else {
        throw new Error("Failed to save alert configuration")
      }
    } catch (error) {
      console.error("Error saving alert configuration:", error)
      toast.error("Failed to save alert configuration", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Function to fetch filter data for a specific KPI
  const fetchKpiFilterData = useCallback(async (kpiName: string) => {
    try {
      // Fetch filter names for this KPI
      const response = await axios.get(`https://shwsckbvbt.a.pinggy.link/api/filter?kpiName=${kpiName}`)

      if (response.status === 200) {
        // Extract filter names from response
        const filterNames = response.data.map((item: { filter_name: string }) => item.filter_name)
        
        // Fetch existing filter configurations if any
        try {
          const configResponse = await axios.get(`https://shwsckbvbt.a.pinggy.link/api/kpi/${kpiName}/filters`)
          
          if (configResponse.status === 200 && configResponse.data && Array.isArray(configResponse.data)) {
            // Convert API response to FilterOption format with proper typing for operator
            const configs: FilterOption[] = configResponse.data.map((filter: any) => ({
              id: `filter-${Date.now()}-${Math.random()}`,
              filterName: filter.name || (filterNames.length > 0 ? filterNames[0] : ""),
              operator: (filter.operator === "EQ" || filter.operator === "NE" || filter.operator === "CP") 
                ? (filter.operator as "EQ" | "NE" | "CP") 
                : "EQ",
              value: filter.value || ""
            }))

            // Store the filter data for this KPI
            setKpiFiltersMap(prev => ({
              ...prev,
              [kpiName]: {
                filterNames,
                filterConfig: configs
              }
            }))
          } else {
            // If no configurations exist yet, create default config with first filter name if available
            const defaultConfig: FilterOption[] = filterNames.length > 0 ? [
              {
                id: `filter-${Date.now()}`,
                filterName: filterNames[0],
                operator: "EQ",
                value: ""
              }
            ] : [];
            
            // Store the filter data for this KPI
            setKpiFiltersMap(prev => ({
              ...prev,
              [kpiName]: {
                filterNames,
                filterConfig: defaultConfig
              }
            }))
          }
        } catch (error) {
          console.error(`Error fetching filter configurations for ${kpiName}:`, error)
          
          // On error, still create a default config
          const defaultConfig: FilterOption[] = filterNames.length > 0 ? [
            {
              id: `filter-${Date.now()}`,
              filterName: filterNames[0],
              operator: "EQ",
              value: ""
            }
          ] : [];
          
          setKpiFiltersMap(prev => ({
            ...prev,
            [kpiName]: {
              filterNames,
              filterConfig: defaultConfig
            }
          }))
        }
      }
    } catch (error) {
      console.error(`Error fetching filter names for ${kpiName}:`, error)
    }
  }, [])

  // Update openFilterConfigSheet to use the stored filter data
  const openFilterConfigSheet = (kpi: KPI) => {
    setSelectedFilterKpi(kpi)
    if (kpi.filter === true) {
      // If we already have filter data for this KPI, use it
      if (kpiFiltersMap[kpi.kpi_name]) {
        // Set the available filters and filter config from our stored data
        setAvailableFilters(kpiFiltersMap[kpi.kpi_name].filterNames)
        
        // If there are existing filter configurations, use them
        if (kpiFiltersMap[kpi.kpi_name].filterConfig.length > 0) {
          setFilterConfig(kpiFiltersMap[kpi.kpi_name].filterConfig)
        }
        // Otherwise create a default one if we have filter names
        else if (kpiFiltersMap[kpi.kpi_name].filterNames.length > 0) {
          setFilterConfig([{
            id: `filter-${Date.now()}`,
            filterName: kpiFiltersMap[kpi.kpi_name].filterNames[0],
            operator: "EQ",
            value: ""
          }])
        }
        // Fallback to empty array if no filter names available
        else {
          setFilterConfig([])
        }
      } else {
        // If no data for this KPI yet, fetch it
        fetchFilterValues(kpi.kpi_name)
      }
    }
    setIsFilterSheetOpen(true)
  }

  // Load filter data for all KPIs with filters when the component mounts
  useEffect(() => {
    const loadAllKpiFilters = async () => {
      const allKpis = [...osKpis, ...jobsKpis].filter(kpi => kpi.filter === true)
      
      for (const kpi of allKpis) {
        await fetchKpiFilterData(kpi.kpi_name)
      }
    }
    
    if (osKpis.length > 0 || jobsKpis.length > 0) {
      loadAllKpiFilters()
    }
  }, [osKpis, jobsKpis, fetchKpiFilterData])

  // Update the handleSaveFilterConfig function to update our kpiFiltersMap
  const handleSaveFilterConfig = async () => {
    if (!selectedFilterKpi) return

    try {
      setIsLoading(true)

      // Format the filters for the API
      const formattedFilters = filterConfig.map((filter) => ({
        name: filter.filterName,
        operator: filter.operator,
        value: filter.value,
      }))

      // Create FormData for more reliable submission
      const formData = new FormData()
      formData.append("kpiName", selectedFilterKpi.kpi_name)
      formData.append("filters", JSON.stringify(formattedFilters))

      // Log the data being sent to API for debugging
      console.log("Saving filter configuration:", {
        kpiName: selectedFilterKpi.kpi_name,
        filters: formattedFilters
      })

      // API call to save filter configuration
      const response = await axios.post(`https://shwsckbvbt.a.pinggy.link/api/kpi/${selectedFilterKpi.kpi_name}/filters`, 
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      )

      if (response.status === 200) {
        // Update our local map of KPI filters
        setKpiFiltersMap(prev => ({
          ...prev,
          [selectedFilterKpi.kpi_name]: {
            filterNames: kpiFiltersMap[selectedFilterKpi.kpi_name]?.filterNames || availableFilters,
            filterConfig: filterConfig
          }
        }))
        
        // Update the local KPI data to reflect the changes
        const updatedKpi = { ...selectedFilterKpi };
        
        // Update in the appropriate KPI array
        if (updatedKpi.kpi_group.startsWith("OS")) {
          setOsKpis((prev: KPI[]) => prev.map((k: KPI) => k.kpi_name === updatedKpi.kpi_name ? updatedKpi : k))
        } else {
          setJobsKpis((prev: KPI[]) => prev.map((k: KPI) => k.kpi_name === updatedKpi.kpi_name ? updatedKpi : k))
        }
        
        toast.success("Filter Configuration Saved", {
          description: "Filter settings have been updated successfully",
        })

        // Close the filter sheet
        setIsFilterSheetOpen(false)
        setSelectedFilterKpi(null)
      } else {
        throw new Error("Failed to save filter configuration")
      }
    } catch (error) {
      console.error("Error saving filter configuration:", error)
      toast.error("Failed to save filter configuration", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Render the progress steps
  const renderProgressSteps = () => (
    <div className="flex mb-8 w-full">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`flex-1 relative ${index > 0 ? "-ml-4" : ""}`}
          onClick={() => {
            // Make all steps clickable to allow direct navigation
            setCurrentStep(step.id)
          }}
        >
          <div
            className={`
              h-12 flex items-center justify-center px-4
              ${step.current ? "bg-blue-500 text-white" : 
                step.completed ? "bg-gray-200 text-gray-700" : "bg-muted/30 text-muted-foreground"}
              ${index === 0 ? "rounded-l-md" : ""}
              ${index === steps.length - 1 ? "rounded-r-md" : ""}
              cursor-pointer hover:brightness-95
              transition-all duration-200
            `}
            style={{
              clipPath:
                index < steps.length - 1
                  ? "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)"
                  : undefined,
            }}
          >
            <div className="flex items-center">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white text-primary font-bold mr-2">
                {step.completed ? <Check className="h-3 w-3" /> : step.id}
              </div>
              <span className="font-medium">
            {step.name}
              </span>
          </div>
          </div>
        </div>
      ))}
    </div>
  )

  // Render the monitoring areas section
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

      <div className="sticky top-0 z-10 bg-background grid grid-cols-3 gap-4 mb-2 px-2 font-medium text-sm text-gray-500">
        <div>Area</div>
        <div>Description</div>
        <div className="text-center">Active</div>
      </div>

      <div className={tableContainerStyles}>
        {filteredMonitoringAreas.map((area) => (
          <div
            key={area.mon_area_name}
            className="grid grid-cols-3 gap-4 items-center p-2 hover:bg-accent/5 rounded-lg"
          >
            <div>{area.mon_area_name}</div>
            <div className="text-sm text-gray-600">{area.mon_area_desc}</div>
            <div className="flex justify-center">
              <Switch
                checked={activeAreas.has(area.mon_area_name)}
                onCheckedChange={() => handleMonitoringAreaToggle(area.mon_area_name)}
                disabled={isLoading}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )

  // Render the KPI groups section
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
        {[...osKpiGroup, ...jobsKpiGroup]
          .filter((group) => {
            // Only show groups for active monitoring areas
            const isActiveArea = activeAreas.has(group.mon_area)

            // Apply search filter if there is a search term
            const matchesSearch =
              kpiSearch.trim() === "" ||
              group.kpi_grp_name.toLowerCase().includes(kpiSearch.toLowerCase()) ||
              group.kpi_grp_desc.toLowerCase().includes(kpiSearch.toLowerCase())

            return isActiveArea && matchesSearch
          })
          .map((group) => {
            // Initialize frequencies if not already set
            if (!frequencies[group.kpi_grp_name]) {
              const sapFreq = group.sapfrequency || "60"
              frequencies[group.kpi_grp_name] = {
                sap: sapFreq,
                sys: group.sysfrequency || sapFreq, // Use the actual system frequency from API
              }
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
                    type="number"
                    value={frequencies[group.kpi_grp_name]?.sys || ""}
                    onChange={(e) => handleFrequencyChange(group.kpi_grp_name, "sys", e.target.value)}
                    className="w-20 text-center"
                    min={Number.parseInt(group.sapfrequency)} // Minimum value is SAP frequency
                    step={Number.parseInt(group.sapfrequency)} // Step value is SAP frequency
                    disabled={isUpdating === `frequency-${group.kpi_grp_name}`}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={activeKpiGroups.has(group.kpi_grp_name)}
                    onCheckedChange={() => handleKpiGroupToggle(group.kpi_grp_name, group.mon_area)}
                    disabled={isUpdating === `toggle-${group.kpi_grp_name}`}
                  />
                  {isUpdating === `toggle-${group.kpi_grp_name}` && <span className="animate-spin ml-2">⌛</span>}
                </div>
              </div>
            )
          })}
      </div>
    </Card>
  )

  // Render the KPIs section
  const renderKPIs = () => {
    // Combine parent and child KPIs, but only from active groups
    const allKpis = filteredKpis([...osKpis, ...jobsKpis].filter((kpi) => activeKpiGroups.has(kpi.kpi_group)));

    return (
      <Card className="p-6">
        {/* Header with Search */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">KPIs Configuration</h2>
            <p className="text-sm text-muted-foreground">Manage and configure your key performance indicators</p>
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
        ) : allKpis.length > 0 ? (
          <div className={tableContainerStyles}>
            {/* Table Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="grid grid-cols-11 gap-4 py-3 px-4 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-4">KPI Name</div>
                <div className="col-span-2">Group</div>
                <div className="col-span-2">Monitoring Area</div>
                <div className="col-span-3 text-center">Status</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="space-y-0">
              {allKpis.map((kpi) => (
                <div key={kpi.kpi_name} className="group">
                  <div
                    className="grid grid-cols-11 gap-4 py-2 px-4 hover:bg-accent/5 rounded-lg items-center"
                  >
                    <div className="col-span-4 text-sm text-muted-foreground truncate">{kpi.kpi_desc}</div>
                    <div className="col-span-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-xs font-medium">
                        {kpi.kpi_group}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-accent/50 text-xs font-medium">
                        {kpi.kpi_group.startsWith("OS") ? "OS" : "JOBS"}
                      </span>
                    </div>
                    <div className="col-span-3 flex justify-center">
                      <Switch
                        checked={kpi.is_active}
                        onCheckedChange={() => handleKpiStatusChange(kpi)}
                        disabled={isUpdating === kpi.kpi_name}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {kpiSearchTerm ? "No matching KPIs found" : "Select a KPI group to view KPIs"}
          </div>
        )}
      </Card>
    );
  }

  // Add these states for Alert Configuration similar to Filter Settings
  const [isEditingAlert, setIsEditingAlert] = useState(false)
  const [savedAlerts, setSavedAlerts] = useState<Array<{
    kpiName: string,
    kpiDesc: string,
    kpiGroup: string,
    g2y: string,
    y2r: string,
    criticality: string,
    waitTime: string,
    direction: "gt" | "lt",
    isActive: boolean
  }>>([])
  const [newAlert, setNewAlert] = useState({
    kpiName: "",
    kpiDesc: "",
    kpiGroup: "",
    g2y: "",
    y2r: "",
    criticality: "Low",
    waitTime: "5",
    direction: "gt" as "gt" | "lt",
    isActive: false
  })
  
  // Add state for KPI dropdown search in Alert Config
  const [kpiAlertSearchTerm, setKpiAlertSearchTerm] = useState("")

  // Handle KPI selection for Alert
  const handleAlertKpiSelection = (kpiName: string) => {
    const selectedKpi = [...osKpis, ...jobsKpis].find(kpi => kpi.kpi_name === kpiName)
    if (selectedKpi) {
      setNewAlert(prev => ({
                        ...prev,
        kpiName: selectedKpi.kpi_name,
        kpiDesc: selectedKpi.kpi_desc,
        kpiGroup: selectedKpi.kpi_group,
        g2y: selectedKpi.g2y?.toString() || "",
        y2r: selectedKpi.y2r?.toString() || ""
                      }))
                    }
  }

  // Cancel editing alert
  const handleCancelEditingAlert = () => {
    setIsEditingAlert(false)
    setNewAlert({
      kpiName: "",
      kpiDesc: "",
      kpiGroup: "",
      g2y: "",
      y2r: "",
      criticality: "Low",
      waitTime: "5",
      direction: "gt",
      isActive: false
    })
  }

  // Handle editing an existing alert
  const handleEditAlert = (alert: typeof savedAlerts[0], index: number) => {
    // Set the alert to be edited in the newAlert state
    setNewAlert({...alert})
    
    // Enable editing mode
    setIsEditingAlert(true)
    
    // Remove the alert from the savedAlerts array while editing
    setSavedAlerts(prev => prev.filter((_, i) => i !== index))
  }

  // Validate alert thresholds
  const validateAlertThresholds = () => {
    const g2y = Number.parseFloat(newAlert.g2y)
    const y2r = Number.parseFloat(newAlert.y2r)

    if (isNaN(g2y) || isNaN(y2r)) {
      return true // Skip validation if values are not numbers yet
    }

    if (newAlert.direction === "gt") {
      // For greater than (>), yellow threshold should be greater than red threshold
      return g2y > y2r
    } else {
      // For less than (<), yellow threshold should be less than red threshold
      return g2y < y2r
    }
  }

  // Update the handleThresholdChange function to validate immediately
  const handleThresholdChange = (field: 'g2y' | 'y2r', value: string) => {
    // Update the alert state
    setNewAlert(prev => {
      const updatedAlert = {...prev, [field]: value}
      
      // Validate immediately if we have both values
      const g2y = field === 'g2y' ? Number.parseFloat(value) : Number.parseFloat(prev.g2y)
      const y2r = field === 'y2r' ? Number.parseFloat(value) : Number.parseFloat(prev.y2r)
      
      if (!isNaN(g2y) && !isNaN(y2r)) {
        const isValid = updatedAlert.direction === "gt" ? g2y > y2r : g2y < y2r
        
        if (!isValid) {
          toast.error("Invalid thresholds", {
            description: updatedAlert.direction === "gt" 
              ? `For "greater than" (>), Green to Yellow (${g2y}) must be higher than Yellow to Red (${y2r})`
              : `For "less than" (<), Green to Yellow (${g2y}) must be lower than Yellow to Red (${y2r})`
          })
        }
      }
      
      return updatedAlert
    })
  }

  // Handle saving new alert
  const handleSaveNewAlert = () => {
    if (!newAlert.kpiName || !newAlert.g2y || !newAlert.y2r) {
      toast.error("Please fill all required fields", {
        description: "KPI name, Green to Yellow, and Yellow to Red thresholds are required"
      })
      return
    }

    if (!validateAlertThresholds()) {
      toast.error("Invalid thresholds", {
        description: newAlert.direction === "gt" 
          ? `For "greater than" (>), Green to Yellow (${newAlert.g2y}) must be higher than Yellow to Red (${newAlert.y2r})`
          : `For "less than" (<), Green to Yellow (${newAlert.g2y}) must be lower than Yellow to Red (${newAlert.y2r})`
      })
      return
    }
    
    // Add the new alert to savedAlerts
    setSavedAlerts(prev => [...prev, {...newAlert}])
    
    // Reset the form
    setNewAlert({
      kpiName: "",
      kpiDesc: "",
      kpiGroup: "",
      g2y: "",
      y2r: "",
      criticality: "Low",
      waitTime: "5",
      direction: "gt",
      isActive: false
    })
    
    // Exit editing mode
    setIsEditingAlert(false)
    
    // Show success toast
    toast.success("Alert Configuration Saved", {
      description: "The alert configuration has been added"
    })
  }

  // Render the alert configuration step
  const renderAlertConfig = () => {
    const parentKpis = getAllParentKpis()
    
    // Filter out KPIs that are already in the savedAlerts table
    const availableKpis = parentKpis.filter(kpi => 
      !savedAlerts.some(alert => alert.kpiName === kpi.kpi_name)
    )
    
    // Filter KPIs based on search term
    const filteredKpis = kpiAlertSearchTerm ? 
      availableKpis.filter(kpi => 
        kpi.kpi_desc.toLowerCase().includes(kpiAlertSearchTerm.toLowerCase()) ||
        kpi.kpi_name.toLowerCase().includes(kpiAlertSearchTerm.toLowerCase())
      ) : 
      availableKpis

    return (
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Alert Configuration</h2>
          <p className="text-sm text-muted-foreground">Configure alert settings for KPIs</p>
            </div>

        <div className="space-y-4">
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="h-10 px-4 text-left font-medium">KPI Name</th>
                      <th className="h-10 px-2 text-left font-medium">Group</th>
                      <th className="h-10 px-2 text-center font-medium">Green to Yellow</th>
                      <th className="h-10 px-2 text-center font-medium">Direction</th>
                      <th className="h-10 px-2 text-center font-medium">Yellow to Red</th>
                      <th className="h-10 px-2 text-center font-medium">Criticality</th>
                      <th className="h-10 px-2 text-center font-medium">Wait Time</th>
                      <th className="h-10 px-2 text-center font-medium">Active Status</th>
                      <th className="h-10 px-2 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                  {savedAlerts.length > 0 ? (
                    savedAlerts.map((alert, index) => (
                      <tr key={index} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-2 px-4 align-middle">{alert.kpiDesc}</td>
                          <td className="p-2 align-middle">
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-xs font-medium">
                            {alert.kpiGroup}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle">
                            <span className="font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                            {alert.g2y || "-"}
                          </span>
                        </td>
                        <td className="p-2 text-center align-middle">
                          <span className="font-mono px-2 py-1 rounded">
                            {alert.direction === "gt" ? ">" : "<"}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle">
                            <span className="font-mono bg-red-100 text-red-800 px-2 py-1 rounded">
                            {alert.y2r || "-"}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle">
                          <span className={`px-2 py-1 rounded text-xs font-medium
                              ${
                              alert.criticality === "Low"
                                  ? "bg-blue-100 text-blue-800"
                                : alert.criticality === "Medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                  : alert.criticality === "High"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-red-100 text-red-800"
                              }`}
                            >
                            {alert.criticality}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle">
                          <span className="font-mono">{alert.waitTime} min</span>
                          </td>
                          <td className="p-2 text-center align-middle">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                            alert.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                            {alert.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle">
                          <Button variant="ghost" size="icon" onClick={() => handleEditAlert(alert, index)}>
                            <Pencil className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))
                  ) : !isEditingAlert ? (
                      <tr>
                      <td colSpan={9} className="h-24 text-center text-muted-foreground">
                        No alert configurations yet
                      </td>
                    </tr>
                  ) : null}
                  
                  {/* New alert row - shown when isEditingAlert is true */}
                  {isEditingAlert && (
                    <tr className="border-b bg-accent/5">
                      <td className="p-2 px-4 align-middle">
                        <Select
                          value={newAlert.kpiName}
                          onValueChange={(value) => handleAlertKpiSelection(value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {newAlert.kpiName ? newAlert.kpiDesc : "Select KPI"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2 sticky top-0 bg-popover z-10">
                              <Input
                                placeholder="Search KPIs..."
                                className="mb-2"
                                value={kpiAlertSearchTerm}
                                onChange={(e) => setKpiAlertSearchTerm(e.target.value)}
                                // Prevent Select from closing or value changing on input
                                onClick={e => e.stopPropagation()}
                                onKeyDown={e => e.stopPropagation()}
                              />
                            </div>
                            <SelectGroup>
                              {filteredKpis.length > 0 ? (
                                filteredKpis.map(kpi => (
                                  <SelectItem
                                    key={kpi.kpi_name}
                                    value={kpi.kpi_name}
                                    // Only select on click, not on input
                                    onClick={() => handleAlertKpiSelection(kpi.kpi_name)}
                                  >
                                    {kpi.kpi_desc}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="no-kpis" disabled>
                                  {kpiAlertSearchTerm ? "No matching KPIs found" : "No KPIs available"}
                                </SelectItem>
                              )}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 align-middle">
                        {newAlert.kpiGroup && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-xs font-medium">
                            {newAlert.kpiGroup}
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center align-middle">
                        <Input
                          value={newAlert.g2y}
                          onChange={(e) => handleThresholdChange('g2y', e.target.value)}
                          placeholder="G2Y"
                          className={`text-center max-w-[70px] mx-auto ${
                            !validateAlertThresholds() && newAlert.g2y && newAlert.y2r
                              ? "border-red-500 focus-visible:ring-red-500"
                              : ""
                          }`}
                        />
                      </td>
                      <td className="p-2 text-center align-middle">
                        <Button 
                          type="button"
                          variant="ghost"
                          size="sm" 
                          className="rounded-full h-8 w-8 p-0 flex items-center justify-center"
                          onClick={() => {
                            setNewAlert(prev => {
                              const newDirection = prev.direction === "gt" ? "lt" : "gt" as "gt" | "lt"
                              const updatedAlert = {...prev, direction: newDirection}
                              
                              // Revalidate immediately after direction change
                              if (prev.g2y && prev.y2r) {
                                const g2y = Number.parseFloat(prev.g2y)
                                const y2r = Number.parseFloat(prev.y2r)
                                if (!isNaN(g2y) && !isNaN(y2r)) {
                                  const isValid = newDirection === "gt" ? g2y > y2r : g2y < y2r
                                  if (!isValid) {
                                    toast.error("Invalid thresholds", {
                                      description: newDirection === "gt" 
                                        ? `For "greater than" (>), Green to Yellow (${g2y}) must be higher than Yellow to Red (${y2r})`
                                        : `For "less than" (<), Green to Yellow (${g2y}) must be lower than Yellow to Red (${y2r})`
                                    })
                                  }
                                }
                              }
                              
                              return updatedAlert
                            })
                          }}
                        >
                          {newAlert.direction === "gt" ? (
                            <p className="text-lg"> &gt; </p>
                          ) : (
                            <p className="text-lg"> &lt; </p>
                          )}
                        </Button>
                      </td>
                      <td className="p-2 text-center align-middle">
                        <Input
                          value={newAlert.y2r}
                          onChange={(e) => handleThresholdChange('y2r', e.target.value)}
                          placeholder="Y2R"
                          className={`text-center max-w-[70px] mx-auto ${
                            !validateAlertThresholds() && newAlert.g2y && newAlert.y2r
                              ? "border-red-500 focus-visible:ring-red-500"
                              : ""
                          }`}
                        />
                      </td>
                      <td className="p-2 text-center align-middle">
                        <Select
                          value={newAlert.criticality}
                          onValueChange={(value) => setNewAlert(prev => ({...prev, criticality: value}))}
                        >
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Very High">Very High</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-center align-middle">
                        <Input
                          value={newAlert.waitTime}
                          onChange={(e) => setNewAlert(prev => ({...prev, waitTime: e.target.value}))}
                          placeholder="Minutes"
                          className="text-center max-w-[70px] mx-auto"
                        />
                      </td>
                      <td className="p-2 text-center align-middle">
                        <Switch
                          checked={newAlert.isActive}
                          onCheckedChange={(checked) => setNewAlert(prev => ({...prev, isActive: checked}))}
                        />
                      </td>
                      <td className="p-2 text-center align-middle">
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" onClick={handleCancelEditingAlert}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={handleSaveNewAlert}
                            disabled={!newAlert.kpiName || !newAlert.g2y || !newAlert.y2r || !validateAlertThresholds()}
                            className="px-2"
                          >
                            Save
                          </Button>
                        </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          
          <div className="flex items-center justify-center py-4">
            {!isEditingAlert && (
              <Button 
                onClick={() => setIsEditingAlert(true)}
                className="flex items-center"
                disabled={isEditingAlert || availableKpis.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add KPI Alert
              </Button>
            )}
          </div>
        </div>
      </Card>
    )
  }

  // Add this state for new filter form
  const [showFilterForm, setShowFilterForm] = useState(false)
  const [newFilter, setNewFilter] = useState({
    kpiName: "",
    kpiDesc: "",
    kpiGroup: "",
    filterName: "",
    operator: "EQ" as "EQ" | "NE" | "CP",
    value: ""
  })
  const [savedFilters, setSavedFilters] = useState<Array<{
    kpiName: string,
    kpiDesc: string,
    kpiGroup: string,
    filterName: string,
    operator: "EQ" | "NE" | "CP",
    value: string
  }>>([])
  const [isEditing, setIsEditing] = useState(false)

  // Helper function to get all parent KPIs
  const getAllParentKpis = useCallback(() => {
    return [...osKpis, ...jobsKpis].filter(kpi => kpi.parent === true)
  }, [osKpis, jobsKpis])

  // Handle saving new filter
  const handleSaveNewFilter = () => {
    if (!newFilter.kpiName || !newFilter.filterName || !newFilter.value) {
      toast.error("Please fill all required fields", {
        description: "KPI name, filter name and value are required"
      })
      return
    }
    
    // Add the new filter to savedFilters
    setSavedFilters(prev => [...prev, {...newFilter}])
    
    // Reset the form
    setNewFilter({
      kpiName: "",
      kpiDesc: "",
      kpiGroup: "",
      filterName: "",
      operator: "EQ",
      value: ""
    })
    
    // Exit editing mode
    setIsEditing(false)
    
    // Show success toast
    toast.success("Filter saved successfully", {
      description: "The filter has been added to your configuration"
    })
  }

  // Update handleKpiSelection to handle filter names
  const handleKpiSelection = async (kpiName: string) => {
    const selectedKpi = [...osKpis, ...jobsKpis].find(kpi => kpi.kpi_name === kpiName)
    if (selectedKpi) {
      setNewFilter(prev => ({
        ...prev,
        kpiName: selectedKpi.kpi_name,
        kpiDesc: selectedKpi.kpi_desc,
        kpiGroup: selectedKpi.kpi_group,
        filterName: "", // Reset filter name
        operator: "EQ",
        value: ""
      }))
      
      // Fetch filter names for the selected KPI
      try {
        const response = await axios.get(`https://shwsckbvbt.a.pinggy.link/api/filter?kpiName=${kpiName}`)
        if (response.status === 200 && response.data.length > 0) {
          const filterNames = response.data.map((item: { filter_name: string }) => item.filter_name)
          
          // If only one filter is available, auto-populate it
          if (filterNames.length === 1) {
            setNewFilter(prev => ({
              ...prev,
              filterName: filterNames[0]
            }))
          }
          
          // Store available filters for this KPI
          setAvailableFilters(filterNames)
        }
      } catch (error) {
        console.error("Error fetching filter options:", error)
        toast.error("Failed to load filter options", {
          description: "Please try again"
        })
      }
    }
  }

  // Handle editing an existing filter
  const handleEditFilter = (filter: typeof savedFilters[0], index: number) => {
    // Set the filter to be edited in the newFilter state
    setNewFilter({
      kpiName: filter.kpiName,
      kpiDesc: filter.kpiDesc,
      kpiGroup: filter.kpiGroup,
      filterName: filter.filterName,
      operator: filter.operator,
      value: filter.value
    })
    
    // Enable editing mode
    setIsEditing(true)
    
    // Remove the filter from the savedFilters array while editing
    setSavedFilters(prev => prev.filter((_, i) => i !== index))
  }

  // Cancel editing
  const handleCancelEditing = () => {
    setIsEditing(false)
    setNewFilter({
      kpiName: "",
      kpiDesc: "",
      kpiGroup: "",
      filterName: "",
      operator: "EQ",
      value: ""
    })
  }

  // Add this helper function to get parent KPIs with filters
  const getParentKpisWithFilters = useCallback(() => {
    return [...osKpis, ...jobsKpis].filter(kpi => 
      kpi.parent === true && kpi.filter === true
    )
  }, [osKpis, jobsKpis])

  // Update the renderFilterSettings function
  const renderFilterSettings = () => {
    const parentKpisWithFilters = getParentKpisWithFilters()
    
    // Filter KPIs based on search term
    const filteredKpis = kpiFilterSearchTerm 
      ? parentKpisWithFilters.filter(kpi => 
          kpi.kpi_desc.toLowerCase().includes(kpiFilterSearchTerm.toLowerCase()) ||
          kpi.kpi_name.toLowerCase().includes(kpiFilterSearchTerm.toLowerCase())
        )
      : parentKpisWithFilters

    return (
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Filter Settings</h2>
          <p className="text-sm text-muted-foreground">Configure filter settings for KPIs</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-md border">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="h-10 px-4 text-left font-medium">KPI Name</th>
                    <th className="h-10 px-2 text-left font-medium">Group</th>
                    <th className="h-10 px-4 text-left font-medium">Filter Name</th>
                    <th className="h-10 px-2 text-center font-medium">Operator</th>
                    <th className="h-10 px-4 text-left font-medium">Value</th>
                    <th className="h-10 px-2 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {savedFilters.length > 0 ? (
                    savedFilters.map((filter, index) => (
                      <tr key={index} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-2 px-4 align-middle">{filter.kpiDesc}</td>
                        <td className="p-2 align-middle">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-xs font-medium">
                            {filter.kpiGroup}
                          </span>
                        </td>
                        <td className="p-2 px-4 align-middle">{filter.filterName}</td>
                        <td className="p-2 text-center align-middle">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-accent/50 text-xs font-medium">
                            {filter.operator}
                          </span>
                        </td>
                        <td className="p-2 px-4 align-middle">{filter.value}</td>
                        <td className="p-2 text-center align-middle">
                          <Button variant="ghost" size="icon" onClick={() => handleEditFilter(filter, index)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : !isEditing ? (
                    <tr>
                      <td colSpan={6} className="h-24 text-center text-muted-foreground">
                        No filters configured yet
                      </td>
                    </tr>
                  ) : null}
                  
                  {/* New filter row - shown when isEditing is true */}
                  {isEditing && (
                    <tr className="border-b bg-accent/5">
                      <td className="p-2 px-4 align-middle">
                        <Select
                          value={newFilter.kpiName} 
                          onValueChange={(value) => handleKpiSelection(value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {newFilter.kpiName ? newFilter.kpiDesc : "Select KPI"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <div className="p-2 sticky top-0 bg-popover z-10 border-b">
                              <Input 
                                placeholder="Search KPIs..." 
                                className="mb-2"
                                value={kpiFilterSearchTerm}
                                onChange={(e) => setKpiFilterSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="max-h-[200px] overflow-y-auto">
                              <SelectGroup>
                                {filteredKpis.length > 0 ? (
                                  filteredKpis.map(kpi => (
                                    <SelectItem 
                                      key={kpi.kpi_name} 
                                      value={kpi.kpi_name}
                                      className="cursor-pointer"
                                    >
                                      {kpi.kpi_desc}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="no-kpis" disabled>
                                    {kpiFilterSearchTerm ? "No matching KPIs found" : "No KPIs with filters available"}
                                  </SelectItem>
                                )}
                              </SelectGroup>
                            </div>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 align-middle">
                        {newFilter.kpiGroup && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-xs font-medium">
                            {newFilter.kpiGroup}
                          </span>
                        )}
                      </td>
                      <td className="p-2 px-4 align-middle">
                        <Select
                          value={newFilter.filterName}
                          onValueChange={(value) => setNewFilter(prev => ({...prev, filterName: value}))}
                          disabled={!newFilter.kpiName || availableFilters.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue>
                              {!newFilter.kpiName 
                                ? "Select KPI first" 
                                : availableFilters.length === 0 
                                  ? "No filters available" 
                                  : newFilter.filterName || "Select filter"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {availableFilters.map((filterName) => (
                              <SelectItem key={filterName} value={filterName}>
                                {filterName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 text-center align-middle">
                        <Select
                          value={newFilter.operator} 
                          onValueChange={(value: "EQ" | "NE" | "CP") => setNewFilter(prev => ({...prev, operator: value}))}
                          disabled={!newFilter.filterName}
                        >
                          <SelectTrigger className="w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="EQ">EQ</SelectItem>
                            <SelectItem value="NE">NE</SelectItem>
                            <SelectItem value="CP">CP</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-2 px-4 align-middle">
                        <Input
                          value={newFilter.value}
                          onChange={(e) => setNewFilter(prev => ({...prev, value: e.target.value}))}
                          placeholder="Enter value"
                          disabled={!newFilter.filterName}
                        />
                      </td>
                      <td className="p-2 text-center align-middle">
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" onClick={handleCancelEditing}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="default" 
                            onClick={handleSaveNewFilter} 
                            disabled={!newFilter.kpiName || !newFilter.filterName || !newFilter.value}
                            size="sm"
                          >
                            Save
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-center py-4">
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="flex items-center"
                disabled={isEditing || parentKpisWithFilters.length === 0}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Filter
              </Button>
            )}
          </div>
        </div>
      </Card>
    )
  }

  // Update the navigation buttons to be more consistent
  const renderNavButtons = () => {
    return (
      <div className="flex justify-between mt-8">
        {currentStep > 1 && (
        <Button
          type="button"
          variant="outline"
          onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        )}

        {currentStep === 1 && (
          <div></div> // Empty div to maintain flex layout
        )}

        {currentStep < 3 ? (
          <Button
            type="button"
            onClick={() => {
              if (currentStep === 1) {
                // Move to step 2 without selecting a specific KPI
                setCurrentStep(2)
              } else if (currentStep === 2) {
                // Move to step 3
                setCurrentStep(3)
              }
            }}
          >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => {
              // Complete the wizard
              setCurrentStep(1)
              setSelectedKpi(null)
              toast.success("Configuration completed", {
                description: "All settings have been saved successfully",
              })
            }}
          >
            Complete
          </Button>
        )}
      </div>
    )
  }

  // Add state for KPI dropdown search in Filter Settings
  const [kpiFilterSearchTerm, setKpiFilterSearchTerm] = useState("")

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header Card */}
      <Card className="mb-8 p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:bg-accent/5">
        <div className="flex justify-between items-center">
          <div className="flex items-center justify-space-between space-x-6">
            <div>
              <h1 className="text-2xl font-bold">Select system</h1>
            </div>
            <Select value={selectedSystem} onValueChange={handleSystemChange} disabled={isLoading}>
              <SelectTrigger className="w-[280px]">
                <SelectValue>
                  {isLoading
                    ? "Loading..."
                    : selectedSystem
                      ? systems.find((sys) => sys.system_id === selectedSystem)?.system_id
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
                    {isLoading ? "Loading systems..." : error ? "Failed to load systems" : "No systems available"}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <div className="space-y-8">
        {/* Monitoring Areas and KPI Groups always visible in all steps */}
            <div className="grid grid-cols-2 gap-8">
              {/* Monitoring Areas Card */}
              <div>{renderMonitoringAreas()}</div>

              {/* KPI Groups Card */}
              <div>{renderKPIGroups()}</div>
            </div>

        {/* Progress Steps - Moved below monitoring areas and KPI groups */}
        {renderProgressSteps()}

        {/* Step-specific content shown below */}
        <div className="w-full">
          {currentStep === 1 && renderKPIs()}
        {currentStep === 2 && renderAlertConfig()}
        {currentStep === 3 && renderFilterSettings()}
        </div>

        {/* Navigation Buttons */}
        {renderNavButtons()}
      </div>

      {/* KPI Settings Sheet - Keep this for backward compatibility */}
      <KpiSettingsSheet
        open={isSettingsOpen}
        onClose={() => {
          setIsSettingsOpen(false)
          setSelectedKpiSettings(null)
        }}
        kpi={selectedKpiSettings}
        setOsKpis={setOsKpis}
        setJobsKpis={setJobsKpis}
      />
    </div>
  )
}
