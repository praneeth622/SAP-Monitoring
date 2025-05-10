"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { DraggableChart } from "./DraggableChart";
import { DataPoint, ChartConfig } from "@/types";
import _ from "lodash";
import { DateRange } from "react-day-picker";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

import styles from "./TemplateChartStyles.module.css";

import { Button } from "@/components/ui/button";
import { Loader2, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DynamicLayoutProps {
  charts: ChartConfig[];
  activeKPIs?: Set<string> | string[]; // Make it optional and support both types
  kpiColors?: Record<string, { color: string; name: string; icon?: any }>; // Make icon optional
  globalDateRange?: DateRange | undefined;
  theme?: {
    name: string;
    colors: string[];
  };
  onLayoutChange?: (layout: Layout[]) => void;
  hideControls?: boolean;
  onDeleteGraph?: (id: string) => void;
  onEditGraph?: (id: string) => void; // Add this new prop
  resolution?: string; // Add resolution as a prop

  isTemplatePage?: boolean; // Add this prop for templates page detection

  onSaveLayout?: (layouts: Record<string, Layout[]>) => Promise<void>; // Add this new prop for saving layouts
  templateId?: string; // Add templateId to identify which template to update
  templateData?: any; // Add templateData to access template information
  useDynamicLayout?: boolean; // Add useDynamicLayout parameter with default false
  onLayoutReset?: (newLayout: Layout[]) => void; // Add this prop

}

// Add this helper function before the DynamicLayout component
const adjustLayoutForBreakpoint = (
  layout: Layout[],
  cols: number,
  widthFactor: number,
  breakpoint: string
): Layout[] => {
  return layout.map((item) => {
    const newWidth = Math.min(cols, Math.ceil(item.w * widthFactor));
    const newX = Math.min(cols - newWidth, Math.floor(item.x * widthFactor));
    
    // Special handling for different graph counts
    if (item.h <= 0) item.h = 4; // Ensure minimum height
    if (item.w <= 0) item.w = 4; // Ensure minimum width
    
    return {
      ...item,
      w: newWidth,
      x: newX,
      minW: Math.min(3, newWidth), // Ensure minW doesn't exceed width
      maxW: cols,                  // Limit maxW to available columns
      minH: 3,
      maxH: 12,
      isDraggable: true,
      isResizable: true,
    };
  });
};

// Add this helper function for optimal layout calculation
const calculateOptimalLayout = (
  charts: ChartConfig[],
  viewportHeight: number
): Layout[] => {
  // Calculate scaling factor based on viewport height
  const heightScaleFactor = viewportHeight > 0
    ? Math.min(1.5, Math.max(0.9, viewportHeight / 800))
    : 1;
  
  const numCharts = charts.length;
  let layoutConfig: Array<{x: number, y: number, w: number, h: number}> = [];
  
  // Use the same layout logic as in resetToDynamicLayout
  switch (numCharts) {
    case 1:
      layoutConfig = [
        { x: 0, y: 0, w: 12, h: Math.max(12, Math.round(18 * heightScaleFactor)) },
      ];
      break;
    case 2:
      const twoChartHeight = Math.max(6, Math.round(9 * heightScaleFactor));
      layoutConfig = [
        { x: 0, y: 0, w: 12, h: twoChartHeight },
        { x: 0, y: twoChartHeight, w: 12, h: twoChartHeight },
      ];
      break;
    case 3:
      const threeChartHeight = Math.max(5, Math.round(7 * heightScaleFactor));
      layoutConfig = [
        { x: 0, y: 0, w: 12, h: threeChartHeight },
        { x: 0, y: threeChartHeight, w: 12, h: threeChartHeight },
        { x: 0, y: threeChartHeight * 2, w: 12, h: threeChartHeight },
      ];
      break;
    case 4:
      const fourChartHeight = Math.max(5, Math.round(8 * heightScaleFactor));
      layoutConfig = [
        { x: 0, y: 0, w: 6, h: fourChartHeight },
        { x: 6, y: 0, w: 6, h: fourChartHeight },
        { x: 0, y: fourChartHeight, w: 6, h: fourChartHeight },
        { x: 6, y: fourChartHeight, w: 6, h: fourChartHeight },
      ];
      break;
    case 5:
      const fiveChartHeight = Math.max(6, Math.round(9 * heightScaleFactor));
      const row2Height = Math.max(5, Math.round(7 * heightScaleFactor));
      layoutConfig = [
        { x: 0, y: 0, w: 4, h: fiveChartHeight },
        { x: 4, y: 0, w: 4, h: fiveChartHeight },
        { x: 8, y: 0, w: 4, h: fiveChartHeight },
        { x: 0, y: fiveChartHeight, w: 6, h: row2Height },
        { x: 6, y: fiveChartHeight, w: 6, h: row2Height },
      ];
      break;
    case 6:
      const sixChartHeight = Math.max(6, Math.round(7.5 * heightScaleFactor));
      layoutConfig = [
        { x: 0, y: 0, w: 4, h: sixChartHeight },
        { x: 4, y: 0, w: 4, h: sixChartHeight },
        { x: 8, y: 0, w: 4, h: sixChartHeight },
        { x: 0, y: sixChartHeight, w: 4, h: sixChartHeight },
        { x: 4, y: sixChartHeight, w: 4, h: sixChartHeight },
        { x: 8, y: sixChartHeight, w: 4, h: sixChartHeight },
      ];
      break;
    case 7:
      const sevenChartHeight = Math.max(5, Math.round(6 * heightScaleFactor));
      const sevenBottomHeight = Math.max(5, Math.round(7 * heightScaleFactor));
      layoutConfig = [
        { x: 0, y: 0, w: 4, h: sevenChartHeight },
        { x: 4, y: 0, w: 4, h: sevenChartHeight },
        { x: 8, y: 0, w: 4, h: sevenChartHeight },
        { x: 0, y: sevenChartHeight, w: 4, h: sevenChartHeight },
        { x: 4, y: sevenChartHeight, w: 4, h: sevenChartHeight },
        { x: 8, y: sevenChartHeight, w: 4, h: sevenChartHeight },
        { x: 0, y: sevenChartHeight * 2, w: 12, h: sevenBottomHeight },
      ];
      break;
    case 8:
      const eightChartHeight = Math.max(4, Math.round(5 * heightScaleFactor));
      layoutConfig = [
        { x: 0, y: 0, w: 4, h: eightChartHeight },
        { x: 4, y: 0, w: 4, h: eightChartHeight },
        { x: 8, y: 0, w: 4, h: eightChartHeight },
        { x: 0, y: eightChartHeight, w: 4, h: eightChartHeight },
        { x: 4, y: eightChartHeight, w: 4, h: eightChartHeight },
        { x: 8, y: eightChartHeight, w: 4, h: eightChartHeight },
        { x: 0, y: eightChartHeight * 2, w: 6, h: eightChartHeight },
        { x: 6, y: eightChartHeight * 2, w: 6, h: eightChartHeight },
      ];
      break;
    case 9:
      const nineChartHeight = Math.max(5, Math.round(6 * heightScaleFactor));
      layoutConfig = [
        { x: 0, y: 0, w: 4, h: nineChartHeight },
        { x: 4, y: 0, w: 4, h: nineChartHeight },
        { x: 8, y: 0, w: 4, h: nineChartHeight },
        { x: 0, y: nineChartHeight, w: 4, h: nineChartHeight },
        { x: 4, y: nineChartHeight, w: 4, h: nineChartHeight },
        { x: 8, y: nineChartHeight, w: 4, h: nineChartHeight },
        { x: 0, y: nineChartHeight * 2, w: 4, h: nineChartHeight },
        { x: 4, y: nineChartHeight * 2, w: 4, h: nineChartHeight },
        { x: 8, y: nineChartHeight * 2, w: 4, h: nineChartHeight },
      ];
      break;
    default:
      const cols = 3;
      const width = 4;
      const height = Math.max(4, Math.round(6 * heightScaleFactor));
      
      for (let i = 0; i < numCharts; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        layoutConfig.push({
          x: col * width,
          y: row * height,
          w: width,
          h: height,
        });
      }
  }
  
  // Convert to Layout format
  return charts.map((chart, i) => {
    const position = i < layoutConfig.length 
      ? layoutConfig[i] 
      : { x: (i % 3) * 4, y: Math.floor(i / 3) * 5, w: 4, h: 5 };
    
    return {
      i: chart.id,
      x: position.x,
      y: position.y,
      w: position.w,
      h: position.h,
      minW: 3,
      maxW: 12,
      minH: 3,
      maxH: 12,
      isDraggable: true,
      isResizable: true,
    };
  });
};

export function DynamicLayout({
  charts,
  activeKPIs = new Set(),
  kpiColors = {},
  globalDateRange,
  theme,
  onLayoutChange,
  hideControls = false,
  onDeleteGraph,
  onEditGraph, // Add this new prop
  resolution = "auto", // Default to auto

  isTemplatePage = false, // Default to false

  onSaveLayout, // Add this new prop
  templateId, // Add templateId parameter
  templateData, // Add templateData parameter
  useDynamicLayout = false, // Add useDynamicLayout parameter with default false
  onLayoutReset, // Add this prop

}: DynamicLayoutProps) {
  // Define a proper type for layouts - a Record with breakpoint strings as keys and Layout arrays as values
  const [layouts, setLayouts] = useState<Record<string, Layout[]>>({});
  const [currentBreakpoint, setCurrentBreakpoint] = useState("lg");
  const [mounted, setMounted] = useState(false);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const layoutRef = useRef<Layout[]>([]);
  const [fullscreenChartId, setFullscreenChartId] = useState<string | null>(
    null
  );
  const prevThemeRef = useRef(theme);
  // Add viewport height state
  const [viewportHeight, setViewportHeight] = useState(0);
  const [rowHeight, setRowHeight] = useState(40);
  const containerRef = useRef<HTMLDivElement>(null);
  // Add state to track layout changes
  const [isLayoutModified, setIsLayoutModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Add a ref to store chart positions
  const chartPositionsRef = useRef<
    Record<string, { top_xy_pos: string; bottom_xy_pos: string }>
  >({});

  // Add state for base URL
  const [baseUrl, setBaseUrl] = useState<string>(
    process.env.NEXT_PUBLIC_API_URL || ""
  );

  // Add a ref to track previous charts length
  const prevChartsLengthRef = useRef<number>(charts.length);

  // Add a ref to track reset operation in progress
  const resetInProgressRef = useRef(false);

  // Initialize baseUrl from environment
  useEffect(() => {
    // Set base URL from environment or use a default
    setBaseUrl(process.env.NEXT_PUBLIC_API_URL || "");
  }, []);

  // Add a ref to track previous viewport dimensions to prevent redundant updates
  const prevDimensionsRef = useRef({ height: 0, rowHeight: 0 });
  const dimensionsDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Utilities for localStorage - MOVED UP before being used
  const getLocalStorageLayoutKey = useCallback((templateId: string | undefined) => {
    if (!templateId) return null;
    return `sap-monitor-layout-${templateId}`;
  }, []);

  // Function to save layouts to localStorage
  const saveLayoutToLocalStorage = useCallback((templateId: string | undefined, positions: Record<string, { top_xy_pos: string; bottom_xy_pos: string }>) => {
    if (!templateId) return;
    
    const key = getLocalStorageLayoutKey(templateId);
    if (!key) return;
    
    try {
      localStorage.setItem(key, JSON.stringify({
        timestamp: new Date().toISOString(),
        positions
      }));
      console.log("Layout saved to localStorage for template:", templateId);
    } catch (error) {
      console.error("Error saving layout to localStorage:", error);
    }
  }, [getLocalStorageLayoutKey]);

  // Function to retrieve layouts from localStorage
  const getLayoutFromLocalStorage = useCallback((templateId: string | undefined) => {
    if (!templateId) return null;
    
    const key = getLocalStorageLayoutKey(templateId);
    if (!key) return null;
    
    try {
      const savedData = localStorage.getItem(key);
      if (!savedData) return null;
      
      const parsedData = JSON.parse(savedData);
      console.log("Retrieved layout from localStorage for template:", templateId);
      return parsedData.positions;
    } catch (error) {
      console.error("Error retrieving layout from localStorage:", error);
      return null;
    }
  }, [getLocalStorageLayoutKey]);

  // Mount effect
  useEffect(() => {
    setMounted(true);
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Handle fullscreen toggle from child charts
  const handleFullscreenChange = useCallback(
    (chartId: string, isFullscreen: boolean) => {
      setFullscreenChartId(isFullscreen ? chartId : null);
    },
    []
  );

  // Enhanced theme change detection in DynamicLayout component
  useEffect(() => {
    if (theme && prevThemeRef.current !== theme) {
      console.log("Theme changed in DynamicLayout:", 
        prevThemeRef.current?.name, "->", theme?.name);
      
      prevThemeRef.current = theme;
      
      // Apply theme to chart kpiColors directly
      if (charts.length > 0) {
        charts.forEach(chart => {
          if (chart.kpiColors && chart.activeKPIs && theme?.colors) {
            const activeKpiArray = Array.from(chart.activeKPIs || []);
            
            // Apply theme colors to active KPIs
            activeKpiArray.forEach((kpi, index) => {
              if (chart.kpiColors && chart.kpiColors[kpi]) {
                chart.kpiColors[kpi].color = theme.colors[index % theme.colors.length];
              }
            });
          }
        });
      }
      
      // Force resize after theme application
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 50);
    }
  }, [theme, charts]);

// Enhanced theme application that directly modifies chart KPI colors
useEffect(() => {
  if (!charts || charts.length === 0 || !theme || !theme.colors) return;
  
  console.log("Applying theme colors to all charts:", theme.name);
  
  // Create a deep copy to avoid reference issues
  const updatedCharts = [...charts];
  let modified = false;
  
  // Apply theme colors to each chart's KPIs
  updatedCharts.forEach(chart => {
    if (!chart.kpiColors || !chart.activeKPIs) return;
    
    const activeKpiArray = Array.from(chart.activeKPIs);
    if (activeKpiArray.length === 0) return;
    
    // Update each KPI's color based on theme
    activeKpiArray.forEach((kpi, index) => {
      if (chart.kpiColors && chart.kpiColors[kpi] && typeof chart.kpiColors[kpi] === 'object') {
        // Compare to check if we need to update
        const currentColor = chart.kpiColors[kpi].color;
        const themeColor = theme.colors[index % theme.colors.length];
        
        if (currentColor !== themeColor) {
          // Important: create a new object to ensure React detects the change
          if (chart.kpiColors) {
            chart.kpiColors[kpi] = {
              ...chart.kpiColors[kpi],
              color: themeColor
            };
          }
          modified = true;
        }
      }
    });
  });
  
  if (modified) {
    // Trigger redraw of charts with updated colors
    console.log("Theme colors updated, triggering redraw");
    setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
    setTimeout(() => window.dispatchEvent(new Event("resize")), 200);
  }
}, [charts, theme]);

  // Add a flag to track if we've already initialized with saved layouts
  const [initializedWithSavedLayouts, setInitializedWithSavedLayouts] =
    useState(false);

  // Add state for protection against overriding saved layouts
  const [savedLayoutsLocked, setSavedLayoutsLocked] = useState(false);
  const savedLayoutsRef = useRef(false);

  // Modify the resetToDynamicLayout function to use the reset in progress ref
  const resetToDynamicLayout = useCallback(async () => {
    // Skip if a reset is already in progress
    if (resetInProgressRef.current) {
      console.log("Layout reset already in progress, skipping duplicate reset");
      return [];
    }

    try {
      resetInProgressRef.current = true;
    console.log("Resetting to dynamic layout");

    // Force unlock saved layouts
    savedLayoutsRef.current = false;
    setSavedLayoutsLocked(false);

    // Calculate scaling factor based on viewport height
    const heightScaleFactor = viewportHeight > 0
      ? Math.min(1.5, Math.max(0.9, viewportHeight / 800))
      : 1;
    
    const numCharts = charts.length;
      console.log(`Resetting layout for ${numCharts} charts with height factor ${heightScaleFactor}`);
    
    let layoutConfig: Array<{x: number, y: number, w: number, h: number}> = [];
    
      // Calculate layout based on number of charts - ensure all cases are covered
    switch (numCharts) {
      case 1:
          layoutConfig = [
            { x: 0, y: 0, w: 12, h: Math.max(12, Math.round(18 * heightScaleFactor)) }
          ];
        break;
        
      case 2:
        const twoChartHeight = Math.max(6, Math.round(9 * heightScaleFactor));
        layoutConfig = [
          { x: 0, y: 0, w: 12, h: twoChartHeight },
          { x: 0, y: twoChartHeight, w: 12, h: twoChartHeight }
        ];
        break;
        
      case 3:
        const threeChartHeight = Math.max(5, Math.round(7 * heightScaleFactor));
        layoutConfig = [
          { x: 0, y: 0, w: 12, h: threeChartHeight },
          { x: 0, y: threeChartHeight, w: 12, h: threeChartHeight },
          { x: 0, y: threeChartHeight * 2, w: 12, h: threeChartHeight }
        ];
        break;
        
      case 4:
        const fourChartHeight = Math.max(5, Math.round(8 * heightScaleFactor));
        layoutConfig = [
          { x: 0, y: 0, w: 6, h: fourChartHeight },
          { x: 6, y: 0, w: 6, h: fourChartHeight },
          { x: 0, y: fourChartHeight, w: 6, h: fourChartHeight },
          { x: 6, y: fourChartHeight, w: 6, h: fourChartHeight }
        ];
        break;
        
        case 5:
          const fiveChartHeight = Math.max(6, Math.round(9 * heightScaleFactor));
          const row2Height = Math.max(5, Math.round(7 * heightScaleFactor));
          layoutConfig = [
            { x: 0, y: 0, w: 4, h: fiveChartHeight },
            { x: 4, y: 0, w: 4, h: fiveChartHeight },
            { x: 8, y: 0, w: 4, h: fiveChartHeight },
            { x: 0, y: fiveChartHeight, w: 6, h: row2Height },
            { x: 6, y: fiveChartHeight, w: 6, h: row2Height }
          ];
          break;
        
        case 6:
          const sixChartHeight = Math.max(6, Math.round(7.5 * heightScaleFactor));
          layoutConfig = [
            { x: 0, y: 0, w: 4, h: sixChartHeight },
            { x: 4, y: 0, w: 4, h: sixChartHeight },
            { x: 8, y: 0, w: 4, h: sixChartHeight },
            { x: 0, y: sixChartHeight, w: 4, h: sixChartHeight },
            { x: 4, y: sixChartHeight, w: 4, h: sixChartHeight },
            { x: 8, y: sixChartHeight, w: 4, h: sixChartHeight }
          ];
          break;
        
        case 7:
          const sevenChartHeight = Math.max(5, Math.round(6 * heightScaleFactor));
          const sevenBottomHeight = Math.max(5, Math.round(7 * heightScaleFactor));
          layoutConfig = [
            { x: 0, y: 0, w: 4, h: sevenChartHeight },
            { x: 4, y: 0, w: 4, h: sevenChartHeight },
            { x: 8, y: 0, w: 4, h: sevenChartHeight },
            { x: 0, y: sevenChartHeight, w: 4, h: sevenChartHeight },
            { x: 4, y: sevenChartHeight, w: 4, h: sevenChartHeight },
            { x: 8, y: sevenChartHeight, w: 4, h: sevenChartHeight },
            { x: 0, y: sevenChartHeight * 2, w: 12, h: sevenBottomHeight }
          ];
          break;
        
        case 8:
          const eightChartHeight = Math.max(4, Math.round(5 * heightScaleFactor));
          layoutConfig = [
            { x: 0, y: 0, w: 4, h: eightChartHeight },
            { x: 4, y: 0, w: 4, h: eightChartHeight },
            { x: 8, y: 0, w: 4, h: eightChartHeight },
            { x: 0, y: eightChartHeight, w: 4, h: eightChartHeight },
            { x: 4, y: eightChartHeight, w: 4, h: eightChartHeight },
            { x: 8, y: eightChartHeight, w: 4, h: eightChartHeight },
            { x: 0, y: eightChartHeight * 2, w: 6, h: eightChartHeight },
            { x: 6, y: eightChartHeight * 2, w: 6, h: eightChartHeight }
          ];
          break;
        
        case 9:
          const nineChartHeight = Math.max(5, Math.round(6 * heightScaleFactor));
          layoutConfig = [
            { x: 0, y: 0, w: 4, h: nineChartHeight },
            { x: 4, y: 0, w: 4, h: nineChartHeight },
            { x: 8, y: 0, w: 4, h: nineChartHeight },
            { x: 0, y: nineChartHeight, w: 4, h: nineChartHeight },
            { x: 4, y: nineChartHeight, w: 4, h: nineChartHeight },
            { x: 8, y: nineChartHeight, w: 4, h: nineChartHeight },
            { x: 0, y: nineChartHeight * 2, w: 4, h: nineChartHeight },
            { x: 4, y: nineChartHeight * 2, w: 4, h: nineChartHeight },
            { x: 8, y: nineChartHeight * 2, w: 4, h: nineChartHeight }
          ];
          break;
        
      default:
          // For more than 9 charts, create a grid
        const cols = 3;
        const width = 4;
        const height = Math.max(4, Math.round(6 * heightScaleFactor));
        for (let i = 0; i < numCharts; i++) {
            const row = Math.floor(i / cols);
            const col = i % cols;
          layoutConfig.push({
              x: col * width,
              y: row * height,
            w: width,
            h: height
          });
        }
    }

      // Convert to Layout format - ensure each chart gets a layout from the config
    const newLayout = charts.map((chart, i) => {
      const position = i < layoutConfig.length 
        ? layoutConfig[i] 
        : { x: (i % 3) * 4, y: Math.floor(i / 3) * 5, w: 4, h: 5 };
      
      return {
        i: chart.id,
        x: position.x,
        y: position.y,
        w: position.w,
        h: position.h,
        minW: 3,
        maxW: 12,
        minH: 3,
        maxH: 12,
        isDraggable: true,
        isResizable: true,
      };
    });

    // Create layouts for all breakpoints
    const resetLayouts = {
      lg: newLayout,
      md: adjustLayoutForBreakpoint(newLayout, 9, 0.75, "md"),
      sm: adjustLayoutForBreakpoint(newLayout, 6, 0.5, "sm"),
      xs: adjustLayoutForBreakpoint(newLayout, 3, 0.33, "xs"),
      xxs: adjustLayoutForBreakpoint(newLayout, 2, 0.25, "xxs"),
    };
    
    // Update layouts and refs
    setLayouts(resetLayouts);
    layoutRef.current = newLayout;
    
      // Update the charts with the new layout if they don't already have one
    charts.forEach((chart, index) => {
      if (index < layoutConfig.length) {
        chart.layout = {
          x: layoutConfig[index].x,
          y: layoutConfig[index].y,
          w: layoutConfig[index].w,
          h: layoutConfig[index].h,
        };
      }
    });

    // Mark layout as modified
    setIsLayoutModified(true);

    // Force resize to ensure proper rendering
    setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
    setTimeout(() => window.dispatchEvent(new Event("resize")), 400);

    // Notify parent about layout reset
    if (onLayoutReset) {
      try {
        await onLayoutReset(newLayout);
      } catch (error) {
        console.error('Error in layout reset callback:', error);
        toast.error('Failed to save layout changes');
      }
    }

    toast.success("Layout reset to default");
      
      return newLayout;
    } finally {
      // Always reset the flag when done
      resetInProgressRef.current = false;
    }
  }, [charts, viewportHeight, onLayoutReset, toast]);

  // Modify the effect that monitors template changes
  useEffect(() => {
    if (!templateId || !mounted) return;

    // Function to check for template changes
    const checkTemplateChanges = async () => {
      const graphChangeInfo = localStorage.getItem('template-graph-change');
      if (!graphChangeInfo) return;

      try {
        const { templateId: changedTemplateId, needsReset, action, timestamp, changeId } = JSON.parse(graphChangeInfo);
        
        // Only process if it's for this template and needs reset
        if (changedTemplateId !== templateId || !needsReset) return;

        console.log(`Template graph ${action || 'change'} detected, resetting and saving layout`);
        
        // IMPORTANT: Immediately clear the change info from localStorage to prevent repeated processing
        localStorage.removeItem('template-graph-change');
        
        // Track if we've processed this change before to prevent duplicate handling
        const processedKey = `graph-change-processed-${changedTemplateId}`;
        const lastProcessed = localStorage.getItem(processedKey);
        
        // Check if we've already processed this exact change
        if (lastProcessed && changeId) {
          try {
            const processedData = JSON.parse(lastProcessed);
            if (processedData.changeId === changeId) {
              console.log("Already processed this exact change, skipping");
              return;
            }
          } catch (e) {
            // If parsing fails, proceed with the change
          }
        }
        
        // Mark this change as processed with current timestamp and change ID
        localStorage.setItem(processedKey, JSON.stringify({
          timestamp: new Date().toISOString(),
          changeId
        }));
        
        // Force unlock saved layouts
        savedLayoutsRef.current = false;
        setSavedLayoutsLocked(false);
        
        // Skip if reset is already in progress
        if (resetInProgressRef.current) {
          console.log("Reset already in progress, skipping template change handler");
          return;
        }
        
        // Reset layout
        await resetToDynamicLayout();

        // After reset, automatically save the new layout
        if (onSaveLayout && layouts) {
          try {
            await onSaveLayout(layouts);
            console.log('New layout saved after graph change');
            toast.success("Layout reset and saved successfully");
          } catch (error) {
            console.error('Error saving layout after reset:', error);
            toast.error('Failed to save layout after reset');
          }
        }
      } catch (error) {
        console.error('Error handling template changes:', error);
      }
    };

    // Check for changes when component mounts or template changes
    checkTemplateChanges();

  }, [templateId, mounted, resetToDynamicLayout, onSaveLayout, layouts]);

  // Modify the handleDeleteGraph function to ensure proper layout reset
  const handleDeleteGraph = useCallback(async (graphId: string) => {
    if (onDeleteGraph) {
      // Call the parent's delete handler
      onDeleteGraph(graphId);
      
      // Mark the graphs as deleted in localStorage to prevent automatic layout reset
      // from the charts.length effect - this prevents double layout reset
      if (templateId) {
        localStorage.setItem('graph-deletion-in-progress', templateId);
      }
      
      // Wait a bit for the state to update, but don't run the layout reset here
      // The layout reset will be triggered by the onDeleteGraph callback from the parent
      
      setTimeout(() => {
        // Clear the deletion marker after processing
        localStorage.removeItem('graph-deletion-in-progress');
      }, 500);
    }
  }, [onDeleteGraph, templateId]);

  // Update the effect that monitors charts length changes
  useEffect(() => {
    if (!mounted) return;
    
    const currentChartsLength = charts.length;
    
    // Check if we're in the middle of a deletion operation
    const deletionInProgress = localStorage.getItem('graph-deletion-in-progress');
    const isDeletingInThisTemplate = deletionInProgress === templateId;
    
    // Only trigger reset if charts length has changed and it's not the initial render
    // and we're not in the middle of a deletion operation
    if (mounted && prevChartsLengthRef.current !== null && 
        prevChartsLengthRef.current !== currentChartsLength && 
        !isDeletingInThisTemplate) {
      console.log(`Charts length changed from ${prevChartsLengthRef.current} to ${currentChartsLength}`);
      
      // Update the ref
      prevChartsLengthRef.current = currentChartsLength;

      // Check if we're in template mode and either this is a new template or has graph changes
      const graphChangeInfo = localStorage.getItem('template-graph-change');
      const isNewTemplate = !layoutRef.current.length;
      
      if (graphChangeInfo || isNewTemplate) {
        console.log("Applying automatic layout reset due to chart count change");
      
        // Apply dynamic layout
        resetToDynamicLayout();
          
        // If there's a save handler, save the new layout
        if (onSaveLayout && layouts) {
          onSaveLayout(layouts)
            .then(() => {
              // Clear the change info
              if (graphChangeInfo) localStorage.removeItem('template-graph-change');
              console.log('Layout saved after chart count change');
            })
            .catch(error => {
              console.error('Error saving layout after chart count change:', error);
            });
        }
      }
    } else if (prevChartsLengthRef.current === null) {
      // Initial render, just store the length
      prevChartsLengthRef.current = currentChartsLength;
      
      // If we're in template mode with no layout, initialize a dynamic layout
      if (templateId && (!layoutRef.current.length || useDynamicLayout)) {
        console.log("Applying initial dynamic layout for template");
        resetToDynamicLayout();
            }
          }
    
  }, [charts.length, mounted, resetToDynamicLayout, templateId, onSaveLayout, layouts, useDynamicLayout]);

  // Define the saveLayoutToAPI function before it's used
  const saveLayoutToAPI = useCallback(async () => {
    if (!templateId) {
      console.warn("No templateId provided, cannot save layout");
      return false;
    }

    try {
      // Get the current template data
      const currentTemplate = templateData;
      if (!currentTemplate) {
        console.warn("No template data available");
        return false;
      }

      // Prepare the graphs data with updated positions
      const updatedGraphs = charts.map((chart) => {
        // Find the corresponding graph in the template
        const templateGraph = currentTemplate.graphs.find(
          (g: { graph_id: string }) => g.graph_id === chart.id
        );
        if (!templateGraph) {
          console.warn(`No template data found for chart ${chart.id}`);
          return null;
        }

        // Get the current layout for this chart
        const currentLayout = layouts[currentBreakpoint]?.find(
          (l) => l.i === chart.id
        );
        if (!currentLayout) {
          console.warn(`No layout found for chart ${chart.id}`);
          return null;
        }

        // Calculate the positions (multiply by 10 as per API format)
        const topX = currentLayout.x * 10;
        const topY = currentLayout.y * 10;
        const bottomX = (currentLayout.x + currentLayout.w) * 10;
        const bottomY = (currentLayout.y + currentLayout.h) * 10;

        // Create the updated graph object
        return {
          ...templateGraph,
          top_xy_pos: `${topY}:${topX}`,
          bottom_xy_pos: `${bottomY}:${bottomX}`,
          frequency: templateGraph.frequency || "5m",
          resolution: templateGraph.resolution || "1d",
        };
      }).filter(Boolean);

      if (updatedGraphs.length === 0) {
        console.warn("No valid graphs to save");
        return false;
      }

      // Prepare the complete template payload
      const templatePayload = {
        user_id: "USER_TEST_1",
        template_id: templateId,
        template_name: currentTemplate.template_name,
        template_desc:
          currentTemplate.template_desc ||
          `${currentTemplate.template_name} Template`,
        default: currentTemplate.default || false,
        favorite: currentTemplate.favorite || false,
        frequency: currentTemplate.frequency || "5m",
        systems: currentTemplate.systems || [],
        graphs: updatedGraphs,
      };

      console.log("Saving template with payload:", templatePayload);

      // Send the data to the API
      const apiUrl = `${baseUrl || "https://shwsckbvbt.a.pinggy.link"}/api/ut`;
      const response = await axios.post(apiUrl, templatePayload);

      if (response.status >= 200 && response.status < 300) {
        console.log("Layout saved successfully:", response.data);
        return true;
      } else {
        console.error("Failed to save layout:", response.statusText);
        return false;
      }
    } catch (error) {
      console.error("Error saving layout to API:", error);
      throw error;
    }
  }, [templateId, templateData, charts, layouts, currentBreakpoint, baseUrl]);

  // Define handleLayoutChange before it's used
  const handleLayoutChange = useCallback(
    (layout: Layout[], allLayouts: any) => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        setLayouts(allLayouts);
        layoutRef.current = layout;

        // Calculate and store positions for each chart
        const updatedPositions: Record<
          string,
          { top_xy_pos: string; bottom_xy_pos: string }
        > = {};

        layout.forEach((item) => {
          const chart = charts.find((c) => c.id === item.i);
          if (chart) {
            // Calculate top and bottom positions
            const topY = item.y * 10; // Convert to API format (multiplied by 10)
            const topX = item.x * 10;
            const bottomY = (item.y + item.h) * 10;
            const bottomX = (item.x + item.w) * 10;

            // Format positions as required by API
            const topPosition = `${topY}:${topX}`;
            const bottomPosition = `${bottomY}:${bottomX}`;

            // Store positions in ref
            updatedPositions[chart.id] = {
              top_xy_pos: topPosition,
              bottom_xy_pos: bottomPosition,
            };
          }
        });

        // Update the ref with all positions
        chartPositionsRef.current = updatedPositions;

        // Save to localStorage automatically when layout changes
        saveLayoutToLocalStorage(templateId, updatedPositions);
        console.log("Layout saved to localStorage automatically");

        // Mark layout as modified (for the save button)
        setIsLayoutModified(true);
        
        // Call the original onLayoutChange if provided
        if (onLayoutChange) {
          onLayoutChange(layout);
        }
      }, 100);
    },
    [charts, templateId, saveLayoutToLocalStorage, onLayoutChange]
  );

  // Modify the determineIfHasSavedLayouts function after getLayoutFromLocalStorage is defined
  const determineIfHasSavedLayouts = useCallback(() => {
    // First check if we have localStorage layouts
    const localStorageLayout = getLayoutFromLocalStorage(templateId);
    if (localStorageLayout && Object.keys(localStorageLayout).length > 0) {
      console.log("Found layout in localStorage");
      return true;
    }

    // If useDynamicLayout is true, we should ignore saved layouts
    if (useDynamicLayout) {
      return false;
    }
    
    // Fall back to API-provided layouts
    return charts.some(chart => 
      chart.layout &&
      typeof chart.layout.x === 'number' && 
      typeof chart.layout.y === 'number' && 
      typeof chart.layout.w === 'number' && 
      typeof chart.layout.h === 'number' &&
      (chart.layout.w > 0 && chart.layout.h > 0) // Ensure we have valid non-zero sizes
    );
  }, [charts, useDynamicLayout, getLayoutFromLocalStorage, templateId]);

  // Modify the initialization effect to properly apply localStorage layouts on refresh
  useEffect(() => {
    // Skip if not mounted or if there are no charts
    if (!mounted || charts.length === 0) return;

    // Skip if we've already initialized with saved layouts
    if (initializedWithSavedLayouts) {
      console.log("LAYOUT INIT: Already initialized with saved layouts, skipping.");
      return;
    }

    // First check for localStorage layouts
    const localStoragePositions = getLayoutFromLocalStorage(templateId);
    
    if (localStoragePositions && Object.keys(localStoragePositions).length > 0) {
      console.log("LAYOUT INIT: Using layout from localStorage");
      
      // Map localStorage positions to layout format
      const storedLayout = charts.map((chart) => {
        const position = localStoragePositions[chart.id];
        if (!position) {
          // Fallback to default position
          return {
            i: chart.id,
            x: 0,
            y: 0,
            w: 6,
            h: 4,
            minW: 3,
            maxW: 12,
            minH: 4,
            maxH: 12,
            isDraggable: true,
            isResizable: true,
          };
        }
        
        // Parse positions from localStorage - fixing the 'any' type for n
        const [topY, topX] = position.top_xy_pos.split(':').map((n: string) => parseInt(n, 10));
        const [bottomY, bottomX] = position.bottom_xy_pos.split(':').map((n: string) => parseInt(n, 10));
        
        // Convert from API format (divide by 10)
        const x = topX / 10;
        const y = topY / 10;
        const w = (bottomX - topX) / 10;
        const h = (bottomY - topY) / 10;
        
        return {
          i: chart.id,
          x,
          y,
          w,
          h,
          minW: 3,
          maxW: 12,
          minH: 4,
          maxH: 12,
          isDraggable: true,
          isResizable: true,
        };
      });

      // Use the same adjustLayoutForBreakpoint function to create layouts for all breakpoints
      const adjustLayoutForBreakpoint = (
        layout: Layout[],
        cols: number,
        widthFactor: number,
        breakpoint: string
      ) => {
        return layout.map((item) => {
          const newWidth = Math.min(cols, Math.ceil(item.w * widthFactor));
          const newX = Math.min(
            cols - newWidth,
            Math.floor(item.x * widthFactor)
          );

          // Special handling for different graph counts
          if (
            charts.length === 3 &&
            (breakpoint === "xs" || breakpoint === "xxs")
          ) {
            return { ...item, w: cols, x: 0 };
          }

          return { ...item, w: newWidth, x: newX };
        });
      };

      // Set up layouts for all breakpoints
      const initialLayouts = {
        lg: storedLayout,
        md: adjustLayoutForBreakpoint(storedLayout, 9, 0.75, "md"),
        sm: adjustLayoutForBreakpoint(storedLayout, 6, 0.5, "sm"),
        xs: adjustLayoutForBreakpoint(storedLayout, 3, 0.33, "xs"),
        xxs: adjustLayoutForBreakpoint(storedLayout, 2, 0.25, "xxs"),
      };

      // Update layouts and refs with saved positions
      setLayouts(initialLayouts);
      layoutRef.current = storedLayout;
      
      // Also update chart positions ref for consistency
      chartPositionsRef.current = localStoragePositions;
      
      // Set saved layouts as locked to prevent overriding
      savedLayoutsRef.current = true;
      setSavedLayoutsLocked(true);
      
      // Mark that we've initialized
      setInitializedWithSavedLayouts(true);
      
      // Force a resize to ensure charts render correctly
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 200);
      
      return;
    }

    // If useDynamicLayout is true, always use dynamic layouts instead of API-provided layouts
    if (useDynamicLayout) {
      console.log("LAYOUT INIT: Using dynamic layout as specified by useDynamicLayout prop");
      // Force a reset to dynamic layout
      resetToDynamicLayout();
      setInitializedWithSavedLayouts(true);
      return;
    }

    // If no localStorage layout and not using dynamic, check for API-provided layouts
    const hasSavedAPILayouts = charts.some(chart => 
      chart.layout &&
      typeof chart.layout.x === 'number' && 
      typeof chart.layout.y === 'number' && 
      typeof chart.layout.w === 'number' && 
      typeof chart.layout.h === 'number' && 
      chart.layout.h > 0
    );

    if (hasSavedAPILayouts) {
      console.log("LAYOUT INIT: Initializing layouts from API position data");

      // Create a new layout array based on saved chart positions
      const initialLayout = charts.map((chart) => {
        // Use chart's saved layout if available
        const savedLayout = chart.layout || { x: 0, y: 0, w: 6, h: 4 };

        return {
          i: chart.id,
          x: savedLayout.x,
          y: savedLayout.y,
          w: savedLayout.w,
          h: savedLayout.h,
          minW: 3,
          maxW: 12,
          minH: 4,
          maxH: 12,
          isDraggable: true,
          isResizable: true,
        };
      });

      const adjustLayoutForBreakpoint = (
        layout: Layout[],
        cols: number,
        widthFactor: number,
        breakpoint: string
      ) => {
        return layout.map((item) => {
          const newWidth = Math.min(cols, Math.ceil(item.w * widthFactor));
          const newX = Math.min(
            cols - newWidth,
            Math.floor(item.x * widthFactor)
          );

          // Special handling for different graph counts
          if (
            charts.length === 3 &&
            (breakpoint === "xs" || breakpoint === "xxs")
          ) {
            return { ...item, w: cols, x: 0 };
          }

          return { ...item, w: newWidth, x: newX };
        });
      };

      // Set up layouts for all breakpoints
      const initialLayouts = {
        lg: initialLayout,
        md: adjustLayoutForBreakpoint(initialLayout, 9, 0.75, "md"),
        sm: adjustLayoutForBreakpoint(initialLayout, 6, 0.5, "sm"),
        xs: adjustLayoutForBreakpoint(initialLayout, 3, 0.33, "xs"),
        xxs: adjustLayoutForBreakpoint(initialLayout, 2, 0.25, "xxs"),
      };

      // Update layouts and refs with saved positions
      setLayouts(initialLayouts);
      layoutRef.current = initialLayout;

      // Calculate and update chart positions for API format
      const chartPositions: Record<
        string,
        { top_xy_pos: string; bottom_xy_pos: string }
      > = {};

      initialLayout.forEach((item) => {
        const chart = charts.find((c) => c.id === item.i);
        if (chart) {
          // Calculate top and bottom positions
          const topY = item.y * 10; // Convert to API format (multiplied by 10)
          const topX = item.x * 10;
          const bottomY = (item.y + item.h) * 10;
          const bottomX = (item.x + item.w) * 10;

          // Store in the required format
          chartPositions[chart.id] = {
            top_xy_pos: `${topY}:${topX}`,
            bottom_xy_pos: `${bottomY}:${bottomX}`,
          };
        }
      });
      // Update the positions ref
      chartPositionsRef.current = chartPositions;
      
      // Also save these positions to localStorage for future use
      saveLayoutToLocalStorage(templateId, chartPositions);

      // Set saved layouts as locked
      savedLayoutsRef.current = true;
      setSavedLayoutsLocked(true);
      
      // Mark that we've initialized
      setInitializedWithSavedLayouts(true);
      
      // Force a resize to ensure charts render correctly
      setTimeout(() => window.dispatchEvent(new Event("resize")), 200);
      
      return;
    }

    // If there are no saved layouts (neither localStorage nor API), use default dynamic layout
    console.log("LAYOUT INIT: No saved layouts found, using dynamic layout");
    resetToDynamicLayout();
    setInitializedWithSavedLayouts(true);
  }, [
    mounted, 
    charts, 
    initializedWithSavedLayouts, 
    useDynamicLayout, 
    resetToDynamicLayout, 
    getLayoutFromLocalStorage, 
    saveLayoutToLocalStorage,
    templateId
  ]);

  useEffect(() => {
    // Add global event handlers to disable text selection during resize/drag
    const disableSelection = (e: Event) => {
      document.body.classList.add('resizing-in-progress');
    };
    
    const enableSelection = (e: Event) => {
      // Use a small delay to ensure resize is fully complete
      setTimeout(() => {
        document.body.classList.remove('resizing-in-progress');
      }, 100);
    };
    
    // Use an event listener on the document to catch the start and end of resize events
    document.addEventListener('mousedown', (e) => {
      // Check if the click is on a resize handle
      if ((e.target as HTMLElement)?.classList?.contains('react-resizable-handle')) {
        disableSelection(e);
      }
    });
    
    document.addEventListener('mouseup', enableSelection);
    
    return () => {
      document.removeEventListener('mousedown', disableSelection);
      document.removeEventListener('mouseup', enableSelection);
    };
  }, []);

  if (!mounted) return null;

  // When in fullscreen mode, render just the fullscreen chart

  if (fullscreenChartId) {
    const fullscreenChart = charts.find((chart) => chart.id === fullscreenChartId);
    if (fullscreenChart) {
      return (
        <div className="relative w-full h-full">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-8"
          >
            <div className="w-[90vw] h-[85vh] max-w-[1600px] max-h-[900px] relative">
              <div className="bg-card rounded-lg shadow-xl border border-border overflow-hidden w-full h-full">
                <DraggableChart
                  id={fullscreenChart.id}
                  data={fullscreenChart.data}
                  type={fullscreenChart.type}
                  title={fullscreenChart.title}
                  width={fullscreenChart.width}
                  height={fullscreenChart.height}
                  activeKPIs={fullscreenChart.activeKPIs || activeKPIs}
                  kpiColors={fullscreenChart.kpiColors || kpiColors}
                  globalDateRange={globalDateRange}
                  theme={theme}
                  resolution={resolution}
                  className="h-full"
                  onFullscreenChange={handleFullscreenChange}
                  isFullscreenMode={true}
                  hideControls={fullscreenChart.hideControls || hideControls}
                  onDeleteGraph={handleDeleteGraph}
                  onEditGraph={onEditGraph}
                  isLoading={fullscreenChart.isLoading}
                />
              </div>

            </div>
          </motion.div>
        </div>
      );
    }
  }

  // Regular grid layout for non-fullscreen mode
  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        className="relative w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {charts.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            No charts to display. Please add some charts to your template.
          </div>
        )}

        <ResponsiveGridLayout
          className={cn(
            "layout", 
            isTemplatePage && styles.templatesPage,
            !isTemplatePage && styles.resizePrevention
          )}
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 992, sm: 768, xs: 576, xxs: 320 }}
          cols={{ lg: 12, md: 9, sm: 6, xs: 3, xxs: 2 }}
          rowHeight={rowHeight}
          margin={[6, 6]}
          containerPadding={[4, 4]}
          onLayoutChange={!isTemplatePage ? handleLayoutChange : undefined}
          onBreakpointChange={(breakpoint) => {
            setCurrentBreakpoint(breakpoint);
            // Force a resize to recalculate optimal layout
            window.dispatchEvent(new Event("resize"));

            
            // Skip custom layout manipulation if in template page
            if (isTemplatePage) return;
            

            // Special handling for 3 and 8 graphs to ensure proper layout on breakpoint change
            if (charts.length === 8) {
              setTimeout(() => {
                const layout = calculateOptimalLayout(charts, viewportHeight);

                // Create a specific layout based on the breakpoint for 8 graphs
                let customLayout;

                // Always use 3x3x2 layout for 8 graphs regardless of breakpoint
                const height = Math.max(4, Math.round(viewportHeight / 135));
                customLayout = charts.map((chart, i) => {
                  if (i < 3) {
                    // First row (3 charts)
                    return {
                      i: chart.id,
                      x: (i % 3) * 4,
                      y: 0,
                      w: 4,
                      h: height,
                      minW: 2,
                      minH: 3,
                    };
                  } else if (i < 6) {
                    // Second row (3 charts)
                    return {
                      i: chart.id,
                      x: ((i - 3) % 3) * 4,
                      y: height,
                      w: 4,
                      h: height,
                      minW: 2,
                      minH: 3,
                    };
                  } else {
                    // Bottom row (2 charts)
                    return {
                      i: chart.id,
                      x: ((i - 6) % 2) * 6,
                      y: height * 2,
                      w: 6,
                      h: height,
                      minW: 2,
                      minH: 3,
                    };
                  }
                });

                // Update the layouts with our custom layout
                if (customLayout) {
                  setLayouts((prev) => ({
                    ...prev,
                    [breakpoint]: customLayout,
                  }));

                  // Trigger resize events to ensure charts render properly
                  setTimeout(
                    () => window.dispatchEvent(new Event("resize")),
                    100
                  );
                  setTimeout(
                    () => window.dispatchEvent(new Event("resize")),
                    300
                  );
                }
              }, 150);
            } else if (charts.length === 3) {
              setTimeout(() => {
                const layout = calculateOptimalLayout(charts, viewportHeight);
                // Update the layout for the current breakpoint
                setLayouts((prev) => ({
                  ...prev,
                  [breakpoint]:
                    prev[breakpoint]?.map((item: Layout) => {
                      // Add null check before using find method on layout
                      const matchingLayout = layout && layout.find((l) => l.i === item.i);
                      if (matchingLayout) {
                        // Apply special positioning for small screens
                        if (breakpoint === "xs" || breakpoint === "xxs") {
                          return {
                            ...item,
                            w: breakpoint === "xxs" ? 2 : 3,
                            x: 0,
                          };
                        }
                        // Otherwise use the calculated optimal layout
                        return {
                          ...item,
                          ...matchingLayout,
                        };
                      }
                      return item;
                    }) || [],
                }));
              }, 100);
            }
          }}
          onResize={!isTemplatePage ? (layout, oldItem, newItem, placeholder, e, element) => {
            // Add resizing class to the element
            element.classList.add('resizing');
            
            // Force charts to rerender after resize events
            if (resizeTimeoutRef.current) {
              clearTimeout(resizeTimeoutRef.current);
            }
            resizeTimeoutRef.current = setTimeout(() => {
              window.dispatchEvent(new Event("resize"));
              
              // Remove resizing class after a delay
              setTimeout(() => {
                if (element && element.classList) {
                  element.classList.remove('resizing');
                }
              }, 100);
            }, 50);

          } : undefined}
          // Ensure we use the full height with vertical compaction

          verticalCompact={true}
          compactType="vertical"
          useCSSTransforms={true}
          isResizable={!isTemplatePage}
          isDraggable={!isTemplatePage}
          draggableHandle=".chart-drag-handle"
          preventCollision={false}
          measureBeforeMount={false}
          autoSize={true}
          key={`grid-${charts.length}-${viewportHeight}-${rowHeight}-${currentBreakpoint}`}
          style={{
            padding: "0 4px",
            margin: "0 auto",
            maxWidth: "100%",
            width: "100%",
            height: "100%",
          }}
        >
          {charts.map((chart) => {
            return (
              <div
                key={chart.id}
                className={cn(
                  "bg-card rounded-lg shadow-sm border border-border overflow-hidden",
                  fullscreenChartId &&
                    chart.id !== fullscreenChartId &&
                    "opacity-0",
                  isTemplatePage && styles.templateChart
                )}
                style={isTemplatePage ? { resize: 'none' } : undefined}
              >
                <DraggableChart
                  id={chart.id}
                  data={chart.data}
                  type={chart.type}
                  title={chart.title}
                  width={chart.width}
                  height={chart.height}
                  activeKPIs={chart.activeKPIs || activeKPIs}
                  kpiColors={chart.kpiColors || kpiColors}
                  globalDateRange={globalDateRange}
                  theme={theme}
                  resolution={resolution}
                  className="h-full"
                  onFullscreenChange={handleFullscreenChange}
                  isFullscreenMode={chart.id === fullscreenChartId}
                  hideControls={chart.hideControls || hideControls}
                  onDeleteGraph={handleDeleteGraph}
                  onEditGraph={onEditGraph}
                  isLoading={chart.isLoading}
                  isTemplatePage={isTemplatePage}
                />
              </div>
            );
          })}
        </ResponsiveGridLayout>

        {isLayoutModified && !isTemplatePage && (
          <div className="fixed bottom-4 right-4 z-50 flex gap-2">
            <Button
              onClick={() => {
                // Always force dynamic layout on reset - clear saved layouts
                savedLayoutsRef.current = false;
                setSavedLayoutsLocked(false);
                
                const numCharts = charts.length;
                console.log("Reset Layout: Applying dynamic layout for", numCharts, "charts");
                
                // Calculate scaling factor based on viewport height
                const heightScaleFactor = viewportHeight > 0
                  ? Math.min(1.5, Math.max(0.9, viewportHeight / 800))
                  : 1;
                
                // Initialize layoutConfig array
                let layoutConfig: Array<{x: number, y: number, w: number, h: number}> = [];
                
                // Apply specific layout based on number of charts
                switch (numCharts) {
                  case 1:
                    layoutConfig = [
                      { x: 0, y: 0, w: 12, h: Math.max(12, Math.round(18 * heightScaleFactor)) },
                    ]; // Full width, taller for single chart
                    break;
                    
                  case 2:
                    const twoChartHeight = Math.max(6, Math.round(9 * heightScaleFactor));
                    layoutConfig = [
                      { x: 0, y: 0, w: 12, h: twoChartHeight }, // Two charts stacked
                      { x: 0, y: twoChartHeight, w: 12, h: twoChartHeight },
                    ];
                    break;
                    
                  case 3:
                    // For 3 charts, stacked vertically (one below the other)
                    const threeChartHeight = Math.max(5, Math.round(7 * heightScaleFactor));
                    layoutConfig = [
                      { x: 0, y: 0, w: 12, h: threeChartHeight }, // First chart takes full width
                      { x: 0, y: threeChartHeight, w: 12, h: threeChartHeight }, // Second chart below
                      { x: 0, y: threeChartHeight * 2, w: 12, h: threeChartHeight }, // Third chart at bottom
                    ];
                    break;
                    
                  case 4:
                    const fourChartHeight = Math.max(5, Math.round(8 * heightScaleFactor));
                    layoutConfig = [
                      { x: 0, y: 0, w: 6, h: fourChartHeight }, // 2x2 grid
                      { x: 6, y: 0, w: 6, h: fourChartHeight },
                      { x: 0, y: fourChartHeight, w: 6, h: fourChartHeight },
                      { x: 6, y: fourChartHeight, w: 6, h: fourChartHeight },
                    ];
                    break;
                    
                  case 5:
                    const fiveChartHeight = Math.max(6, Math.round(9 * heightScaleFactor));
                    const row2Height = Math.max(5, Math.round(7 * heightScaleFactor));
                    layoutConfig = [
                      { x: 0, y: 0, w: 4, h: fiveChartHeight }, // Top row of 3
                      { x: 4, y: 0, w: 4, h: fiveChartHeight },
                      { x: 8, y: 0, w: 4, h: fiveChartHeight },
                      { x: 0, y: fiveChartHeight, w: 6, h: row2Height }, // Bottom row of 2
                      { x: 6, y: fiveChartHeight, w: 6, h: row2Height },
                    ];
                    break;
                    
                  case 6:
                    const sixChartHeight = Math.max(6, Math.round(7.5 * heightScaleFactor));
                    layoutConfig = [
                      { x: 0, y: 0, w: 4, h: sixChartHeight }, // Two rows of three, equal size charts
                      { x: 4, y: 0, w: 4, h: sixChartHeight },
                      { x: 8, y: 0, w: 4, h: sixChartHeight },
                      { x: 0, y: sixChartHeight, w: 4, h: sixChartHeight },
                      { x: 4, y: sixChartHeight, w: 4, h: sixChartHeight },
                      { x: 8, y: sixChartHeight, w: 4, h: sixChartHeight },
                    ];
                    break;
                    
                  case 7:
                    const sevenChartHeight = Math.max(5, Math.round(6 * heightScaleFactor));
                    const sevenBottomHeight = Math.max(5, Math.round(7 * heightScaleFactor));
                    layoutConfig = [
                      { x: 0, y: 0, w: 4, h: sevenChartHeight },
                      { x: 4, y: 0, w: 4, h: sevenChartHeight },
                      { x: 8, y: 0, w: 4, h: sevenChartHeight },
                      { x: 0, y: sevenChartHeight, w: 4, h: sevenChartHeight },
                      { x: 4, y: sevenChartHeight, w: 4, h: sevenChartHeight },
                      { x: 8, y: sevenChartHeight, w: 4, h: sevenChartHeight },
                      { x: 0, y: sevenChartHeight * 2, w: 12, h: sevenBottomHeight },
                    ];
                    break;
                    
                  case 8:
                    // For 8 graphs, use 3x3x2 layout
                    const eightChartHeight = Math.max(4, Math.round(5 * heightScaleFactor));
                    
                    layoutConfig = [
                      // First row (3 charts)
                      { x: 0, y: 0, w: 4, h: eightChartHeight },
                      { x: 4, y: 0, w: 4, h: eightChartHeight },
                      { x: 8, y: 0, w: 4, h: eightChartHeight },
                      
                      // Second row (3 charts)
                      { x: 0, y: eightChartHeight, w: 4, h: eightChartHeight },
                      { x: 4, y: eightChartHeight, w: 4, h: eightChartHeight },
                      { x: 8, y: eightChartHeight, w: 4, h: eightChartHeight },
                      
                      // Third row (2 charts)
                      { x: 0, y: eightChartHeight * 2, w: 6, h: eightChartHeight },
                      { x: 6, y: eightChartHeight * 2, w: 6, h: eightChartHeight },
                    ];
                    break;
                    
                  case 9:
                    const nineChartHeight = Math.max(5, Math.round(6 * heightScaleFactor));
                    layoutConfig = [
                      { x: 0, y: 0, w: 4, h: nineChartHeight },
                      { x: 4, y: 0, w: 4, h: nineChartHeight },
                      { x: 8, y: 0, w: 4, h: nineChartHeight },
                      { x: 0, y: nineChartHeight, w: 4, h: nineChartHeight },
                      { x: 4, y: nineChartHeight, w: 4, h: nineChartHeight },
                      { x: 8, y: nineChartHeight, w: 4, h: nineChartHeight },
                      { x: 0, y: nineChartHeight * 2, w: 4, h: nineChartHeight },
                      { x: 4, y: nineChartHeight * 2, w: 4, h: nineChartHeight },
                      { x: 8, y: nineChartHeight * 2, w: 4, h: nineChartHeight },
                    ];
                    break;
                    
                  default:
                    // For more than 9 charts, calculate a grid layout
                    const cols = 3; // Use columns of width 4
                    const width = 4; // Fixed width
                    const height = Math.max(4, Math.round(6 * heightScaleFactor)); // Dynamically scaled height
                    
                    for (let i = 0; i < numCharts; i++) {
                      const row = Math.floor(i / cols);
                      const col = i % cols;
                      layoutConfig.push({
                        x: col * width,
                        y: row * height,
                        w: width,
                        h: height,
                      });
                    }
                }
                
                // Map the layout config to actual layout items with proper constraints
                const automaticLayout = charts.map((chart, i) => {
                  // Use the pre-calculated layout if available, or fall back to default
                  const position = i < layoutConfig.length 
                    ? layoutConfig[i] 
                    : { x: (i % 3) * 4, y: Math.floor(i / 3) * 5, w: 4, h: 5 };
                  
                  return {
                    i: chart.id,
                    x: position.x,
                    y: position.y,
                    w: position.w,
                    h: position.h,
                    minW: 3,
                    maxW: 12,
                    minH: 3,
                    maxH: 12,
                    isDraggable: true,
                    isResizable: true
                  };
                });
                
                // Helper function for adjusting layout for different breakpoints
                const adjustLayoutForBreakpoint = (
                  layout: Layout[],
                  cols: number,
                  widthFactor: number,
                  breakpoint: string
                ) => {
                  return layout.map((item) => {
                    const newWidth = Math.min(cols, Math.ceil(item.w * widthFactor));
                    const newX = Math.min(cols - newWidth, Math.floor(item.x * widthFactor));
                    
                    // Special handling for different graph counts
                    if (charts.length === 3 && (breakpoint === "xs" || breakpoint === "xxs")) {
                      return { ...item, w: cols, x: 0 };
                    }
                    
                    return { ...item, w: newWidth, x: newX };
                  });
                };
                
                // Create layouts for all breakpoints
                const resetLayouts = {
                  lg: automaticLayout,
                  md: adjustLayoutForBreakpoint(automaticLayout, 9, 0.75, "md"),
                  sm: adjustLayoutForBreakpoint(automaticLayout, 6, 0.5, "sm"),
                  xs: adjustLayoutForBreakpoint(automaticLayout, 3, 0.33, "xs"),
                  xxs: adjustLayoutForBreakpoint(automaticLayout, 2, 0.25, "xxs"),
                };
                
                // Update layouts state
                setLayouts(resetLayouts);
                layoutRef.current = automaticLayout;
                
                // Update the chart objects with new layout values to ensure consistency
                charts.forEach((chart, index) => {
                  if (index < layoutConfig.length) {
                    // Update each chart's layout property with the new dynamic layout
                    chart.layout = {
                      x: layoutConfig[index].x,
                      y: layoutConfig[index].y,
                      w: layoutConfig[index].w,
                      h: layoutConfig[index].h
                    };
                  }
                });
                
                // Force multiple resize events to ensure charts render correctly
                setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
                setTimeout(() => window.dispatchEvent(new Event("resize")), 300);
                setTimeout(() => window.dispatchEvent(new Event("resize")), 600);
                
                // Mark layout as modified so it can be saved
                setIsLayoutModified(true);
                
                // Do NOT re-lock layouts after reset to ensure dynamic layout stays applied
                
                toast.success("Layout reset to default");
              }}
              variant="outline"
              className="bg-background/90"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Layout
            </Button>
            
            <Button
              onClick={async () => {
                setIsSaving(true);
                try {
                  // First try the custom onSaveLayout prop if provided
                  if (onSaveLayout) {
                    await onSaveLayout(layouts);
                  }

                  // Then save to API
                  const apiSaveResult = await saveLayoutToAPI();

                  if (apiSaveResult) {
                    toast.success("Layout saved successfully!");
                    setIsLayoutModified(false);
                  } else {
                    // Only show error if the API save failed and onSaveLayout wasn't provided
                    if (!onSaveLayout) {
                      toast.error("Failed to save layout to server.");
                    }
                  }
                } catch (error) {
                  console.error("Error saving layout:", error);
                  toast.error(
                    "Failed to save layout: " +
                      (error instanceof Error ? error.message : "Unknown error")
                  );
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isSaving ? "Saving..." : "Save Layout"}
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
