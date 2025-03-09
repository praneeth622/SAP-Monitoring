import { DataPoint } from '@/types';
import { subDays, format, addHours, subHours } from 'date-fns';

export interface DataPoint {
  date: string;
  category: string;
  value: number;
}

const getBaseValueForKPI = (kpi: string): number => {
  if (kpi.includes('CPU')) return 60;
  if (kpi.includes('MEMORY')) return 80;
  if (kpi.includes('DISK')) return 70;
  if (kpi.includes('RFC')) return 50;
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
        date: format(dateWithHour, 'yyyy-MM-dd HH:mm:ss'),
        category: 'Revenue',
        value: Math.floor(Math.random() * 10000) + 5000 + (hour * 100) // Add time-based variation
      });
      data.push({
        date: format(dateWithHour, 'yyyy-MM-dd HH:mm:ss'),
        category: 'Users',
        value: Math.floor(Math.random() * 2000) + 1000 + (hour * 20) // Add time-based variation
      });
    }
  }
  
  return data;
};

export const generateMultipleDataSets = (count: number): DataPoint[][] => {
  const datasets: DataPoint[][] = [];
  const categories = ['Revenue', 'Users'];
  const days = 30;
  const now = new Date();
  const startDate = subDays(now, days);

  for (let i = 0; i < count; i++) {
    const data: DataPoint[] = [];
    let currentDate = startDate;
    
    while (currentDate <= now) {
      for (let hour = 0; hour < 24; hour += 2) {
        const dateWithHour = addHours(currentDate, hour);
        categories.forEach(category => {
          // Create more realistic patterns
          const baseValue = category === 'Revenue' ? 5000 : 1000;
          const hourlyVariation = category === 'Revenue' ? hour * 100 : hour * 20;
          const weekendMultiplier = [0, 6].includes(dateWithHour.getDay()) ? 0.7 : 1;
          const randomVariation = Math.random() * 0.4 + 0.8; // Random variation between 0.8 and 1.2

          const value = Math.floor((baseValue + hourlyVariation) * weekendMultiplier * randomVariation);

          data.push({
            date: format(dateWithHour, 'yyyy-MM-dd HH:mm:ss'),
            category,
            value
          });
        });
      }
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
      category: 'CPU Usage'
    });
  }
  
  return data;
}

export const generateDummyData = (kpis: string[], days: number = 7): DataPoint[] => {
  const data: DataPoint[] = [];
  const now = new Date();
  
  kpis.forEach(kpi => {
    const baseValue = getBaseValueForKPI(kpi);
    
    for (let i = 0; i < days * 24; i++) {
      const date = new Date(now.getTime() - (i * 60 * 60 * 1000));
      const hourOfDay = date.getHours();
      
      // Business hour variation
      const timeBasedLoad = hourOfDay >= 9 && hourOfDay <= 17 ? 1.2 : 0.8;
      const randomVariation = (Math.random() - 0.5) * 20;
      
      data.push({
        date: date.toISOString(),
        category: kpi,
        value: Math.max(0, Math.min(100, baseValue * timeBasedLoad + randomVariation))
      });
    }
  });
  
  return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};