"use client"

import { useState, useEffect } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface KpiData {
  name?: string;
  description: string;
}

interface KpiGroup {
  kpis: KpiData[];
}

interface SystemGroup {
  groups: {
    [key: string]: KpiGroup;
  };
}

interface ApiResponse {
  success: boolean;
  data: {
    [key: string]: SystemGroup;
  };
}

export default function ConfigDashboard() {
  const [apiData, setApiData] = useState<ApiResponse | null>(null)
  const [selectedSystem, setSelectedSystem] = useState<string>("")
  const [activeStep, setActiveStep] = useState(2)
  const [monitoringAreas, setMonitoringAreas] = useState<{
    id: number; 
    area: string; 
    description: string; 
    active: boolean;
  }[]>([])
  const [kpiNames, setKpiNames] = useState<{
    id: number; 
    dataArea: string; 
    description: string; 
    active: boolean;
    group: string;
  }[]>([])
  const [kpiSearch, setKpiSearch] = useState("")
  const [areaSearch, setAreaSearch] = useState("")

  // Fetch API data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/kpi-hierarchy')
        const data = await response.json()
        console.log('API Response:', data) // Add this line to debug
        setApiData(data)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData()
  }, [])

  // Update monitoring areas when system is selected
  useEffect(() => {
    if (selectedSystem && apiData) {
      const systemData = apiData.data[selectedSystem]
      if (systemData) {
        const areas = Object.keys(systemData.groups).map((area, index) => ({
          id: index + 1,
          area,
          description: `${area} Metrics`,
          active: false // Default all switches to off
        }))
        setMonitoringAreas(areas)
        setKpiNames([]) // Clear KPIs when system changes
      }
    }
  }, [selectedSystem, apiData])

  const handleSystemChange = (value: string) => {
    setSelectedSystem(value)
  }

  const handleMonitoringAreaToggle = (id: number) => {
    setMonitoringAreas(areas =>
      areas.map(area => {
        if (area.id === id) {
          const newActive = !area.active
          
          // Update KPIs when area is toggled
          if (newActive && apiData && selectedSystem) {
            const groupKpis = apiData.data[selectedSystem].groups[area.area].kpis
            const newKpiNames = groupKpis.map((kpi, index) => ({
              id: Date.now() + index, // Unique ID
              dataArea: kpi.name || '',
              description: kpi.description,
              active: true,
              group: area.area
            }))
            
            // Merge with existing KPIs from other areas
            setKpiNames(prev => [
              ...prev.filter(kpi => kpi.group !== area.area),
              ...newKpiNames
            ])
          } else {
            // Remove KPIs for this area when toggled off
            setKpiNames(prev => prev.filter(kpi => kpi.group !== area.area))
          }
          
          return { ...area, active: newActive }
        }
        return area
      })
    )
  }

  const filteredKpiNames = kpiNames.filter(kpi => 
    kpi.dataArea.toLowerCase().includes(kpiSearch.toLowerCase()) ||
    kpi.description.toLowerCase().includes(kpiSearch.toLowerCase())
  )

  const filteredMonitoringAreas = monitoringAreas.filter(area => 
    area.area.toLowerCase().includes(areaSearch.toLowerCase()) ||
    area.description.toLowerCase().includes(areaSearch.toLowerCase())
  )

  const steps = [
    { id: 1, name: 'KPI Config', completed: true, current: false },
    { id: 2, name: 'Extraction Config', completed: false, current: true },
    { id: 3, name: 'Filters', completed: false, current: false },
    { id: 4, name: 'User Access', completed: false, current: false }
    
  ]

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Progress Steps */}
      <div className="flex justify-between mb-12 px-4">
        {steps.map((step) => (
          <div key={step.id} className="flex flex-1 items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full 
                ${step.completed 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-muted text-muted-foreground"} 
                mr-2 transition-all duration-200 hover:scale-105 hover:shadow-md`}
            >
              {step.completed ? <Check className="h-5 w-5" /> : step.id}
            </div>
            <div
              className={`text-sm font-medium transition-colors duration-200
                ${step.current 
                  ? "text-primary font-semibold" 
                  : step.completed 
                    ? "text-primary/80" 
                    : "text-muted-foreground"}`}
            >
              {step.name}
            </div>
            {step.id < steps.length && (
              <div className={`flex-1 h-1 mx-4 rounded-full transition-colors duration-200
                ${step.completed ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Header Card */}
      <Card className="mb-8 p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:bg-accent/5">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <Select 
              defaultValue={selectedSystem} 
              onValueChange={handleSystemChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select System">
                  {selectedSystem || "Select System"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {apiData?.data && Object.keys(apiData.data).map((system) => (
                  <SelectItem key={system} value={system}>{system}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <h1 className="text-2xl font-bold text-white">Extraction Config</h1>
          </div>
          <Button onClick={() => setActiveStep(prev => prev + 1)} 
            className="bg-blue-600 hover:bg-blue-700 transition-colors duration-200 px-6 py-2">
            Next: Filters
          </Button>
        </div>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Monitoring Areas Card */}
        <Card className="p-6 shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:bg-accent/5">
          <h2 className="text-xl font-semibold mb-6 text-white-800">Monitoring Areas</h2>
          <div className="mb-6">
            <Input 
              placeholder="Filter for monitoring areas..." 
              value={areaSearch}
              onChange={(e) => setAreaSearch(e.target.value)}
              className="border-gray-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-between items-center mb-2 px-2">
            <div className="flex items-center w-1/4 text-sm font-medium text-gray-500">
              Area <ChevronDown className="h-4 w-4 ml-1" />
            </div>
            <div className="w-2/4 text-sm font-medium text-gray-500">Description</div>
            <div className="w-1/4 text-sm font-medium text-gray-500 text-center">Active</div>
            <div className="w-8"></div>
          </div>
          <div className="space-y-1">
            {filteredMonitoringAreas.length > 0 ? (
              filteredMonitoringAreas.map((item) => (
                <div key={item.id} 
                  className="flex justify-between items-center p-2 rounded-lg
                  transition-all duration-200 ease-in-out
                  hover:bg-accent/5 hover:shadow-sm"
                >
                  <div className="w-1/4 font-medium">{item.area}</div>
                  <div className="w-2/4 text-sm text-gray-600">{item.description}</div>
                  <div className="w-1/4 flex justify-center">
                    <Switch 
                      checked={item.active} 
                      onCheckedChange={() => handleMonitoringAreaToggle(item.id)}
                    />
                  </div>
                  <div className="w-8 flex justify-center">
                    <div className={`w-5 h-5 rounded flex items-center justify-center
                      transition-colors duration-200
                      ${item.active 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'bg-muted hover:bg-muted/80'}`}>
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                {areaSearch ? "No matching areas found" : "No monitoring areas available"}
              </div>
            )}
          </div>
        </Card>

        {/* KPI Names Card */}
        <Card className="p-6 shadow-sm transition-all duration-300 ease-in-out hover:shadow-md hover:bg-accent/5">
          <h2 className="text-xl font-semibold mb-6 text-white-800">KPI Names</h2>
          <div className="mb-6">
            <Input 
              placeholder="Search KPIs..." 
              value={kpiSearch}
              onChange={(e) => setKpiSearch(e.target.value)}
              className="border-gray-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            {filteredKpiNames.length > 0 ? (
              filteredKpiNames.map((item) => (
                <div 
                  key={item.id} 
                  className="flex justify-between items-center p-2 rounded-lg hover:bg-accent/5"
                >
                  <div className="w-2/3 font-medium">{item.dataArea}</div>
                  <div className="w-1/3 text-sm text-gray-600">{item.description}</div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                {kpiSearch ? "No matching KPIs found" : "No KPIs selected"}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

