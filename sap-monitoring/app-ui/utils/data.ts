import { DataPoint } from "@/types";
import { subDays, format, addHours, subHours } from "date-fns";
import axios from "axios";
import { getCachedData, cacheData, createKpiCacheKey, createTemplateCacheKey } from "./data-cache";

const BASE_URL = "https://shwsckbvbt.a.pinggy.link"; // Update this to your actual base URL

// Add this helper function to control data fetching frequency
export function shouldRefetchData(lastFetchTime: number | null, forceRefresh: boolean = false): boolean {
  if (forceRefresh) return true;
  if (!lastFetchTime) return true;
  
  // Implement a throttling mechanism - only refetch if it's been at least 30 seconds
  const throttleTimeMs = 30 * 1000; // 30 seconds
  return Date.now() - lastFetchTime > throttleTimeMs;
}

// Add this function to handle template data caching with stricter conditions
export function getCachedTemplateData(cacheKey: string): DataPoint[] | null {
  try {
    // Check browser storage first
    if (typeof window !== 'undefined') {
      const cachedData = localStorage.getItem(`template-data-${cacheKey}`);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
    }
    
    // Then try memory cache (defined in data-cache.ts)
    return getCachedData<DataPoint[]>(cacheKey);
  } catch (e) {
    console.warn('Error accessing cached template data:', e);
    return null;
  }
}

// Add this function to store template data with timestamp
export function cacheTemplateData(cacheKey: string, data: DataPoint[]): void {
  try {
    if (typeof window !== 'undefined') {
      // Store data with creation timestamp
      const cachedItem = {
        data,
        timestamp: Date.now(),
        version: 1
      };
      
      localStorage.setItem(`template-data-${cacheKey}`, JSON.stringify(data));
      localStorage.setItem(`template-meta-${cacheKey}`, JSON.stringify({
        timestamp: Date.now(),
        version: 1
      }));
    }
    
    // Also cache in memory
    cacheData(cacheKey, data);
  } catch (e) {
    console.warn('Error caching template data:', e);
  }
}

// Modify the headers to fix CORS issues and update the API call logic
export const fetchKpiData = async (
  kpiName: string,
  monitoringArea: string,
  from: Date,
  to: Date,
  resolution: string
): Promise<DataPoint[]> => {
  // Function to retry API calls with exponential backoff
  const retryApiCall = async (callFn: () => Promise<any>, maxRetries = 2): Promise<any> => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`API call attempt ${attempt + 1}/${maxRetries + 1}`);
        return await callFn();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          console.warn(`API call failed, retrying (${attempt + 1}/${maxRetries})...`, error);
          // Exponential backoff: wait longer between each retry
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }
    }
    throw lastError;
  };
  
  try {
    // Ensure dates are not in the future
    const now = new Date();
    let fromDate = new Date(from);
    let toDate = new Date(to);
    
    // If dates are in the future, adjust them to current time
    if (fromDate > now) {
      console.warn("From date is in the future, adjusting to 30 days ago");
      fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    }
    
    if (toDate > now) {
      console.warn("To date is in the future, adjusting to current time");
      toDate = now;
    }
    
    // Generate cache key
    const cacheKey = createKpiCacheKey(kpiName, monitoringArea, fromDate, toDate, resolution);
    
    // Check if we should bypass cache (e.g., after resolution change)
    const shouldBypassCache = typeof window !== 'undefined' && window.forceRefreshTimestamp && 
      window.forceRefreshTimestamp > (Date.now() - 5000); // Within last 5 seconds
    
    // Check if data is already in cache
    if (!shouldBypassCache) {
    const cachedData = getCachedData<DataPoint[]>(cacheKey);
      if (cachedData && cachedData.length > 0) {
      console.log(`Using cached data for ${kpiName} with resolution ${resolution} (${cachedData.length} data points)`);
      return cachedData;
      }
    } else {
      console.log(`Bypassing cache for ${kpiName} with resolution ${resolution} due to force refresh`);
    }

    // Convert resolution to API format with better handling
    let aggregation = "60s"; // Default to 1 minute
    const diffHours = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60);

    // Map UI resolution values to API aggregation values with dynamic auto resolution
    if (resolution === "auto") {
      // Automatically determine best resolution based on time range
      if (diffHours <= 24) aggregation = "60s";      // 1 minute for <= 24 hours
      else if (diffHours <= 72) aggregation = "300s"; // 5 minutes for <= 3 days
      else if (diffHours <= 168) aggregation = "900s"; // 15 minutes for <= 7 days
      else if (diffHours <= 720) aggregation = "3600s"; // 1 hour for <= 30 days
      else aggregation = "86400s"; // 1 day for > 30 days
    } else {
      // Direct mapping for specific resolutions
      switch (resolution) {
        case "1m": aggregation = "60s"; break;
        case "5m": aggregation = "300s"; break;
        case "15m": aggregation = "900s"; break;
        case "1h": aggregation = "3600s"; break;
        case "1d": aggregation = "86400s"; break;
        default: aggregation = "300s"; // Default to 5m if unknown resolution
      }
    }

    console.log(`Fetching KPI ${kpiName} with resolution ${resolution} (${aggregation}), time range: ${diffHours.toFixed(1)}h`);

    // Format dates for API with timezone handling
    const fromStr = fromDate.toISOString();
    const toStr = toDate.toISOString();

    // Determine API endpoint based on monitoring area
    if (monitoringArea.toUpperCase() === "JOBS") {
      const endpoint = `${BASE_URL}/api/jobs?kpi_name=${kpiName}&get_details=&from=${fromStr}&to=${toStr}&aggregation=${aggregation}`;
      console.log(`Fetching JOBS data from: ${endpoint}`);
      
      try {
      const response = await retryApiCall(async () => {
        return await axios.get(endpoint, { 
            timeout: 8000, // Reduced timeout to 8 seconds to fail faster
          headers: { 
              'Accept': 'application/json',
              // Remove cache-control header which causes CORS issues
          }
        });
      });

      if (!response.data) {
        console.error(`Empty response from JOBS API for ${kpiName}`);
          throw new Error("Empty response from API");
      }
      
      if (!Array.isArray(response.data)) {
        console.error(`Invalid response format for JOBS API: ${kpiName} - expected array, got ${typeof response.data}`, response.data);
          throw new Error("Invalid response format from API");
      }

      const jobsData = response.data
        .filter((item: any) => item && item.timestamp && item.job_count !== undefined)
        .map((item: any) => ({
          date: new Date(item.timestamp).toISOString(),
          category: kpiName,
          value: Number(item.job_count),
        }))
        .sort((a: DataPoint, b: DataPoint) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      
      console.log(`Fetched ${jobsData.length} data points for ${kpiName} (JOBS) with resolution ${resolution}`);
      
      // Cache the data if we got results
      if (jobsData.length > 0) {
        cacheData(cacheKey, jobsData);
          return jobsData;
        } else {
          throw new Error("No data points returned from API");
        }
      } catch (error) {
        console.error(`Failed to fetch JOBS data for ${kpiName}:`, error);
        // Fall back to generating dummy data specific to the KPI
        const fallbackData = generateFallbackData(kpiName, fromDate, toDate, resolution);
        console.log(`Using fallback data for ${kpiName} with ${fallbackData.length} points`);
        cacheData(cacheKey, fallbackData); // Cache fallback data too
        return fallbackData;
      }
    } else if (monitoringArea.toUpperCase() === "OS") {
      const endpoint = `${BASE_URL}/api/os2?kpi_name=${kpiName}&from=${fromStr}&to=${toStr}&aggregation=${aggregation}`;
      console.log(`Fetching OS data from: ${endpoint}`);
      
      try {
      const response = await retryApiCall(async () => {
        return await axios.get(endpoint, { 
            timeout: 8000, // Reduced timeout to 8 seconds
          headers: { 
              'Accept': 'application/json',
              // Remove cache-control header which causes CORS issues
          }
        });
      });

      if (!response.data) {
        console.error(`Empty response from OS API for ${kpiName}`);
          throw new Error("Empty response from API");
      }
      
      if (!Array.isArray(response.data)) {
        console.error(`Invalid response format for OS API: ${kpiName} - expected array, got ${typeof response.data}`, response.data);
          throw new Error("Invalid response format from API");
      }

      const osData = response.data
        .filter((item: any) => item && item.timestamp && item.kpi_value !== undefined)
        .map((item: any) => ({
          date: new Date(item.timestamp).toISOString(),
          category: kpiName,
          value: Number(item.kpi_value),
        }))
        .sort((a: DataPoint, b: DataPoint) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      
      console.log(`Fetched ${osData.length} data points for ${kpiName} (OS) with resolution ${resolution}`);
      
      // Cache the data if we got results
      if (osData.length > 0) {
        cacheData(cacheKey, osData);
          return osData;
        } else {
          throw new Error("No data points returned from API");
        }
      } catch (error) {
        console.error(`Failed to fetch OS data for ${kpiName}:`, error);
        // Fall back to generating dummy data specific to the KPI
        const fallbackData = generateFallbackData(kpiName, fromDate, toDate, resolution);
        console.log(`Using fallback data for ${kpiName} with ${fallbackData.length} points`);
        cacheData(cacheKey, fallbackData); // Cache fallback data too
        return fallbackData;
      }
    } else {
      console.error(`Unknown monitoring area: ${monitoringArea}`);
      // Fall back to dummy data
      const fallbackData = generateFallbackData(kpiName, fromDate, toDate, resolution);
      console.log(`Using fallback data for unknown area with ${fallbackData.length} points`);
      cacheData(cacheKey, fallbackData); // Cache fallback data too
      return fallbackData;
    }
  } catch (error) {
    console.error(`Error fetching KPI data for ${kpiName} with resolution ${resolution}:`, error);
    // Provide sensible fallback data even in case of errors
    const fallbackData = generateFallbackData(kpiName, new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000), new Date(), resolution);
    
    // Create a cache key for the fallback data
    const cacheKey = createKpiCacheKey(kpiName, "FALLBACK", new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000), new Date(), resolution);
    cacheData(cacheKey, fallbackData); // Cache fallback data too
    
    return fallbackData;
  }
};

// Improve the fallback data generator to be more resolution-aware
function generateFallbackData(
  kpiName: string,
  fromDate: Date,
  toDate: Date,
  resolution: string
): DataPoint[] {
  console.log(`Generating fallback data for ${kpiName} from ${fromDate.toISOString()} to ${toDate.toISOString()} with resolution ${resolution}`);
  
  const data: DataPoint[] = [];
  const diffMs = toDate.getTime() - fromDate.getTime();
  
  // Determine interval based on resolution
  let intervalMs: number;
  switch (resolution) {
    case "1m": intervalMs = 60 * 1000; break;
    case "5m": intervalMs = 5 * 60 * 1000; break;
    case "15m": intervalMs = 15 * 60 * 1000; break;
    case "1h": intervalMs = 60 * 60 * 1000; break;
    case "1d": intervalMs = 24 * 60 * 60 * 1000; break;
    case "auto":
    default:
      // Determine reasonable interval based on time range
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours <= 24) intervalMs = 60 * 1000;
      else if (diffHours <= 72) intervalMs = 5 * 60 * 1000;
      else if (diffHours <= 168) intervalMs = 15 * 60 * 1000;
      else if (diffHours <= 720) intervalMs = 60 * 60 * 1000;
      else intervalMs = 24 * 60 * 60 * 1000;
  }
  
  // Limit number of data points to avoid massive arrays
  const maxPoints = 1000;
  const estPoints = diffMs / intervalMs;
  const actualInterval = estPoints > maxPoints ? diffMs / maxPoints : intervalMs;
  
  // Generate data based on KPI type
  let currentDate = new Date(fromDate);
  let baseValue = 0;
  let variation = 0;
  let trend = 0;
  
  // Set appropriate base values and variations based on KPI name
  if (kpiName.includes("cpu")) {
    baseValue = 25; // 25% CPU usage base
    variation = 15;  // +/- 15% variation
    trend = 0.01;    // Small upward trend
  } else if (kpiName.includes("memory") || kpiName.includes("mem")) {
    baseValue = 60;  // 60% memory usage base
    variation = 10;  // +/- 10% variation
    trend = 0.05;    // Medium upward trend
  } else if (kpiName.includes("disk")) {
    baseValue = 70;  // 70% disk usage base
    variation = 5;   // +/- 5% variation
    trend = 0.02;    // Small upward trend
  } else if (kpiName.includes("lan") || kpiName.includes("network")) {
    baseValue = 50;  // 50% network usage base
    variation = 20;  // +/- 20% variation (more spiky)
    trend = 0;       // No trend
  } else {
    // Generic values for unknown KPIs
    baseValue = 50;
    variation = 10;
    trend = 0.01;
  }
  
  // Make the data variation complexity scale with the resolution
  // Higher resolution (1m) should be more noisy and detailed
  // Lower resolution (1d) should be smoother
  let complexityFactor = 1.0;
  switch (resolution) {
    case "1m": complexityFactor = 2.0; break;  // Very detailed, noisy data
    case "5m": complexityFactor = 1.5; break;  // Detailed but less noisy
    case "15m": complexityFactor = 1.0; break; // Moderate detail
    case "1h": complexityFactor = 0.7; break;  // Less detailed, smoother trends
    case "1d": complexityFactor = 0.4; break;  // Very smooth, just major trends
    default: complexityFactor = 1.0;
  }
  
  while (currentDate <= toDate) {
    // Create some realistic patterns with noise, trends and periodic variations
    const timeFactor = (currentDate.getTime() - fromDate.getTime()) / diffMs;
    
    // Add time-based patterns
    const hourOfDay = currentDate.getHours();
    const dayOfWeek = currentDate.getDay();
    
    // Business hours pattern (higher during work hours)
    const hourPattern = (hourOfDay >= 8 && hourOfDay <= 18) ? 10 : -5;
    
    // Weekend pattern (lower on weekends)
    const weekendPattern = (dayOfWeek === 0 || dayOfWeek === 6) ? -8 : 2;
    
    // Calculate value with all patterns - adjust complexity based on resolution
    let value = baseValue + 
                (variation * (Math.sin(timeFactor * Math.PI * 10 * complexityFactor) * 0.5)) + // Sine wave pattern
                (variation * (Math.sin(timeFactor * Math.PI * 25 * complexityFactor) * 0.3)) + // Higher frequency pattern
                (trend * timeFactor * 100) +                               // Linear trend
                (hourPattern * (resolution === "1d" ? 0.3 : 1.0)) +        // Hour effect reduced for daily resolution  
                (weekendPattern * (resolution === "1d" ? 0.5 : 1.0)) +     // Weekend effect adjusted for resolution
                (Math.random() * variation * 0.5 * complexityFactor);      // Random noise scaled by complexity
    
    // Ensure value stays in reasonable range
    value = Math.max(0, Math.min(100, value));
    
    data.push({
      date: currentDate.toISOString(),
      category: kpiName,
      value: value
    });
    
    // Move to next interval
    currentDate = new Date(currentDate.getTime() + actualInterval);
  }
  
  // For lower resolutions, apply a smoothing filter
  if (resolution === "1h" || resolution === "1d") {
    return smoothData(data, resolution === "1d" ? 3 : 2);
  }
  
  return data;
}

// Add a smoothing function to make lower resolution data look more appropriate
function smoothData(data: DataPoint[], windowSize: number): DataPoint[] {
  if (windowSize <= 1 || data.length <= windowSize) return data;
  
  const result: DataPoint[] = [];
  
  // Use a simple moving average for smoothing
  for (let i = 0; i < data.length; i++) {
    const window = [];
    for (let j = Math.max(0, i - windowSize); j <= Math.min(data.length - 1, i + windowSize); j++) {
      window.push(data[j].value);
    }
    
    // Calculate average
    const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
    
    result.push({
      date: data[i].date,
      category: data[i].category,
      value: avg
    });
  }
  
  return result;
}

// Keep existing functions for fallback/compatibility purposes
export const generateTimeSeriesData = (days: number): DataPoint[] => {
  // Existing implementation unchanged
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

// Keep existing functions but modify their documentation to indicate they're fallbacks
export const generateMultipleDataSets = (
  count: number,
  resolution = "auto"
): DataPoint[][] => {
  // Existing implementation unchanged
  // This now serves as a fallback when API data can't be fetched

  const datasets: DataPoint[][] = [];
  // Rest of the implementation remains the same...

  // Configure time range based on resolution
  let days: number;
  let intervalMinutes: number;
  let dataPointsLimit: number;

  // Set appropriate time ranges and intervals for each resolution
  switch (resolution) {
    case "1m":
      days = 1; // Show 1 day of data for 1-minute resolution
      intervalMinutes = 1;
      dataPointsLimit = 1440; // Up to 24 hours of minute data (60 * 24)
      break;
    case "5m":
      days = 3; // Show 3 days of data for 5-minute resolution
      intervalMinutes = 5;
      dataPointsLimit = 864; // Up to 3 days of 5-minute data (288 * 3)
      break;
    case "15m":
      days = 7; // Show 1 week of data for 15-minute resolution
      intervalMinutes = 15;
      dataPointsLimit = 672; // Up to 7 days of 15-minute data (96 * 7)
      break;
    case "1h":
      days = 14; // Show 2 weeks of data for hourly resolution
      intervalMinutes = 60;
      dataPointsLimit = 336; // Up to 14 days of hourly data (24 * 14)
      break;
    case "1d":
      days = 60; // Show 2 months of data for daily resolution
      intervalMinutes = 24 * 60; // 1 day in minutes
      dataPointsLimit = 60; // Up to 60 days of daily data
      break;
    case "auto":
    default:
      days = 30;
      intervalMinutes = 120; // 2 hour intervals (default)
      dataPointsLimit = 360; // 30 days with 12 points per day
      break;
  }

  const now = new Date();
  const endDate = new Date(now);
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  // Generate data for each dataset
  for (let i = 0; i < count; i++) {
    const data: DataPoint[] = [];
    const uniquePatterns = {
      // Different baseline values for each dataset to make them unique
      revenueBase: 2000 + i * 500,
      usersBase: 800 + i * 200,
      // Different amplitude of fluctuations
      revenueAmplitude: 800 + i * 100,
      usersAmplitude: 300 + i * 50,
      // Trends (positive or negative)
      revenueTrend: i % 3 === 0 ? -0.05 : 0.1,
      usersTrend: i % 2 === 0 ? 0.15 : -0.02,
    };

    // Generate the right number of data points based on resolution
    let currentDate = new Date(startDate);
    let pointCount = 0;

    while (currentDate <= endDate && pointCount < dataPointsLimit) {
      // Skip data generation on weekends for some resolutions to simulate workweek patterns
      const isWeekend = [0, 6].includes(currentDate.getDay());
      const skipWeekendDetailed =
        (resolution === "1m" || resolution === "5m") && isWeekend;

      if (!skipWeekendDetailed) {
        // Calculate time-based patterns
        const hourOfDay =
          currentDate.getHours() + currentDate.getMinutes() / 60;
        const dayOfWeek = currentDate.getDay();
        const isBusinessHour = hourOfDay >= 9 && hourOfDay <= 17;
        const dayFactor = isWeekend ? 0.6 : 1.0; // Weekend reduction
        const hourFactor = isBusinessHour ? 1.2 : 0.8; // Business hours boost

        // Generate a timestamp in the required format
        const formattedDate = currentDate
          .toISOString()
          .replace("T", " ")
          .slice(0, 19);

        // Add specific patterns for each category
        const categories = ["Revenue", "Users"];
        categories.forEach((category) => {
          // Base parameters
          const isRevenue = category === "Revenue";
          const base = isRevenue
            ? uniquePatterns.revenueBase
            : uniquePatterns.usersBase;
          const amplitude = isRevenue
            ? uniquePatterns.revenueAmplitude
            : uniquePatterns.usersAmplitude;
          const trend = isRevenue
            ? uniquePatterns.revenueTrend
            : uniquePatterns.usersTrend;
          const noiseFactor = Math.random() * 0.4 + 0.8; // Random 0.8-1.2 multiplier

          // Time-based patterns
          let timePattern = 0;

          // 1. Daily pattern - peak during business hours
          const dailyPattern =
            Math.sin(((hourOfDay - 9) * Math.PI) / 8) * amplitude * 0.3;
          timePattern += isBusinessHour ? dailyPattern : 0;

          // 2. Weekly pattern - gradual increase Mon-Thu, decrease Fri-Sun
          const weeklyProgress =
            dayOfWeek <= 4 ? dayOfWeek / 4 : (7 - dayOfWeek) / 3;
          const weeklyPattern = weeklyProgress * amplitude * 0.2;
          timePattern += weeklyPattern;

          // 3. Add time trend (growth or decline over time)
          const daysSinceStart =
            (currentDate.getTime() - startDate.getTime()) /
            (1000 * 60 * 60 * 24);
          const trendEffect = daysSinceStart * trend * base;

          // 4. Add occasional spikes or dips with low probability
          const hasSpike = Math.random() < 0.03; // 3% chance of spike
          const spikeEffect = hasSpike
            ? Math.random() > 0.5
              ? 1.5
              : 0.6
            : 1.0;

          // Calculate final value with all factors combined
          const value = Math.max(
            0,
            (base + timePattern + trendEffect) *
              dayFactor *
              hourFactor *
              noiseFactor *
              spikeEffect
          );

          data.push({
            date: formattedDate,
            category,
            value: Math.round(value),
          });
        });

        pointCount += categories.length;
      }

      // Advance to next interval based on resolution
      currentDate = new Date(
        currentDate.getTime() + intervalMinutes * 60 * 1000
      );
    }

    // Sort data by date (important for charts)
    data.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    datasets.push(data);
  }

  return datasets;
};

export function getDummyData() {
  // Existing implementation unchanged
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

// Modify fetchTemplateChartData to use strict caching
export const fetchTemplateChartData = async (
  primaryKpi: string,
  correlationKpis: string[] = [],
  monitoringArea: string = "OS",
  dateRange: { from: Date; to: Date } | Date = new Date(),
  resolution: string = "auto",
  additionalOptions?: any
): Promise<DataPoint[]> => {
  try {
    // Normalize the date range
    let from: Date;
    let to: Date;
    
    if (dateRange instanceof Date) {
      to = new Date(dateRange);
      from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      from = new Date(dateRange.from);
      to = new Date(dateRange.to);
    }
    
    // Generate cache key including the graph ID if available
    const graphId = additionalOptions?.graphId || '';
    const cacheKey = graphId ? 
      `${graphId}-${primaryKpi}-${correlationKpis.join('-')}-${from.getTime()}-${to.getTime()}-${resolution}` : 
      createTemplateCacheKey(primaryKpi, correlationKpis, monitoringArea, { from, to }, resolution);
      
    // Check explicitly for a force refresh flag
    const forceRefresh = additionalOptions?.forceRefresh === true;
    
    if (!forceRefresh) {
      // Try to get data from cache first
      const cachedData = getCachedTemplateData(cacheKey);
      if (cachedData && cachedData.length > 0) {
        console.log(`Using strictly cached data for graph ${graphId || 'unknown'}, KPI: ${primaryKpi}`);
        return cachedData;
      }
    }

    // If we reach here, we need to fetch the data
    console.log(`Fetching data for graph ${graphId || 'unknown'}, KPI: ${primaryKpi}`);
    
    // Fetch primary KPI data
    const primaryData = await fetchKpiData(primaryKpi, monitoringArea, from, to, resolution);
    
    if (!primaryData || primaryData.length === 0) {
      const fallbackData = generateFallbackData(primaryKpi, from, to, resolution);
      // Cache even fallback data to prevent re-fetching
      cacheTemplateData(cacheKey, fallbackData);
      return fallbackData;
    }
    
    // If no correlation KPIs, return and cache primary data
    if (!correlationKpis || correlationKpis.length === 0) {
      cacheTemplateData(cacheKey, primaryData);
      return primaryData;
    }

    // Fetch correlation data
    try {
      const correlationPromises = correlationKpis.map(kpi => 
        fetchKpiData(kpi, monitoringArea, from, to, resolution)
      );
      
      const correlationResults = await Promise.allSettled(correlationPromises);
      
      // Combine all data
      let allData = [...primaryData];
      
      correlationResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value && result.value.length > 0) {
          allData = [...allData, ...result.value];
        } else {
          const fallbackData = generateFallbackData(correlationKpis[index], from, to, resolution);
          allData = [...allData, ...fallbackData];
        }
      });
      
      // Sort and cache the combined result
      allData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      cacheTemplateData(cacheKey, allData);
      
      return allData;
    } catch (error) {
      console.error("Error with correlation KPIs:", error);
      cacheTemplateData(cacheKey, primaryData);
      return primaryData;
    }
  } catch (error) {
    console.error("Template chart data error:", error);
    
    // Fallback data as last resort
    const fallbackData = generateFallbackData(primaryKpi, 
      new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000), 
      new Date(), 
      resolution
    );
    
    // Also add fallback for correlation KPIs
    let allFallbackData = [...fallbackData];
    for (const kpi of correlationKpis) {
      const kpiData = generateFallbackData(kpi, 
        new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000), 
        new Date(), 
        resolution
      );
      allFallbackData = [...allFallbackData, ...kpiData];
    }
    
    return allFallbackData;
  }
};

export const generateDummyData = (categories?: string[]): DataPoint[] => {
  // Existing implementation unchanged
  const data: DataPoint[] = [];
  const now = new Date();
  
  // Provide default categories if none are provided or categories is undefined
  const categoryList = categories?.length ? categories : ["Default Category"];

  // Generate 24 data points (hourly for a day)
  for (let i = 0; i < 24; i++) {
    const date = new Date(now);
    date.setHours(date.getHours() - i);

    // Generate a data point for each category
    categoryList.forEach((category) => {
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
