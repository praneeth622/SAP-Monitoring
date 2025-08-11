import { DataPoint } from "@/types";

// Add global declaration for window object
declare global {
  interface Window {
    clearChartCaches?: () => void;
    forceRefreshTimestamp?: number;
  }
}

// Define the cache structure
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Cache store
const cache: Record<string, CacheItem<any>> = {};

// Default expiration time (in milliseconds) - 5 minutes
const DEFAULT_EXPIRATION = 5 * 60 * 1000;

/**
 * Get data from cache if it exists and is not expired
 * @param key The cache key
 * @returns The cached data or null if not found or expired
 */
export function getCachedData<T>(key: string): T | null {
  const item = cache[key];
  if (!item) return null;

  // Check if the item has expired
  if (item.expiresAt < Date.now()) {
    // Delete the expired cache entry
    delete cache[key];
    return null;
  }

  return item.data;
}

/**
 * Store data in the cache
 * @param key The cache key
 * @param data The data to cache
 * @param expirationMs Time in milliseconds before the cache expires (optional)
 */
export function cacheData<T>(key: string, data: T, expirationMs: number = DEFAULT_EXPIRATION): void {
  const timestamp = Date.now();
  const expiresAt = timestamp + expirationMs;

  cache[key] = {
    data,
    timestamp,
    expiresAt
  };
}

/**
 * Create a cache key for KPI data fetch
 */
export function createKpiCacheKey(
  kpiName: string,
  monitoringArea: string,
  from: Date,
  to: Date,
  resolution: string
): string {
  // For date range, we'll use a rounded timestamp to allow for minor time differences
  const fromRounded = Math.floor(from.getTime() / 60000) * 60000; // Round to nearest minute
  const toRounded = Math.floor(to.getTime() / 60000) * 60000; // Round to nearest minute
  
  return `kpi-${kpiName}-${monitoringArea}-${fromRounded}-${toRounded}-${resolution}`;
}

/**
 * Create a cache key for template chart data
 */
export function createTemplateCacheKey(
  primaryKpi: string,
  correlationKpis: string[],
  monitoringArea: string,
  dateRange: { from: Date; to: Date } | Date,
  resolution: string
): string {
  let fromDate: Date, toDate: Date;
  
  if (dateRange && typeof dateRange === 'object' && 'from' in dateRange && 'to' in dateRange) {
    fromDate = dateRange.from;
    toDate = dateRange.to;
  } else if (dateRange instanceof Date) {
    toDate = dateRange;
    fromDate = new Date(toDate.getTime());
    fromDate.setDate(fromDate.getDate() - 7);
  } else {
    toDate = new Date();
    fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);
  }
  
  // Round dates to nearest minute
  const fromRounded = Math.floor(fromDate.getTime() / 60000) * 60000;
  const toRounded = Math.floor(toDate.getTime() / 60000) * 60000;
  
  // Sort correlation KPIs to ensure consistent key regardless of order
  const sortedKpis = [...correlationKpis].sort().join('-');
  
  return `template-${primaryKpi}-${sortedKpis}-${monitoringArea}-${fromRounded}-${toRounded}-${resolution}`;
}

/**
 * Clear cache entries with a specific resolution
 */
export function clearCacheByResolution(resolution: string): void {
  const keys = Object.keys(cache);
  const keysToRemove = keys.filter(key => key.includes(`-${resolution}`));
  
  console.log(`Clearing ${keysToRemove.length} cache entries for resolution ${resolution}`);
  
  keysToRemove.forEach(key => {
    delete cache[key];
  });
}

/**
 * Clear all cached data
 */
export function clearCache(): void {
  Object.keys(cache).forEach(key => delete cache[key]);
}

// Add the clearChartCaches function to window for global access
if (typeof window !== 'undefined') {
  window.clearChartCaches = () => {
    console.log("Clearing all chart caches to force data refresh");
    clearCache();
  };
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number, keys: string[] } {
  return {
    size: Object.keys(cache).length,
    keys: Object.keys(cache)
  };
}

/**
 * Debug function to log cache statistics for a specific resolution
 */
export function debugCacheForResolution(resolution: string): void {
  const keys = Object.keys(cache);
  const resolutionKeys = keys.filter(k => k.includes(`-${resolution}`));
  
  console.log(`Cache statistics for resolution ${resolution}:`);
  console.log(`- Total cache entries: ${keys.length}`);
  console.log(`- Entries for resolution ${resolution}: ${resolutionKeys.length}`);
  
  if (resolutionKeys.length > 0) {
    console.log('- Keys:');
    resolutionKeys.forEach(key => {
      const item = cache[key];
      const age = Math.round((Date.now() - item.timestamp) / 1000);
      const expiresIn = Math.round((item.expiresAt - Date.now()) / 1000);
      
      if (Array.isArray(item.data)) {
        console.log(`  - ${key}: ${item.data.length} data points, age: ${age}s, expires in: ${expiresIn}s`);
      } else {
        console.log(`  - ${key}: age: ${age}s, expires in: ${expiresIn}s`);
      }
    });
  }
} 