"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { DraggableChart } from "./DraggableChart";
import { DataPoint } from "@/types";
import _ from "lodash";
import { DateRange } from "react-day-picker";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2, Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface ChartConfig {
  id: string;
  data: DataPoint[];
  type: "line" | "bar";
  title: string;
  width: number;
  height: number;
  activeKPIs?: Set<string> | string[];
  kpiColors?: Record<string, { color: string; name: string; icon?: any }>;
  layout?: { x: number; y: number; w: number; h: number };
  hideControls?: boolean;
  onDeleteGraph?: (id: string) => void;
  isLoading?: boolean; // Add this line
}

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
  onSaveLayout?: (layouts: Record<string, Layout[]>) => Promise<void>; // Add this new prop for saving layouts
  templateId?: string; // Add templateId to identify which template to update
  templateData?: any; // Add templateData to access template information
  useDynamicLayout?: boolean; // Add useDynamicLayout parameter with default false
}

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
  onSaveLayout, // Add this new prop
  templateId, // Add templateId parameter
  templateData, // Add templateData parameter
  useDynamicLayout = false, // Add useDynamicLayout parameter with default false
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

  // Initialize baseUrl from environment
  useEffect(() => {
    // Set base URL from environment or use a default
    setBaseUrl(process.env.NEXT_PUBLIC_API_URL || "");
  }, []);

  // Add a ref to track previous viewport dimensions to prevent redundant updates
  const prevDimensionsRef = useRef({ height: 0, rowHeight: 0 });
  const dimensionsDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle fullscreen toggle from child charts
  const handleFullscreenChange = useCallback(
    (chartId: string, isFullscreen: boolean) => {
      setFullscreenChartId(isFullscreen ? chartId : null);
    },
    []
  );

  // Add theme change detection
  useEffect(() => {
    if (prevThemeRef.current !== theme) {
      prevThemeRef.current = theme;
      // Force a resize to ensure charts update properly
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 50);
    }
  }, [theme]);

  // Add a flag to track if we've already initialized with saved layouts
  const [initializedWithSavedLayouts, setInitializedWithSavedLayouts] =
    useState(false);

  // Add state for protection against overriding saved layouts
  const [savedLayoutsLocked, setSavedLayoutsLocked] = useState(false);
  const savedLayoutsRef = useRef(false);

  // Define resetToDynamicLayout before it's used in the useEffect
  const resetToDynamicLayout = useCallback(() => {
    console.log("Resetting to dynamic layout");
  
    // Unlock saved layouts to apply dynamic layout
    savedLayoutsRef.current = false;
    setSavedLayoutsLocked(false);
  
    // Calculate scaling factor based on viewport height
    const heightScaleFactor = viewportHeight > 0
      ? Math.min(1.5, Math.max(0.9, viewportHeight / 800))
      : 1;
    
    const numCharts = charts.length;
    let layoutConfig: Array<{x: number, y: number, w: number, h: number}> = [];
    
    // Apply the same layout logic as the Reset Layout button
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
    
    // Map to layout format
    const layout = charts.map((chart, i) => {
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
      lg: layout,
      md: adjustLayoutForBreakpoint(layout, 9, 0.75, "md"),
      sm: adjustLayoutForBreakpoint(layout, 6, 0.5, "sm"),
      xs: adjustLayoutForBreakpoint(layout, 3, 0.33, "xs"),
      xxs: adjustLayoutForBreakpoint(layout, 2, 0.25, "xxs"),
    };
    
    // Update layouts and refs
    setLayouts(resetLayouts);
    layoutRef.current = layout;
    
    // Update the charts with the new layout
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
  
    toast.success("Layout reset to default");
  }, [charts, viewportHeight, toast]);

  // Add a function to determine if we should use saved layouts
  const determineIfHasSavedLayouts = useCallback(() => {
    // If useDynamicLayout is true, we should ignore saved layouts
    if (useDynamicLayout) {
      return false;
    }
    
    return charts.some(chart => 
        chart.layout &&
      typeof chart.layout.x === 'number' && 
      typeof chart.layout.y === 'number' && 
      typeof chart.layout.w === 'number' && 
      typeof chart.layout.h === 'number' &&
      (chart.layout.w > 0 && chart.layout.h > 0) // Ensure we have valid non-zero sizes
    );
  }, [charts, useDynamicLayout]);

  // Enhanced function to calculate ideal chart height based on viewport and number of charts
  const calculateIdealChartHeight = useCallback(
    (numCharts: number) => {
      if (!viewportHeight) return 4; // Default if viewport height isn't available yet

      // Calculate optimal chart height based on viewport and number of charts
      // The goal is to fill the available vertical space completely
      // Apply a more conservative approach for 3 charts to prevent overly tall charts
      let divisor = Math.ceil(numCharts / 3);

      // Apply special handling for small chart counts
      if (numCharts <= 3) {
        // For 1-3 charts, use a more moderate height calculation
        divisor = Math.max(1.5, divisor);
      }

      const optimalHeight = Math.max(
        4,
        Math.min(12, Math.floor(viewportHeight / (rowHeight * 1.2) / divisor))
      );

      // Only log when debugging is needed
      // console.log(`Calculated optimal height for ${numCharts} charts: ${optimalHeight} rows`);
      return optimalHeight;
    },
    [viewportHeight, rowHeight]
  );

  // Update the calculateOptimalLayout function to properly handle different numbers of charts
  const calculateOptimalLayout = useCallback(() => {
    // If saved layouts are locked AND useDynamicLayout is false, use those instead of calculating new ones
    if (savedLayoutsRef.current && !useDynamicLayout) {
      console.log("Using saved layouts instead of calculating dynamic layout");

      // Return the layouts based on saved positions in chart.layout
      return charts.map((chart) => {
        // Use chart's saved layout or a default fallback
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
    }

    console.log("Calculating dynamic layout based on", charts.length, "charts");
    
    // Calculate layout dynamically based on number of charts
    const numCharts = charts.length;

    // Calculate scaling factor based on viewport height
    const heightScaleFactor = viewportHeight > 0
      ? Math.min(1.5, Math.max(0.9, viewportHeight / 800))
      : 1;

    // Use specific layout configurations based on number of charts
    let layoutConfig = [];

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
          { x: 0, y: 0, w: 4, h: sevenChartHeight }, // Top row of 3
          { x: 4, y: 0, w: 4, h: sevenChartHeight },
          { x: 8, y: 0, w: 4, h: sevenChartHeight },
          { x: 0, y: sevenChartHeight, w: 4, h: sevenChartHeight }, // Middle row of 3
          { x: 4, y: sevenChartHeight, w: 4, h: sevenChartHeight },
          { x: 8, y: sevenChartHeight, w: 4, h: sevenChartHeight },
          { x: 0, y: sevenChartHeight * 2, w: 12, h: sevenBottomHeight }, // Bottom row of 1 (wider)
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
          { x: 0, y: 0, w: 4, h: nineChartHeight }, // 3x3 grid
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

    // Map layout config to actual chart items
    return charts.map((chart, i) => {
      // Use the pre-calculated layout if available, or fall back to default
      const position = i < layoutConfig.length 
        ? layoutConfig[i] 
        : { x: (i % 3) * 4, y: Math.floor(i / 3) * 5, w: 4, h: 5 };

      // Create the layout item with constraints
      return {
        i: chart.id,
        x: position.x,
        y: position.y,
        w: position.w,
        h: position.h,
        minW: 3,
        maxW: 12,
        minH: 4,
        maxH: 12,
        isDraggable: true,
        isResizable: true,
      };
    });
  }, [charts, viewportHeight, savedLayoutsLocked, calculateIdealChartHeight]);

  // Initialize layouts only once on mount or when charts change
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      return;
    }
    
    // Skip if we have no charts
    if (charts.length === 0) return;
    
    // Check if charts have saved layouts
    const hasSavedLayouts = determineIfHasSavedLayouts();
    
    // Update our saved layouts flag
    if (hasSavedLayouts && !savedLayoutsLocked) {
      console.log("Charts have saved layouts. Locking to prevent dynamic layout overrides.");
      setSavedLayoutsLocked(true);
      savedLayoutsRef.current = true;
    } else if (!hasSavedLayouts && savedLayoutsLocked) {
      console.log("No saved layouts found. Unlocking to allow dynamic layout.");
      setSavedLayoutsLocked(false);
      savedLayoutsRef.current = false;
    }
    
    // Always calculate layout (it will respect the lock if needed)
    const layout = calculateOptimalLayout();
    
    // Helper function for adjusting layout for different breakpoints
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
        if (charts.length === 3 && (breakpoint === "xs" || breakpoint === "xxs")) {
          return { ...item, w: cols, x: 0 };
        }

        return { ...item, w: newWidth, x: newX };
      });
    };
    
    const initialLayouts = {
      lg: layout,
      md: adjustLayoutForBreakpoint(layout, 9, 0.75, "md"),
      sm: adjustLayoutForBreakpoint(layout, 6, 0.5, "sm"),
      xs: adjustLayoutForBreakpoint(layout, 3, 0.33, "xs"),
      xxs: adjustLayoutForBreakpoint(layout, 2, 0.25, "xxs"),
    };
    
    setLayouts(initialLayouts);
    layoutRef.current = layout;
    
    // Force resize to properly render
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }
    
    resizeTimeoutRef.current = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100);
    
    // Schedule another resize to ensure everything renders correctly
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 300);
    
  }, [calculateOptimalLayout, mounted, charts, determineIfHasSavedLayouts, savedLayoutsLocked]);

  // Cleanup function
  useEffect(() => {
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Debounced layout change handler
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

            // For debugging
            console.log(`Chart ${chart.id} positions:`, {
              top_xy_pos: topPosition,
              bottom_xy_pos: bottomPosition,
            });
          }
        });

        // Update the ref with all positions
        chartPositionsRef.current = updatedPositions;

        // Mark layout as modified
        setIsLayoutModified(true);
      }, 100);
    },
    [charts]
  );

  // Get the fullscreen chart if one is set
  const fullscreenChart = fullscreenChartId
    ? charts.find((chart) => chart.id === fullscreenChartId)
    : null;

  // Improved viewport height detection with debounce to prevent multiple redundant updates
  useEffect(() => {
    // Debounced function to update viewport dimensions
    const debouncedUpdateViewportDimensions = () => {
      if (dimensionsDebounceTimerRef.current) {
        clearTimeout(dimensionsDebounceTimerRef.current);
      }

      dimensionsDebounceTimerRef.current = setTimeout(() => {
        // Get viewport height
        const height = window.innerHeight;
        const containerHeight = containerRef.current?.clientHeight || height;

        // Calculate available height (accounting for any other UI elements)
        const availableHeight = Math.max(containerHeight * 0.95, height * 0.8);

        // Calculate row height
        const calculatedRowHeight = Math.max(30, Math.min(50, height / 22));

        // Check if dimensions have actually changed to prevent redundant updates
        const hasHeightChanged =
          Math.abs(prevDimensionsRef.current.height - availableHeight) > 1;
        const hasRowHeightChanged =
          Math.abs(prevDimensionsRef.current.rowHeight - calculatedRowHeight) >
          0.5;

        if (hasHeightChanged || hasRowHeightChanged) {
          // Only update state when dimensions have actually changed
          setViewportHeight(availableHeight);
          setRowHeight(calculatedRowHeight);

          // Update reference for next comparison
          prevDimensionsRef.current = {
            height: availableHeight,
            rowHeight: calculatedRowHeight,
          };

          // Only log changes when they actually occur for debugging
          // console.log(`Viewport updated: height=${availableHeight}px, rowHeight=${calculatedRowHeight}px`);

          // Handle specific chart count layouts
          handleSpecificChartLayouts(availableHeight, calculatedRowHeight);
        }
      }, 100);
    };

    // Function to handle layouts for specific chart counts
    const handleSpecificChartLayouts = (
      availableHeight: number,
      calculatedRowHeight: number
    ) => {
      // Ensure layout updates properly after resize
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      // For the special case of 8 graphs, ensure proper layout
      if (charts.length === 8) {
        resizeTimeoutRef.current = setTimeout(() => {
          // Create a custom layout for 8 graphs - always using 3x3x2 layout
          const chartHeight = Math.max(4, Math.round(availableHeight / 135));

          const customLayout = charts.map((chart, i) => {
            if (i < 3) {
              // First row (3 charts)
              return {
                i: chart.id,
                x: (i % 3) * 4,
                y: 0,
                w: 4,
                h: chartHeight,
                minW: 2,
                minH: 3,
              };
            } else if (i < 6) {
              // Second row (3 charts)
              return {
                i: chart.id,
                x: ((i - 3) % 3) * 4,
                y: chartHeight,
                w: 4,
                h: chartHeight,
                minW: 2,
                minH: 3,
              };
            } else {
              // Bottom row (2 charts)
              return {
                i: chart.id,
                x: ((i - 6) % 2) * 6,
                y: chartHeight * 2,
                w: 6,
                h: chartHeight,
                minW: 2,
                minH: 3,
              };
            }
          });

          // Update the layouts with our custom layout
          setLayouts((prev) => ({
            ...prev,
            [currentBreakpoint]: customLayout,
          }));

          // Trigger a single resize event after layout update
          setTimeout(() => window.dispatchEvent(new Event("resize")), 150);
        }, 150);
      }
      // Handle 3 graph case as before
      else if (charts.length === 3) {
        resizeTimeoutRef.current = setTimeout(() => {
          const layout = calculateOptimalLayout();
          setLayouts((prev) => ({
            ...prev,
            [currentBreakpoint]: layout,
          }));

          // Trigger a single resize event after layout update
          setTimeout(() => window.dispatchEvent(new Event("resize")), 150);
        }, 100);
      }
    };

    // Initial update
    debouncedUpdateViewportDimensions();

    // Add resize listener with the debounced handler
    window.addEventListener("resize", debouncedUpdateViewportDimensions);

    return () => {
      window.removeEventListener("resize", debouncedUpdateViewportDimensions);
      if (dimensionsDebounceTimerRef.current) {
        clearTimeout(dimensionsDebounceTimerRef.current);
      }
    };
  }, [charts.length, calculateOptimalLayout, currentBreakpoint]);

  // Define the saveLayoutToAPI function first - before any returns
  const saveLayoutToAPI = async () => {
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
      const updatedGraphs = charts
        .map((chart) => {
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
        })
        .filter(Boolean);

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
  };

  // Add a dedicated function to handle applying the initial layout from saved positions
  useEffect(() => {
    // Skip if not mounted or if there are no charts
    if (!mounted || charts.length === 0) return;

    // Skip if we've already initialized with saved layouts
    if (initializedWithSavedLayouts) {
      console.log(
        "LAYOUT INIT: Already initialized with saved layouts, skipping."
      );
      return;
    }

    // If useDynamicLayout is true, we should always use dynamic layouts
    if (useDynamicLayout) {
      console.log("LAYOUT INIT: Using dynamic layout as specified by useDynamicLayout prop");
      // Force a reset to dynamic layout
      resetToDynamicLayout();
      setInitializedWithSavedLayouts(true);
      return;
    }

    // Check if charts have saved layouts
    const hasSavedLayouts = charts.some((chart) => chart.layout);

    if (!hasSavedLayouts) {
      console.log("LAYOUT INIT: No saved layouts found, skipping.");
      return;
    }

    console.log("LAYOUT INIT: Initializing layouts from chart position data");

    // Create a new layout array based on saved chart positions
    const initialLayout = charts.map((chart) => {
      // Use chart's saved layout if available
      const savedLayout = chart.layout || { x: 0, y: 0, w: 6, h: 4 };

      // Log for debugging
      console.log(
        `LAYOUT INIT: Chart ${chart.id} initial layout:`,
        savedLayout
      );

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

    // Helper function for adjusting layout for different breakpoints (similar to existing one)
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

    // Update chart positions ref for later API usage
    const chartPositions: Record<
      string,
      { top_xy_pos: string; bottom_xy_pos: string }
    > = {};

    initialLayout.forEach((item) => {
      const chart = charts.find((c) => c.id === item.i);
      if (chart) {
        // Calculate top and bottom positions for API format
        const topY = item.y * 10;
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

    // Update positions ref
    chartPositionsRef.current = chartPositions;

    // Mark that we've initialized with saved layouts
    setInitializedWithSavedLayouts(true);
    console.log("LAYOUT INIT: Successfully initialized with saved layouts");

    // Force a resize to ensure charts render correctly
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 200);

    // Schedule additional resize event to ensure the layout is properly rendered
    setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 1000);
  }, [mounted, charts, initializedWithSavedLayouts, useDynamicLayout, resetToDynamicLayout]);

  //===== SECTION 1: Enhance initialization lock with saved layout protection =====

  // Create a variable to lock layout changes
  useEffect(() => {
    // Set the lock if we have layouts with saved positions
    if (charts.some((chart) => chart.layout) && !savedLayoutsLocked) {
      console.log(
        "IMPORTANT: Locking saved layouts to prevent auto-layout overrides"
      );
      setSavedLayoutsLocked(true);
      savedLayoutsRef.current = true;
    }
  }, [charts, savedLayoutsLocked]);

  if (!mounted) return null;

  // When in fullscreen mode, render just the fullscreen chart
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
                resolution={resolution} // Pass resolution to DraggableChart
                className="h-full"
                onFullscreenChange={handleFullscreenChange}
                isFullscreenMode={true}
                hideControls={fullscreenChart.hideControls || hideControls}
                onDeleteGraph={fullscreenChart.onDeleteGraph || onDeleteGraph}
                onEditGraph={onEditGraph} // Add this prop
                isLoading={fullscreenChart.isLoading} // Add this line
              />
            </div>
          </div>
        </motion.div>
      </div>
    );
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
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 992, sm: 768, xs: 576, xxs: 320 }}
          cols={{ lg: 12, md: 9, sm: 6, xs: 3, xxs: 2 }}
          rowHeight={rowHeight} // Use dynamic row height
          margin={[6, 6]} // Reduced from [8, 8] to [6, 6]
          containerPadding={[4, 4]}
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={(breakpoint) => {
            setCurrentBreakpoint(breakpoint);
            // Force a resize to recalculate optimal layout
            window.dispatchEvent(new Event("resize"));

            // Special handling for 3 and 8 graphs to ensure proper layout on breakpoint change
            if (charts.length === 8) {
              setTimeout(() => {
                const layout = calculateOptimalLayout();

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
                      maxW: 12,
                      minH: 3,
                      maxH: 12,
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
                      maxW: 12,
                      minH: 3,
                      maxH: 12,
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
                      maxW: 12,
                      minH: 3,
                      maxH: 12,
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
                const layout = calculateOptimalLayout();
                // Update the layout for the current breakpoint
                setLayouts((prev) => ({
                  ...prev,
                  [breakpoint]:
                    prev[breakpoint]?.map((item: Layout) => {
                      const matchingLayout = layout.find((l) => l.i === item.i);
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
          onResize={() => {
            // Force charts to rerender after resize events
            if (resizeTimeoutRef.current) {
              clearTimeout(resizeTimeoutRef.current);
            }
            resizeTimeoutRef.current = setTimeout(() => {
              window.dispatchEvent(new Event("resize"));
            }, 50);
          }}
          // Ensure we use the full height with vertical compaction
          verticalCompact={true}
          compactType="vertical"
          useCSSTransforms={true}
          isResizable={true}
          isDraggable={true}
          draggableHandle=".cursor-grab"
          preventCollision={false}
          measureBeforeMount={false}
          // Use autoSize to fill container
          autoSize={true}
          // useStaticSize={false}
          key={`grid-${charts.length}-${viewportHeight}-${rowHeight}-${currentBreakpoint}`} // Force rerender when key metrics change
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
                    "opacity-0"
                )}
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
                  resolution={resolution} // Pass resolution to each DraggableChart
                  className="h-full"
                  onFullscreenChange={handleFullscreenChange}
                  isFullscreenMode={chart.id === fullscreenChartId}
                  hideControls={chart.hideControls || hideControls}
                  onDeleteGraph={chart.onDeleteGraph || onDeleteGraph}
                  onEditGraph={onEditGraph} // Add this prop
                  isLoading={chart.isLoading} // Add this line
                />
              </div>
            );
          })}
        </ResponsiveGridLayout>

        {isLayoutModified && (
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
                      { x: 0, y: 0, w: 4, h: sevenChartHeight }, // Top row of 3
                      { x: 4, y: 0, w: 4, h: sevenChartHeight },
                      { x: 8, y: 0, w: 4, h: sevenChartHeight },
                      { x: 0, y: sevenChartHeight, w: 4, h: sevenChartHeight }, // Middle row of 3
                      { x: 4, y: sevenChartHeight, w: 4, h: sevenChartHeight },
                      { x: 8, y: sevenChartHeight, w: 4, h: sevenChartHeight },
                      { x: 0, y: sevenChartHeight * 2, w: 12, h: sevenBottomHeight }, // Bottom row of 1 (wider)
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
                      { x: 0, y: 0, w: 4, h: nineChartHeight }, // 3x3 grid
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
                    const newX = Math.min(
                      cols - newWidth,
                      Math.floor(item.x * widthFactor)
                    );
                    
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
