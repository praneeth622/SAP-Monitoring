"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Settings, X, Plus, ArrowRight, ArrowLeft, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import axios from "axios"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

// Table styles
const tableContainerStyles = "max-h-[60vh] overflow-y-auto"

// Initialize empty KPI data arrays
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
        // Remove area
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

        // Clear active KPI groups for this area
        const groupsToRemove = [...osKpiGroup, ...jobsKpiGroup]
          .filter((group) => group.mon_area === areaName)
          .map((group) => group.kpi_grp_name)

        setActiveKpiGroups((prev) => {
          const next = new Set(prev)
          groupsToRemove.forEach((name) => next.delete(name))
          return next
        })

        toast.info(`Monitoring Area Deactivated`, {
          description: `${areaName} monitoring area has been deactivated`,
        })
      } else {
        // Add area and fetch its KPI groups
        const response = await fetch(`https://shwsckbvbt.a.pinggy.link/api/kpigrp?mon_area=${areaName}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch KPI groups for ${areaName}`)
        }

        const kpiGroupData = await response.json()
        setActiveAreas((prev) => new Set(prev).add(areaName))

        // Set KPI groups based on area
        if (areaName === "OS") {
          setOsKpiGroup(kpiGroupData)
        } else if (areaName === "JOBS") {
          setJobsKpiGroup(kpiGroupData)
        }

        toast.success(`Monitoring Area Activated`, {
          description: `${areaName} monitoring area has been activated`,
        })

        // AUTOMATICALLY ACTIVATE ALL KPI GROUPS IN THIS MONITORING AREA
        for (const group of kpiGroupData) {
          if (activateKpiGroupRef.current) {
            await activateKpiGroupRef.current(group.kpi_grp_name, areaName)
          }
        }
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

        // Check if all KPI groups under this monitoring area are now inactive
        if (!willBeActive) {
          // Get all KPI groups for this monitoring area
          const allGroupsForArea = [...osKpiGroup, ...jobsKpiGroup].filter((g) => g.mon_area === monArea)

          // Check if any KPI group for this area is still active
          const anyGroupActive = allGroupsForArea.some((g) =>
            g.kpi_grp_name === groupName ? willBeActive : activeKpiGroups.has(g.kpi_grp_name),
          )

          // If no KPI group is active and the monitoring area is currently active, deactivate it
          if (!anyGroupActive && activeAreas.has(monArea)) {
            console.log(`All KPI groups under ${monArea} are inactive. Automatically deactivating monitoring area.`)

            // Call the monitoring area toggle function to deactivate it
            await handleMonitoringAreaToggle(monArea)

            toast.info(`Monitoring Area Auto-Deactivated`, {
              description: `${monArea} monitoring area has been automatically deactivated because all its KPI groups are inactive.`,
            })
          }
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
    setSelectedKpi(kpi)

    // Initialize alert configuration
    setAlertConfig({
      thresholds: {
        g2y: kpi.g2y?.toString() || "",
        y2r: kpi.y2r?.toString() || "",
      },
      criticality: kpi.criticality || "Low",
      alertWaitTime: "5", // Default value
      isActive: kpi.is_active || false,
      isDrilldown: Boolean(kpi.drilldown),
      comparisonDirection: "gt", // Default value
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
      const response = await axios.post(`https://shwsckbvbt.a.pinggy.link/api/kpi/${selectedKpi.kpi_name}/settings`, {
        thresholds: alertConfig.thresholds,
        criticality: alertConfig.criticality,
        alertWaitTime: alertConfig.alertWaitTime,
        isActive: alertConfig.isActive,
        isDrilldown: alertConfig.isDrilldown,
      })

      if (response.status === 200) {
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

  // Function to save filter configuration
  const handleSaveFilterConfig = async () => {
    if (!selectedKpi) return

    try {
      setIsLoading(true)

      // Format the filters for the API
      const formattedFilters = filterConfig.map((filter) => ({
        name: filter.filterName,
        operator: filter.operator,
        value: filter.value,
      }))

      // API call to save filter configuration
      const response = await axios.post(`https://shwsckbvbt.a.pinggy.link/api/kpi/${selectedKpi.kpi_name}/filters`, {
        filters: formattedFilters,
      })

      if (response.status === 200) {
        toast.success("Filter Configuration Saved", {
          description: "Filter settings have been updated successfully",
        })

        // Complete the wizard
        setCurrentStep(1)
        setSelectedKpi(null)
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
            // Allow clicking on completed steps or the first step
            if (step.completed || step.id === 1) {
              setCurrentStep(step.id)
            }
          }}
        >
          <div
            className={`
              h-12 flex items-center justify-center px-4
              ${step.current || step.completed ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}
              ${index === 0 ? "rounded-l-md" : ""}
              ${index === steps.length - 1 ? "rounded-r-md" : ""}
              ${step.completed || step.id === 1 ? "cursor-pointer hover:brightness-95" : ""}
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
                {step.id === 1 || step.id === 3 ? " *" : ""}
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
    const parentKpis = filteredKpis([...osKpis, ...jobsKpis].filter((kpi) => kpi.parent === true))
    const childKpis = [...osKpis, ...jobsKpis].filter((kpi) => !kpi.parent)

    // Add this function to check if a KPI group is active
    const isKpiGroupActive = (groupName: string) => {
      return activeKpiGroups.has(groupName)
    }

    // Filter child KPIs to only show those from active groups
    const activeChildKpis = childKpis.filter((kpi) => isKpiGroupActive(kpi.kpi_group))

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
        ) : parentKpis.length > 0 ? (
          <div className={tableContainerStyles}>
            {/* Table Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="grid grid-cols-12 gap-4 py-3 px-4 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-4">KPI Name</div>
                <div className="col-span-2">Area</div>
                <div className="col-span-2">Monitoring Area</div>
                <div className="col-span-3 text-center">Status</div>
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
                    onClick={() => handleSelectKpi(kpi)}
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
                    <div className="col-span-1 flex justify-end">
                      <Button variant="ghost" size="icon" onClick={(e) => handleKpiSettings(kpi, e)}>
                        <Settings className="h-4 w-4" />
                      </Button>
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
    )
  }

  // Render the alert configuration step
  const renderAlertConfig = () => {
    const parentKpis = filteredKpis([...osKpis, ...jobsKpis].filter((kpi) => kpi.parent === true))

    return (
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Alert Configuration</h2>
          <p className="text-sm text-muted-foreground">Configure alert settings for all KPIs</p>
        </div>

        {selectedKpi ? (
          // Show detailed configuration for selected KPI
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Configuring: <span className="text-primary">{selectedKpi.kpi_desc}</span>
              </h3>
              <Button variant="outline" size="sm" onClick={() => setSelectedKpi(null)}>
                Back to List
              </Button>
            </div>

            {/* Threshold Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Threshold Settings</h3>
              <div className="grid gap-4 p-4 bg-accent/5 rounded-lg">
                <div className="grid grid-cols-5 gap-2 items-center">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="g2y" className="font-medium text-green-600">
                      Green to Yellow
                    </Label>
                    <Input
                      id="g2y"
                      type="text"
                      inputMode="numeric"
                      value={alertConfig.thresholds.g2y}
                      onChange={(e) => handleNumberInputChange(e, "thresholds", "g2y")}
                      placeholder="Enter threshold"
                      className={`text-center ${
                        !validateThresholds() && alertConfig.thresholds.g2y && alertConfig.thresholds.y2r
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
                        setAlertConfig((prev) => ({
                          ...prev,
                          comparisonDirection: prev.comparisonDirection === "gt" ? "lt" : "gt",
                        }))
                      }
                    >
                      {alertConfig.comparisonDirection === "gt" ? (
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
                      value={alertConfig.thresholds.y2r}
                      onChange={(e) => handleNumberInputChange(e, "thresholds", "y2r")}
                      placeholder="Enter threshold"
                      className={`text-center ${
                        !validateThresholds() && alertConfig.thresholds.g2y && alertConfig.thresholds.y2r
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }`}
                    />
                  </div>
                </div>

                {/* Error message */}
                {!validateThresholds() && alertConfig.thresholds.g2y && alertConfig.thresholds.y2r && (
                  <div className="text-red-500 text-sm px-2">
                    {alertConfig.comparisonDirection === "gt" ? (
                      <>
                        <span className="font-medium">Invalid thresholds:</span> When using <span> &gt; </span>, Green
                        to Yellow ({alertConfig.thresholds.g2y}) must be lower than Yellow to Red (
                        {alertConfig.thresholds.y2r})
                      </>
                    ) : (
                      <>
                        <span className="font-medium">Invalid thresholds:</span> When using <p> &lt; </p>, Green to
                        Yellow ({alertConfig.thresholds.g2y}) must be higher than Yellow to Red (
                        {alertConfig.thresholds.y2r})
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Alert Criticality */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Alert Criticality</h3>
              <div className="grid gap-4 p-4 bg-accent/5 rounded-lg">
                <div className="grid gap-2">
                  <Select
                    value={alertConfig.criticality}
                    onValueChange={(value) =>
                      setAlertConfig((prev) => ({
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

            {/* Alert Wait Time */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Alert Wait Time (In Minutes)</h3>
              <div className="grid gap-4 p-4 bg-accent/5 rounded-lg">
                <div className="grid gap-2">
                  <Input
                    id="alertWaitTime"
                    type="text"
                    inputMode="numeric"
                    value={alertConfig.alertWaitTime}
                    onChange={(e) => handleNumberInputChange(e, "alertWaitTime")}
                    placeholder="Enter wait time"
                  />
                </div>
              </div>
            </div>

            {/* Status Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Status Settings</h3>
              <div className="grid gap-4 p-4 border rounded-lg bg-accent/5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive" className="font-medium">
                    Active Status
                  </Label>
                  <Switch
                    id="isActive"
                    checked={alertConfig.isActive}
                    onCheckedChange={(checked) =>
                      setAlertConfig((prev) => ({
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
                    checked={alertConfig.isDrilldown}
                    onCheckedChange={(checked) =>
                      setAlertConfig((prev) => ({
                        ...prev,
                        isDrilldown: checked,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedKpi(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveAlertConfig} disabled={isLoading || !validateThresholds()}>
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⌛</span>
                    Saving...
                  </>
                ) : (
                  "Save Configuration"
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Show table of all KPIs
          <div>
            <div className="mb-4">
              <Input
                placeholder="Search KPIs..."
                value={kpiSearchTerm}
                onChange={(e) => setKpiSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="h-10 px-4 text-left font-medium">KPI Name</th>
                      <th className="h-10 px-2 text-left font-medium">Group</th>
                      <th className="h-10 px-2 text-center font-medium">Green to Yellow</th>
                      <th className="h-10 px-2 text-center font-medium">Yellow to Red</th>
                      <th className="h-10 px-2 text-center font-medium">Criticality</th>
                      <th className="h-10 px-2 text-center font-medium">Wait Time</th>
                      <th className="h-10 px-2 text-center font-medium">Status</th>
                      <th className="h-10 px-2 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parentKpis.length > 0 ? (
                      parentKpis.map((kpi) => (
                        <tr key={kpi.kpi_name} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-2 px-4 align-middle">{kpi.kpi_desc}</td>
                          <td className="p-2 align-middle">
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-xs font-medium">
                              {kpi.kpi_group}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle">
                            <span className="font-mono bg-green-100 text-green-800 px-2 py-1 rounded">
                              {kpi.g2y || "-"}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle">
                            <span className="font-mono bg-red-100 text-red-800 px-2 py-1 rounded">
                              {kpi.y2r || "-"}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium
                              ${
                                kpi.criticality === "Low"
                                  ? "bg-blue-100 text-blue-800"
                                  : kpi.criticality === "Medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : kpi.criticality === "High"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-red-100 text-red-800"
                              }`}
                            >
                              {kpi.criticality || "Low"}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle">
                            <span className="font-mono">5 min</span>
                          </td>
                          <td className="p-2 text-center align-middle">
                            <Switch
                              checked={kpi.is_active}
                              onCheckedChange={() => handleKpiStatusChange(kpi)}
                              disabled={isUpdating === kpi.kpi_name}
                            />
                          </td>
                          <td className="p-2 text-center align-middle">
                            <Button variant="outline" size="sm" onClick={() => handleSelectKpi(kpi)}>
                              Configure
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="h-24 text-center text-muted-foreground">
                          No KPIs found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Card>
    )
  }

  // Render the filter settings step
  const renderFilterSettings = () => {
    const parentKpis = filteredKpis([...osKpis, ...jobsKpis].filter((kpi) => kpi.parent === true))

    return (
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Filter Settings</h2>
          <p className="text-sm text-muted-foreground">Configure filter settings for all KPIs</p>
        </div>

        {selectedKpi ? (
          // Show detailed filter configuration for selected KPI
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Configuring Filters: <span className="text-primary">{selectedKpi.kpi_desc}</span>
              </h3>
              <Button variant="outline" size="sm" onClick={() => setSelectedKpi(null)}>
                Back to List
              </Button>
            </div>

            {selectedKpi.filter === true ? (
              <div className="space-y-6">
                {isLoadingFilters ? (
                  <div className="flex justify-center p-4">
                    <Spinner className="h-6 w-6" />
                    <span className="ml-2">Loading filters...</span>
                  </div>
                ) : availableFilters.length > 0 ? (
                  <>
                    <div className="rounded-md border">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="h-10 px-4 text-left font-medium">Filter Name</th>
                              <th className="h-10 px-4 text-left font-medium">Operator</th>
                              <th className="h-10 px-4 text-left font-medium">Value</th>
                              <th className="h-10 px-4 text-center font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filterConfig.map((filter) => (
                              <tr key={filter.id} className="border-b hover:bg-muted/30 transition-colors">
                                <td className="p-2 px-4 align-middle">
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
                                </td>
                                <td className="p-2 px-4 align-middle">
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
                                </td>
                                <td className="p-2 px-4 align-middle">
                                  <Input
                                    value={filter.value}
                                    required
                                    onChange={(e) => handleFilterChange(filter.id, "value", e.target.value)}
                                    placeholder="Enter value"
                                  />
                                </td>
                                <td className="p-2 px-4 text-center align-middle">
                                  <Button variant="ghost" size="icon" onClick={() => handleRemoveFilter(filter.id)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddFilter}
                      className="mt-2"
                      disabled={isLoadingFilters}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Filter
                    </Button>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground p-4 border rounded-lg">
                    No filter options available for this KPI
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-4 border rounded-lg">
                Filtering is not available for this KPI
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedKpi(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveFilterConfig} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <span className="animate-spin mr-2">⌛</span>
                    Saving...
                  </>
                ) : (
                  "Save Filters"
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Show table of all KPIs with filter availability
          <div>
            <div className="mb-4">
              <Input
                placeholder="Search KPIs..."
                value={kpiSearchTerm}
                onChange={(e) => setKpiSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="h-10 px-4 text-left font-medium">KPI Name</th>
                      <th className="h-10 px-2 text-left font-medium">Group</th>
                      <th className="h-10 px-2 text-center font-medium">Filters Available</th>
                      <th className="h-10 px-2 text-center font-medium">Filter Count</th>
                      <th className="h-10 px-2 text-center font-medium">Status</th>
                      <th className="h-10 px-2 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parentKpis.length > 0 ? (
                      parentKpis.map((kpi) => (
                        <tr key={kpi.kpi_name} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-2 px-4 align-middle">{kpi.kpi_desc}</td>
                          <td className="p-2 align-middle">
                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-xs font-medium">
                              {kpi.kpi_group}
                            </span>
                          </td>
                          <td className="p-2 text-center align-middle">
                            {kpi.filter === true ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-800 text-xs font-medium">
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-red-100 text-red-800 text-xs font-medium">
                                No
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center align-middle">
                            <span className="font-mono">{kpi.filter === true ? "0" : "-"}</span>
                          </td>
                          <td className="p-2 text-center align-middle">
                            <Switch
                              checked={kpi.is_active}
                              onCheckedChange={() => handleKpiStatusChange(kpi)}
                              disabled={isUpdating === kpi.kpi_name || kpi.filter !== true}
                            />
                          </td>
                          <td className="p-2 text-center align-middle">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectKpi(kpi)}
                              disabled={kpi.filter !== true}
                            >
                              Configure
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="h-24 text-center text-muted-foreground">
                          No KPIs found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
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

      {/* Progress Steps */}
      {renderProgressSteps()}

      {/* Main Content */}
      <div className="space-y-8">
        {currentStep === 1 && (
          <>
            {/* First Row - Monitoring Areas and KPI Groups */}
            <div className="grid grid-cols-2 gap-8">
              {/* Monitoring Areas Card */}
              <div>{renderMonitoringAreas()}</div>

              {/* KPI Groups Card */}
              <div>{renderKPIGroups()}</div>
            </div>

            {/* Second Row - Full Width KPIs Table */}
            <div className="w-full">{renderKPIs()}</div>
          </>
        )}

        {currentStep === 2 && renderAlertConfig()}

        {currentStep === 3 && renderFilterSettings()}

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
      />
    </div>
  )
}

const KpiSettingsSheet = ({
  open,
  onClose,
  kpi,
}: {
  open: boolean
  onClose: () => void
  kpi: KPI | null
}) => {
  const [isLoading, setIsLoading] = useState(false)
  // Add state for filter values
  const [filterValues, setFilterValues] = useState<string[]>([])
  const [isLoadingFilters, setIsLoadingFilters] = useState(false)
  const [filterError, setFilterError] = useState<string | null>(null)

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
  })

  const [availableFilters, setAvailableFilters] = useState<string[]>([])
  const [isLoadingFilterOptions, setIsLoadingFilterOptions] = useState(false)

  const [comparisonDirection, setComparisonDirection] = useState<"gt" | "lt">("gt")

  // Function to fetch filter values for a KPI
  const kpiSheetFetchFilterValues = useCallback(async (kpiName: string) => {
    try {
      setIsLoadingFilters(true)
      setFilterError(null)
      setIsLoadingFilterOptions(true)

      // Fetch filter names for this KPI
      const response = await axios.get(`https://shwsckbvbt.a.pinggy.link/api/filter?kpiName=${kpiName}`)

      if (response.status === 200) {
        // Extract filter names from response
        console.log("Filter names response:", response.data)
        const filterNames = response.data.map((item: { filter_name: string }) => item.filter_name)
        console.log("Filter names:", filterNames)
        setAvailableFilters(filterNames)

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
          }))
        }
      } else {
        throw new Error("Failed to fetch filter options")
      }
    } catch (error) {
      console.error("Error fetching filter options:", error)
      setFilterError("Failed to load filter options")
      setAvailableFilters([])
    } finally {
      setIsLoadingFilters(false)
      setIsLoadingFilterOptions(false)
    }
  }, [])

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
      })

      // If KPI has filter=true, fetch the filter values
      if (kpi.filter === true) {
        kpiSheetFetchFilterValues(kpi.kpi_name)
      } else {
        // Reset filter values if KPI doesn't have filters
        setFilterValues([])
      }
    }
  }, [kpi, kpiSheetFetchFilterValues])

  const handleAddFilter = () => {
    if (availableFilters.length === 0) return

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
    }))
  }

  const handleRemoveFilter = (id: string) => {
    setConfiguration((prev) => ({
      ...prev,
      filters: prev.filters.filter((filter) => filter.id !== id),
    }))
  }

  const handleFilterChange = (id: string, field: keyof FilterOption, value: string) => {
    setConfiguration((prev) => ({
      ...prev,
      filters: prev.filters.map((filter) => (filter.id === id ? { ...filter, [field]: value } : filter)),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)

      // Format the filters for the API
      const formattedFilters = configuration.filters.map((filter) => ({
        name: filter.filterName,
        operator: filter.operator,
        value: filter.value,
      }))

      // API call to save configuration
      const response = await fetch(`https://shwsckbvbt.a.pinggy.link/api/kpi/${kpi?.kpi_name}/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...configuration,
          filters: formattedFilters,
        }),
      })

      if (!response.ok) throw new Error("Failed to save settings")

      toast.success("Settings Updated", {
        description: "KPI configuration has been updated successfully",
      })
      onClose()
    } catch (error) {
      toast.error("Failed to save settings", {
        description: error instanceof Error ? error.message : "Please try again",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Helper for handling number input changes
  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: string, subField?: string) => {
    const value = e.target.value

    // Only allow positive numbers
    if (value && (!/^\d+$/.test(value) || Number.parseInt(value) < 0)) {
      return
    }

    if (subField) {
      setConfiguration((prev) => ({
        ...prev,
        [field]: {
          ...(prev[field as keyof typeof prev] as Record<string, any>),
          [subField]: value,
        },
      }))
    } else {
      setConfiguration((prev) => ({
        ...prev,
        [field]: value,
      }))
    }
  }

  // Add these validation functions to KpiSettingsSheet component
  const validateThresholds = () => {
    const g2y = Number.parseFloat(configuration.thresholds.g2y)
    const y2r = Number.parseFloat(configuration.thresholds.y2r)

    if (isNaN(g2y) || isNaN(y2r)) {
      return true // Skip validation if values are not numbers yet
    }

    if (comparisonDirection === "gt") {
      // For greater than (>), yellow threshold should be less than red threshold
      return g2y < y2r
    } else {
      // For less than (<), yellow threshold should be greater than red threshold
      return g2y > y2r
    }
  }

  if (!kpi) return null

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
                    onChange={(e) => handleNumberInputChange(e, "thresholds", "g2y")}
                    placeholder="Enter threshold"
                    className={`text-center ${
                      !validateThresholds() && configuration.thresholds.g2y && configuration.thresholds.y2r
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
                    onClick={() => setComparisonDirection((prev) => (prev === "gt" ? "lt" : "gt"))}
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
                    onChange={(e) => handleNumberInputChange(e, "thresholds", "y2r")}
                    placeholder="Enter threshold"
                    className={`text-center ${
                      !validateThresholds() && configuration.thresholds.g2y && configuration.thresholds.y2r
                        ? "border-red-500 focus-visible:ring-red-500"
                        : ""
                    }`}
                  />
                </div>
              </div>
              {/* Error message */}
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
                      <span className="font-medium">Invalid thresholds:</span> When using <p> &lt; </p>, Green to Yellow
                      ({configuration.thresholds.g2y}) must be higher than Yellow to Red ({configuration.thresholds.y2r}
                      )
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
                  <div className="text-center text-muted-foreground p-4">No filter options available for this KPI</div>
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
  )
}
