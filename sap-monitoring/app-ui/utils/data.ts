import { DataPoint } from "@/types";
import { subDays, format, addHours, subHours } from "date-fns";
import axios from "axios";

const BASE_URL = "https://shwsckbvbt.a.pinggy.link"; // Update this to your actual base URL

// New function to fetch KPI data from API
export const fetchKpiData = async (
  kpiName: string,
  monitoringArea: string,
  from: Date,
  to: Date,
  resolution: string
): Promise<DataPoint[]> => {
  try {
    // Convert resolution to API format
    let aggregation = "60s"; // Default to 1 minute

    // Map UI resolution values to API aggregation values
    switch (resolution) {
      case "1m":
        aggregation = "60s";
        break;
      case "5m":
        aggregation = "300s";
        break;
      case "15m":
        aggregation = "900s";
        break;
      case "1h":
        aggregation = "3600s";
        break;
      case "1d":
        aggregation = "86400s";
        break;
      case "auto":
        // For auto, calculate most appropriate resolution based on time range
        const diffHours = (to.getTime() - from.getTime()) / (1000 * 60 * 60);
        if (diffHours <= 24) aggregation = "60s";
        else if (diffHours <= 72) aggregation = "300s";
        else if (diffHours <= 168) aggregation = "900s";
        else if (diffHours <= 720) aggregation = "3600s";
        else aggregation = "86400s";
        break;
    }

    // Format dates for API
    const fromStr = from.toISOString();
    const toStr = to.toISOString();

    // Determine API endpoint based on monitoring area
    let endpoint = "";
    let response;

    if (monitoringArea.toUpperCase() === "JOBS") {
      endpoint = `${BASE_URL}/api/jobs?kpi_name=${kpiName}&from=${fromStr}&to=${toStr}&aggregation=${aggregation}`;
      response = await axios.get(endpoint);

      // Transform jobs API response to DataPoint format
      return response.data.map((item: any) => ({
        date: item.timestamp,
        category: kpiName,
        value: item.job_count,
      }));
    } else if (monitoringArea.toUpperCase() === "OS") {
      endpoint = `${BASE_URL}/api/os2?kpi_name=${kpiName}&from=${fromStr}&to=${toStr}&aggregation=${aggregation}`;
      response = await axios.get(endpoint);

      // Transform OS API response to DataPoint format
      return response.data.map((item: any) => ({
        date: item.timestamp,
        category: kpiName,
        value: item.kpi_value,
      }));
    } else {
      console.error(`Unknown monitoring area: ${monitoringArea}`);
      throw new Error(`Unknown monitoring area: ${monitoringArea}`);
    }
  } catch (error) {
    console.error(`Error fetching KPI data for ${kpiName}:`, error);
    // Return empty array on error to prevent application crashes
    return [];
  }
};

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

// Add this new function to handle actual API data fetching for templates
export const fetchTemplateChartData = async (
  primaryKpi: string,
  correlationKpis: string[],
  monitoringArea: string,
  dateRange: { from: Date; to: Date },
  resolution = "auto"
): Promise<DataPoint[]> => {
  try {
    // Start by getting the primary KPI data
    const primaryData = await fetchKpiData(
      primaryKpi,
      monitoringArea,
      dateRange.from,
      dateRange.to,
      resolution
    );

    // If we couldn't get primary data, return an empty array
    if (primaryData.length === 0) {
      return [];
    }

    // Next, get all correlation KPIs data
    const correlationPromises = correlationKpis.map((kpi) =>
      fetchKpiData(
        kpi,
        monitoringArea,
        dateRange.from,
        dateRange.to,
        resolution
      )
    );

    const correlationResults = await Promise.allSettled(correlationPromises);

    // Filter for successful results and combine all data
    let allData = [...primaryData];

    correlationResults.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.length > 0) {
        allData = [...allData, ...result.value];
      }
    });

    return allData;
  } catch (error) {
    console.error("Error fetching template chart data:", error);
    return [];
  }
};

export const generateDummyData = (categories: string[]): DataPoint[] => {
  // Existing implementation unchanged
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
