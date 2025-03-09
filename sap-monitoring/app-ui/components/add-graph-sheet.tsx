"use client"

import React, { useState, useEffect } from 'react';
import { BarChart, LineChart, Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Card } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface Template {
  id: string;
  name: string;
  system: string;
  timeRange: string;
  resolution: string;
  isDefault: boolean;
  isFavorite: boolean;
}

interface KPI {
  name: string;
  description: string;
}

interface KPIGroup {
  kpis: KPI[];
}

interface MonitoringArea {
  groups: {
    [key: string]: KPIGroup;
  };
}

interface KPIHierarchy {
  [key: string]: MonitoringArea;
}

interface AddGraphSheetProps {
  template: Template;
  onClose: () => void;
}

interface FormData {
  monitoringArea: string;
  kpiGroup: string;
  kpi: string;
  correlationKpis: string[];
  graphType: string;
  timeInterval: string;
  resolution: string;
  graphName: string;
}

const AddGraphSheet: React.FC<AddGraphSheetProps> = ({ template, onClose }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [kpiHierarchy, setKpiHierarchy] = useState<KPIHierarchy>({});
  const [formData, setFormData] = useState<FormData>({
    monitoringArea: '',
    kpiGroup: '',
    kpi: '',
    correlationKpis: [''],
    graphType: 'line',
    timeInterval: template.timeRange,
    resolution: template.resolution,
    graphName: ''
  });

  // Derived states for dropdowns
  const monitoringAreas = Object.keys(kpiHierarchy);
  const kpiGroups = formData.monitoringArea ? Object.keys(kpiHierarchy[formData.monitoringArea]?.groups || {}) : [];
  const kpis = formData.kpiGroup ? kpiHierarchy[formData.monitoringArea]?.groups[formData.kpiGroup]?.kpis || [] : [];

  useEffect(() => {
    const fetchKPIHierarchy = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('http://localhost:3000/api/kpi-hierarchy');
        if (response.data.success) {
          setKpiHierarchy(response.data.data);
        } else {
          throw new Error('Failed to fetch KPI hierarchy');
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to fetch KPI data',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchKPIHierarchy();
  }, [toast]);

  const handleMonitoringAreaChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      monitoringArea: value,
      kpiGroup: '',
      kpi: '',
      correlationKpis: []
    }));
  };

  const handleKPIGroupChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      kpiGroup: value,
      kpi: '',
      correlationKpis: []
    }));
  };

  const handleKPIChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      kpi: value
    }));
  };

  const addCorrelationKpi = () => {
    setFormData(prev => ({
      ...prev,
      correlationKpis: [...prev.correlationKpis, '']
    }));
  };

  const handleCorrelationKpiChange = (index: number, value: string) => {
    setFormData(prev => {
      const updatedKpis = [...prev.correlationKpis];
      updatedKpis[index] = value;
      return {
        ...prev,
        correlationKpis: updatedKpis
      };
    });
  };

  const removeCorrelationKpi = (index: number) => {
    setFormData(prev => ({
      ...prev,
      correlationKpis: prev.correlationKpis.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Graph configuration:', formData);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.form
      initial="hidden"
      animate="visible"
      variants={formVariants}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <motion.div
        variants={itemVariants}
        className="bg-accent/20 rounded-lg p-4 mb-6 backdrop-blur-sm"
      >
        <h3 className="font-medium text-foreground">Template Details</h3>
        <div className="mt-2 text-sm text-muted-foreground">
          <p>Name: {template.name}</p>
          <p>System: {template.system}</p>
          <p>Time Range: {template.timeRange}</p>
          <p>Resolution: {template.resolution}</p>
        </div>
      </motion.div>

      {/* Form fields */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-2">
            Monitoring Area
          </label>
          <Select
            value={formData.monitoringArea}
            onValueChange={handleMonitoringAreaChange}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select monitoring area" />
            </SelectTrigger>
            <SelectContent>
              {monitoringAreas.map(area => (
                <SelectItem key={area} value={area}>
                  {area}
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
            disabled={!formData.monitoringArea || isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select KPI group" />
            </SelectTrigger>
            <SelectContent>
              {kpiGroups.map(group => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-2">
            Primary KPI
          </label>
          <TooltipProvider>
            <Select
              value={formData.kpi}
              onValueChange={handleKPIChange}
              disabled={!formData.kpiGroup || isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select KPI" />
              </SelectTrigger>
              <SelectContent>
                {kpis.map(kpi => (
                  <Tooltip key={kpi.name}>
                    <TooltipTrigger asChild>
                      <SelectItem value={kpi.name}>
                        {kpi.name}
                      </SelectItem>
                    </TooltipTrigger>
                    {kpi.description && (
                      <TooltipContent>
                        <p>{kpi.description}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </SelectContent>
            </Select>
          </TooltipProvider>
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
              onClick={() => setFormData(prev => ({ ...prev, graphType: 'line' }))}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all duration-200 ${
                formData.graphType === 'line'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-accent/40'
              }`}
            >
              <LineChart className="w-5 h-5" />
              <span>Line Chart</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, graphType: 'bar' }))}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border transition-all duration-200 ${
                formData.graphType === 'bar'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-accent/40'
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCorrelationKpi}
              disabled={!formData.kpiGroup || isLoading}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add KPI
            </Button>
          </div>
          <div className="space-y-3">
            {formData.correlationKpis.map((kpi, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex gap-2"
              >
                <TooltipProvider>
                  <Select
                    value={kpi}
                    onValueChange={(value) => handleCorrelationKpiChange(index, value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select correlation KPI" />
                    </SelectTrigger>
                    <SelectContent>
                      {kpis.map(kpi => (
                        <Tooltip key={kpi.name}>
                          <TooltipTrigger asChild>
                            <SelectItem value={kpi.name}>
                              {kpi.name}
                            </SelectItem>
                          </TooltipTrigger>
                          {kpi.description && (
                            <TooltipContent>
                              <p>{kpi.description}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      ))}
                    </SelectContent>
                  </Select>
                </TooltipProvider>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCorrelationKpi(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
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
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-foreground bg-background border border-border rounded-lg hover:bg-accent/40 transition-all duration-200"
        >
          Cancel
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200"
        >
          Add Graph
        </motion.button>
      </motion.div>
    </motion.form>
  );
};

export default AddGraphSheet;