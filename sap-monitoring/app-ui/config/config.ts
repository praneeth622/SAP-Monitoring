// UI configuration
export const ui_attributes = {
  "sheet-width": 500,
};

// Global application variables
export const app_globals = {
  // User related
  default_user_id: "USER_TEST_1",
  user_access: {
    monitoring_areas: ["OS", "JOBS"], // Default monitoring areas user has access to
    kpi_groups: ["CPU", "MEMORY", "DISK", "NETWORK", "JOBS"], // Default KPI groups user has access to
    kpis: ["CPU_UTILIZATION", "MEMORY_USAGE", "DISK_USAGE", "NETWORK_TRAFFIC", "JOB_COUNT"], // Default KPIs user has access to
  },

  // API related
  base_url: "https://shwsckbvbt.a.pinggy.link",

  // System related
  default_system: "SWX",

  // Time settings (in milliseconds)
  api_timeout: 30000,
  refresh_interval: 60000,
};
