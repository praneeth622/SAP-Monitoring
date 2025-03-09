"use client"

import React, { useState } from 'react';
import { BarChart, LineChart } from 'lucide-react';
import { motion } from 'framer-motion';

interface Template {
  id: string;
  name: string;
  system: string;
  timeRange: string;
  resolution: string;
  isDefault: boolean;
  isFavorite: boolean;
}

interface AddGraphSheetProps {
  template: Template;
  onClose: () => void;
}

const AddGraphSheet: React.FC<AddGraphSheetProps> = ({ template, onClose }) => {
  const [formData, setFormData] = useState({
    monitoringArea: '',
    kpiGroup: '',
    kpi: '',
    graphType: 'line',
    timeInterval: template.timeRange,
    resolution: template.resolution,
    correlationKpis: [''],
    graphName: ''
  });

  // Dummy data for dropdowns
  const monitoringAreas = ['Network', 'Server', 'Application', 'Database'];
  const kpiGroups = ['Performance', 'Availability', 'Capacity', 'Error Rates'];
  const kpis = ['CPU Usage', 'Memory Usage', 'Response Time', 'Error Count'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Graph configuration:', formData);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCorrelationKpiChange = (index: number, value: string) => {
    const newCorrelationKpis = [...formData.correlationKpis];
    newCorrelationKpis[index] = value;
    setFormData(prev => ({ ...prev, correlationKpis: newCorrelationKpis }));
  };

  const addCorrelationKpi = () => {
    if (formData.correlationKpis.length < 4) {
      setFormData(prev => ({
        ...prev,
        correlationKpis: [...prev.correlationKpis, '']
      }));
    }
  };

  const removeCorrelationKpi = (index: number) => {
    setFormData(prev => ({
      ...prev,
      correlationKpis: prev.correlationKpis.filter((_, i) => i !== index)
    }));
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
          <select
            name="monitoringArea"
            value={formData.monitoringArea}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background/50 focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
          >
            <option value="">Select Monitoring Area</option>
            {monitoringAreas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-2">
            KPI Group
          </label>
          <select
            name="kpiGroup"
            value={formData.kpiGroup}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background/50 focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
          >
            <option value="">Select KPI Group</option>
            {kpiGroups.map(group => (
              <option key={group} value={group}>{group}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/90 mb-2">
            Primary KPI
          </label>
          <select
            name="kpi"
            value={formData.kpi}
            onChange={handleChange}
            className="w-full px-4 py-2 rounded-lg border border-border bg-background/50 focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
          >
            <option value="">Select KPI</option>
            {kpis.map(kpi => (
              <option key={kpi} value={kpi}>{kpi}</option>
            ))}
          </select>
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
            {formData.correlationKpis.length < 4 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={addCorrelationKpi}
                className="text-sm text-primary hover:text-primary/80"
              >
                Add KPI
              </motion.button>
            )}
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
                <select
                  value={kpi}
                  onChange={(e) => handleCorrelationKpiChange(index, e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-background/50 focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200"
                >
                  <option value="">Select KPI</option>
                  {kpis.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => removeCorrelationKpi(index)}
                  className="px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  ×
                </motion.button>
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