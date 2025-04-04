import { DataPoint } from "@/types";
import { subDays, format, addHours, subHours } from "date-fns";

const getBaseValueForKPI = (kpi: string): number => {
  if (kpi.includes("CPU")) return 60;
  if (kpi.includes("MEMORY")) return 80;
  if (kpi.includes("DISK")) return 70;
  if (kpi.includes("RFC")) return 50;
  return 40;
};

export const generateTimeSeriesData = (days: number): DataPoint[] => {
  const data: DataPoint[] = [];
  const now = new Date();

  for (let i = days; i > 0; i--) {
    const date = subDays(now, i);
    // Generate 24 data points per day
    for (let hour = 0; hour < 24; hour += 2) {
      const dateWithHour = addHours(date, hour);
      data.push({
        date: format(dateWithHour, "yyyy-MM-dd HH:mm:ss"),
        category: "Revenue",
        value: Math.floor(Math.random() * 10000) + 5000 + hour * 100, // Add time-based variation
      });
      data.push({
        date: format(dateWithHour, "yyyy-MM-dd HH:mm:ss"),
        category: "Users",
        value: Math.floor(Math.random() * 2000) + 1000 + hour * 20, // Add time-based variation
      });
    }
  }

  return data;
};

export const generateMultipleDataSets = (count: number, resolution = 'auto'): DataPoint[][] => {
  const datasets: DataPoint[][] = [];
  const categories = ["Revenue", "Users"];
  
  // More aggressive optimization for time range based on resolution
  let days = 30; // default
  let dataPoints = 500; // Default max data points
  
  // Optimize data points based on resolution
  switch(resolution) {
    case '1m':
      days = 1; // For 1-minute resolution, only generate 1 day of data
      dataPoints = 180; // Limit to 3 hours of minute data (180 points)
      break;
    case '5m':
      days = 2; 
      dataPoints = 300; // Limit to 25 hours of 5-minute data
      break;
    case '15m':
      days = 3;
      dataPoints = 288; // 3 days of 15-minute data
      break;
    case '1h':
      days = 7;
      dataPoints = 168; // 7 days of hourly data
      break;
    case '1d':
      days = 30;
      dataPoints = 30; // 30 days of daily data
      break;
    case 'auto':
    default:
      days = 30;
      dataPoints = 360; // 30 days with 12 points per day (2-hour intervals)
      break;
  }
  
  const now = new Date();
  const startDate = subDays(now, days);
  
  // Determine the step (in minutes) based on resolution
  let minuteStep: number;
  
  switch(resolution) {
    case '1m':
      minuteStep = 1;
      break;
    case '5m':
      minuteStep = 5;
      break;
    case '15m':
      minuteStep = 15;
      break;
    case '1h':
      minuteStep = 60;
      break;
    case '1d':
      minuteStep = 24 * 60;
      break;
    case 'auto':
    default:
      minuteStep = 120; // 2 hour intervals (default)
      break;
  }

  // Calculate total minutes in the date range
  const totalMinutes = days * 24 * 60;
  
  // Calculate step size to get closest to desired number of data points
  const adjustedStep = Math.max(minuteStep, Math.floor(totalMinutes / dataPoints));
  
  // Optimize data point generation for high-frequency data
  const generateDataPoint = (date: Date, category: string): DataPoint => {
    const hourOfDay = date.getHours() + (date.getMinutes() / 60);
    
    // Create more realistic patterns
    const baseValue = category === "Revenue" ? 5000 : 1000;
    const hourlyVariation = category === "Revenue" ? hourOfDay * 100 : hourOfDay * 20;
    const weekendMultiplier = [0, 6].includes(date.getDay()) ? 0.7 : 1;
    const randomVariation = Math.random() * 0.4 + 0.8; // Random variation between 0.8 and 1.2
    
    const value = Math.floor(
      (baseValue + hourlyVariation) * weekendMultiplier * randomVariation
    );
    
    return {
      date: format(date, "yyyy-MM-dd HH:mm:ss"),
      category,
      value,
    };
  };

  for (let i = 0; i < count; i++) {
    const data: DataPoint[] = [];
    const currentDate = new Date(startDate);
    
    // Single optimized loop for all resolutions
    for (let minute = 0; minute < totalMinutes; minute += adjustedStep) {
      const dateWithMinutes = new Date(currentDate.getTime() + minute * 60 * 1000);
      
      // Skip if beyond now
      if (dateWithMinutes > now) break;
      
      categories.forEach(category => {
        data.push(generateDataPoint(dateWithMinutes, category));
      });
      
      // Safety check to prevent excessive data points
      if (data.length >= dataPoints * categories.length) break;
    }
    
    datasets.push(data);
  }

  return datasets;
};

export function getDummyData() {
  const now = new Date();
  const data = [];

  for (let i = 0; i < 24; i++) {
    data.push({
      date: new Date(now.getTime() - i * 3600000).toISOString(),
      value: Math.random() * 1000,
      category: "CPU Usage",
    });
  }

  return data;
}

export const generateDummyData = (categories: string[]): DataPoint[] => {
  const data: DataPoint[] = [];
  const now = new Date();

  // Generate 24 data points (hourly for a day)
  for (let i = 0; i < 24; i++) {
    const date = new Date(now);
    date.setHours(date.getHours() - i);

    // Generate a data point for each category
    categories.forEach((category) => {
      // Base value + random component + upward trend for older data
      const baseValue = 1000;
      const randomFactor = Math.random() * 500;
      const trendFactor = i * 20; // Upward trend for older data

      data.push({
        category,
        date: date.toISOString(),
        value: baseValue + randomFactor + trendFactor,
      });
    });
  }

  return data;
};
