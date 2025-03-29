import { DataPoint } from "@/types";
import { subDays, format, addHours, subHours } from "date-fns";

export interface DataPoint {
  date: string;
  category: string;
  value: number;
}

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
  const days = 30;
  const now = new Date();
  const startDate = subDays(now, days);
  
  // Determine the step (in hours) based on resolution
  let hourStep = 2; // default (2-hour intervals)
  
  switch(resolution) {
    case '1m':
      hourStep = 1/60; // 1 minute intervals
      break;
    case '5m':
      hourStep = 5/60; // 5 minute intervals
      break;
    case '15m':
      hourStep = 15/60; // 15 minute intervals
      break;
    case '1h':
      hourStep = 1; // 1 hour intervals
      break;
    case '1d':
      hourStep = 24; // daily intervals
      break;
    case 'auto':
    default:
      hourStep = 2; // 2 hour intervals (default)
      break;
  }

  for (let i = 0; i < count; i++) {
    const data: DataPoint[] = [];
    let currentDate = startDate;

    while (currentDate <= now) {
      // For hourStep < 1, we need to handle the iteration differently
      if (hourStep < 1) {
        const minutesInDay = 24 * 60;
        const minuteStep = hourStep * 60;
        const stepsPerDay = minutesInDay / minuteStep;
        
        for (let step = 0; step < stepsPerDay; step++) {
          const minutesToAdd = step * minuteStep;
          const dateWithMinutes = addHours(currentDate, minutesToAdd / 60);
          
          categories.forEach((category) => {
            const minuteOfDay = (dateWithMinutes.getHours() * 60) + dateWithMinutes.getMinutes();
            const hourOfDay = minuteOfDay / 60;
            
            // Create more realistic patterns
            const baseValue = category === "Revenue" ? 5000 : 1000;
            const hourlyVariation = category === "Revenue" ? hourOfDay * 100 : hourOfDay * 20;
            const weekendMultiplier = [0, 6].includes(dateWithMinutes.getDay()) ? 0.7 : 1;
            const randomVariation = Math.random() * 0.4 + 0.8; // Random variation between 0.8 and 1.2
            
            const value = Math.floor(
              (baseValue + hourlyVariation) * weekendMultiplier * randomVariation
            );
            
            data.push({
              date: format(dateWithMinutes, "yyyy-MM-dd HH:mm:ss"),
              category,
              value,
            });
          });
        }
      } else {
        // Original hourly loop for hourStep >= 1
        for (let hour = 0; hour < 24; hour += hourStep) {
          const dateWithHour = addHours(currentDate, hour);
          
          categories.forEach((category) => {
            // Create more realistic patterns
            const baseValue = category === "Revenue" ? 5000 : 1000;
            const hourlyVariation = category === "Revenue" ? hour * 100 : hour * 20;
            const weekendMultiplier = [0, 6].includes(dateWithHour.getDay()) ? 0.7 : 1;
            const randomVariation = Math.random() * 0.4 + 0.8; // Random variation between 0.8 and 1.2
            
            const value = Math.floor(
              (baseValue + hourlyVariation) * weekendMultiplier * randomVariation
            );
            
            data.push({
              date: format(dateWithHour, "yyyy-MM-dd HH:mm:ss"),
              category,
              value,
            });
          });
        }
      }
      
      // Always advance by full day
      currentDate = addHours(currentDate, 24);
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
