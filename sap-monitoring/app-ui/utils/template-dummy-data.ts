import { DataPoint } from "@/types";
import { subDays, subHours, format, addHours } from "date-fns";

/**
 * Generates consistent time series dummy data for template preview graphs
 * with realistic patterns for different metrics
 */
export const getTemplateDummyData = (categories: string[] = []): DataPoint[] => {
  // Default category if none provided
  const defaultCategories = ["CPU_UTILIZATION", "MEMORY_USAGE", "DISK_USAGE"];
  const categoriesToUse = categories?.length ? categories : defaultCategories;
  
  // Generate 7 days of hourly data
  const endDate = new Date();
  const dataPoints: DataPoint[] = [];
  
  // Define patterns for different metric types
  const patterns: Record<string, { 
    baseline: number,
    amplitude: number, 
    trend: number,
    spikes: boolean,
    fluctuation: number
  }> = {
    // CPU metrics typically show spikes during work hours
    "CPU": { 
      baseline: 40, 
      amplitude: 30, 
      trend: 0, 
      spikes: true,
      fluctuation: 0.3 
    },
    // Memory usage tends to gradually increase
    "MEMORY": { 
      baseline: 60, 
      amplitude: 15, 
      trend: 0.5, 
      spikes: false,
      fluctuation: 0.1 
    },
    // Disk usage steady with sudden jumps
    "DISK": { 
      baseline: 75, 
      amplitude: 5, 
      trend: 0.2, 
      spikes: false,
      fluctuation: 0.05 
    },
    // Network traffic shows clear day/night patterns
    "NETWORK": { 
      baseline: 30, 
      amplitude: 40, 
      trend: 0, 
      spikes: true,
      fluctuation: 0.4 
    },
    // Database metrics
    "DB": { 
      baseline: 45, 
      amplitude: 25, 
      trend: 0, 
      spikes: true,
      fluctuation: 0.25 
    },
    // Job metrics with daily patterns
    "JOB": { 
      baseline: 50, 
      amplitude: 35, 
      trend: 0, 
      spikes: true,
      fluctuation: 0.2 
    },
    // Default pattern for unknown metrics
    "DEFAULT": { 
      baseline: 50, 
      amplitude: 20, 
      trend: 0, 
      spikes: false,
      fluctuation: 0.2 
    }
  };
  
  // Generate 7 days of hourly data points
  for (let day = 7; day >= 0; day--) {
    for (let hour = 0; hour < 24; hour++) {
      const date = subHours(subDays(endDate, day), 23 - hour);
      const dateStr = date.toISOString();
      const dayOfWeek = date.getDay(); // 0-6, where 0 is Sunday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isWorkHours = hour >= 8 && hour <= 18;
      
      // Generate data for each category
      categoriesToUse.forEach((category, index) => {
        // Determine which pattern to use based on the category name
        let patternKey = "DEFAULT";
        if (category.includes("CPU") || category.includes("PROCESSOR")) patternKey = "CPU";
        else if (category.includes("MEM")) patternKey = "MEMORY";
        else if (category.includes("DISK") || category.includes("STORAGE")) patternKey = "DISK";
        else if (category.includes("NETWORK") || category.includes("TRAFFIC")) patternKey = "NETWORK";
        else if (category.includes("DB") || category.includes("DATABASE")) patternKey = "DB";
        else if (category.includes("JOB") || category.includes("TASK")) patternKey = "JOB";
        
        const pattern = patterns[patternKey];
        
        // Base value from the pattern
        let value = pattern.baseline;
        
        // Add time-based variations
        // Daily pattern - higher during work hours, lower at night
        const hourlyVariation = isWorkHours ? pattern.amplitude : pattern.amplitude * 0.3;
        value += hourlyVariation * Math.sin((hour - 12) * Math.PI / 12);
        
        // Weekly pattern - lower on weekends
        value = isWeekend ? value * 0.7 : value;
        
        // Add small upward/downward trend over time
        value += pattern.trend * (7 - day);
        
        // Add random fluctuations
        value += (Math.random() * 2 - 1) * pattern.fluctuation * pattern.baseline;
        
        // Add occasional spikes for metrics that have them
        if (pattern.spikes && Math.random() < 0.05) {
          value += pattern.amplitude * (Math.random() * 1.5);
        }
        
        // Ensure values are within reasonable range (0-100)
        value = Math.max(0, Math.min(100, value));
        
        // Add the data point
        dataPoints.push({
          category,
          date: dateStr,
          value: Number(value.toFixed(2))
        });
      });
    }
  }
  
  // Return the generated data points sorted by date
  return dataPoints.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

/**
 * Creates a filtered set of dummy data for specific categories,
 * with realistic patterns based on metric type
 */
export const getTemplateChartDummyData = (
  primaryKpi: string,
  correlationKpis: string[] = []
): DataPoint[] => {
  // Create array with all KPIs
  const allKpis = [primaryKpi, ...correlationKpis].filter(Boolean);
  
  // Get dummy data for all categories
  const allData = getTemplateDummyData(allKpis);
  
  // Return the data sorted by date
  return allData;
}; 