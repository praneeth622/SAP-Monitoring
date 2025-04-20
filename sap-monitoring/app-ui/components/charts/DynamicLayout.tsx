"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { DraggableChart } from "./DraggableChart";
import { DataPoint } from "@/types";
import _ from "lodash";
import { DateRange } from "react-day-picker";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import styles from "./TemplateChartStyles.module.css";

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
  isTemplatePage?: boolean; // Add this prop for templates page detection
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
  isTemplatePage = false, // Default to false
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

  const getChartSize = (total: number) => {
    // Enhanced size calculation for different number of graphs
    switch (total) {
      case 1:
        return { w: 12, h: 7 }; // Reduced height from 8 to 7
      case 2:
        return { w: 6, h: 6 }; // Reduced height from 7 to 6
      case 3:
        return { w: 4, h: 5 }; // Reduced height from 6 to 5
      case 4:
        return { w: 6, h: 4 }; // Reduced height from 5 to 4
      case 5:
      case 6:
        return { w: 4, h: 4 }; // Reduced height from 5 to 4
      case 7:
      case 8:
        return { w: 4, h: 3 }; // Reduced height from 4 to 3
      case 9:
        return { w: 4, h: 3 }; // Reduced height from 4 to 3
      default:
        return { w: 3, h: 3 }; // Reduced height from 4 to 3
    }
  };

  // Update the calculateOptimalLayout function to properly handle different numbers of charts
  const calculateOptimalLayout = useCallback(() => {
    const numCharts = charts.length;
    // Only log when debugging is needed
    // console.log(`Calculating layout for ${numCharts} charts`);

    // Define minimum sizes to ensure charts don't get too small
    const minWidth = 3;
    const minHeight = 4;

    // Calculate scaling factor based on viewport height
    // This helps charts fill more vertical space on larger screens
    const heightScaleFactor = viewportHeight > 0 
      ? Math.min(1.5, Math.max(0.9, viewportHeight / 800)) 
      : 1;
    
    // Only log when debugging is needed
    // console.log(`Using height scale factor: ${heightScaleFactor.toFixed(2)} for viewport height: ${viewportHeight}px`);

    // Use the specific layout configurations based on number of charts
    let layoutConfig = [];

    // Get baseline size for charts
    const defaultSize = getChartSize(numCharts);
    const baseHeight = calculateIdealChartHeight(numCharts);
    
    // Only log when debugging is needed
    // console.log(`Using optimized layout for ${numCharts} charts: w=${defaultSize.w}, h=${baseHeight}`);

    // Use the specific layout configurations based on number of charts
    switch (numCharts) {
      case 1:
        layoutConfig = [{ x: 0, y: 0, w: 12, h: Math.max(12, Math.round(18 * heightScaleFactor)) }]; // Full width, taller for single chart
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
        // For 8 graphs, always use a 3x3x2 layout regardless of screen size
        const eightChartHeight = Math.max(4, Math.round(5 * heightScaleFactor));
        
        // Always use 3x3x2 layout
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
        layoutConfig = [];
        // For more than 9 charts, calculate a grid layout
        const cols = Math.floor(12 / 3); // Use columns of width 3
        const width = 3; // Fixed width of 3
        const height = Math.max(3, Math.round(4 * heightScaleFactor)); // Dynamically scaled height

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

    return charts.map((chart, i) => {
      // Use the pre-calculated layout if available, or fall back to chart's own layout
      const position =
        i < layoutConfig.length
          ? layoutConfig[i]
          : chart.layout || {
              x: (i % 4) * 3,
              y: Math.floor(i / 4) * 4,
              w: 3,
              h: 4,
            };

      // Ensure minimum sizes and create the layout item
      return {
        i: chart.id,
        x: position.x,
        y: position.y,
        w: Math.max(position.w, minWidth),
        h: Math.max(position.h, minHeight),
        minW: minWidth,
        maxW: 12,
        minH: minHeight,
        maxH: 12,
        isDraggable: true,
        isResizable: true,
      };
    });
  }, [charts, viewportHeight]);

  // Initialize layouts only once on mount
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
    }

    const layout = calculateOptimalLayout();
    
    // Helper function for adjusting layout for different breakpoints
    const adjustLayoutForBreakpoint = (layout: Layout[], cols: number, widthFactor: number, breakpoint: string) => {
      return layout.map((item) => {
        const newWidth = Math.min(cols, Math.ceil(item.w * widthFactor));
        const newX = Math.min(cols - newWidth, Math.floor(item.x * widthFactor));
        
        // Special handling for different graph counts
        if (charts.length === 3) {
          // For 3 graphs on smaller screens, always stack vertically with full width
          return { ...item, w: cols, x: 0 };
        } else if (charts.length === 8) {
          // Get chart index from ID
          const chartIndex = charts.findIndex(c => c.id === item.i);
          
          // For 8 graphs, always maintain a 3x3x2 layout
          if (chartIndex < 3) {
            // First row (3 charts)
            return {
              ...item,
              // Adjust width based on available columns but maintain 3 items per row
              w: Math.max(Math.floor(cols / 3), 1),
              h: 5, // Consistent height
              x: (chartIndex % 3) * Math.max(Math.floor(cols / 3), 1),
              y: 0
            };
          } else if (chartIndex < 6) {
            // Second row (3 charts)
            return {
              ...item,
              w: Math.max(Math.floor(cols / 3), 1),
              h: 5, // Consistent height
              x: ((chartIndex - 3) % 3) * Math.max(Math.floor(cols / 3), 1),
              y: 5
            };
          } else {
            // Third row (2 charts)
            const bottomColSpan = Math.floor(cols / 2);
            return {
              ...item,
              w: bottomColSpan,
              h: 5, // Consistent height
              x: (chartIndex - 6) * bottomColSpan,
              y: 10
            };
          }
        }
        
        return { ...item, w: newWidth, x: newX };
      });
    };

    const initialLayouts = {
      lg: layout,
      md: adjustLayoutForBreakpoint(layout, 9, 0.75, 'md'),
      sm: adjustLayoutForBreakpoint(layout, 6, 0.5, 'sm'),
      xs: adjustLayoutForBreakpoint(layout, 3, 0.33, 'xs'),
      xxs: adjustLayoutForBreakpoint(layout, 2, 0.25, 'xxs'),
    };

    setLayouts(initialLayouts);
    layoutRef.current = layout;

    // Add a small delay to allow the grid to properly render after layout changes
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100);
  }, [calculateOptimalLayout, mounted, charts.length]);

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
      }, 100);
    },
    []
  );

  // Get the fullscreen chart if one is set
  const fullscreenChart = fullscreenChartId
    ? charts.find((chart) => chart.id === fullscreenChartId)
    : null;

  // Added optimization to ensure all charts resize properly after chart count changes
  useEffect(() => {
    // Skip if not mounted yet
    if (!mounted) return;

    // Special handling for when charts are added or removed
    const layout = calculateOptimalLayout();
    
    // Helper function for adjusting layout for different breakpoints
    const adjustLayoutForBreakpoint = (layout: Layout[], cols: number, widthFactor: number, breakpoint: string) => {
      return layout.map((item) => {
        const newWidth = Math.min(cols, Math.ceil(item.w * widthFactor));
        const newX = Math.min(cols - newWidth, Math.floor(item.x * widthFactor));
        
        // Special handling for different graph counts
        if (charts.length === 3) {
          // For 3 graphs on smaller screens, always stack vertically with full width
          return { ...item, w: cols, x: 0 };
        } else if (charts.length === 8) {
          // Get chart index from ID
          const chartIndex = charts.findIndex(c => c.id === item.i);
          
          // For 8 graphs, always maintain a 3x3x2 layout
          if (chartIndex < 3) {
            // First row (3 charts)
            return {
              ...item,
              // Adjust width based on available columns but maintain 3 items per row
              w: Math.max(Math.floor(cols / 3), 1),
              h: 5, // Consistent height
              x: (chartIndex % 3) * Math.max(Math.floor(cols / 3), 1),
              y: 0
            };
          } else if (chartIndex < 6) {
            // Second row (3 charts)
            return {
              ...item,
              w: Math.max(Math.floor(cols / 3), 1),
              h: 5, // Consistent height
              x: ((chartIndex - 3) % 3) * Math.max(Math.floor(cols / 3), 1),
              y: 5
            };
          } else {
            // Third row (2 charts)
            const bottomColSpan = Math.floor(cols / 2);
            return {
              ...item,
              w: bottomColSpan,
              h: 5, // Consistent height
              x: (chartIndex - 6) * bottomColSpan,
              y: 10
            };
          }
        }
        
        return { ...item, w: newWidth, x: newX };
      });
    };

    const updatedLayouts = {
      lg: layout,
      md: adjustLayoutForBreakpoint(layout, 9, 0.75, 'md'),
      sm: adjustLayoutForBreakpoint(layout, 6, 0.5, 'sm'),
      xs: adjustLayoutForBreakpoint(layout, 3, 0.33, 'xs'),
      xxs: adjustLayoutForBreakpoint(layout, 2, 0.25, 'xxs'),
    };

    setLayouts(updatedLayouts);
    layoutRef.current = layout;

    // Schedule multiple resize events to ensure charts render properly
    const scheduleResize = (delay: number) => {
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, delay);
    };

    // Stagger resize events to catch various rendering stages
    scheduleResize(50);
    scheduleResize(200);
    scheduleResize(500);
  }, [charts.length, calculateOptimalLayout, mounted]);

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
        const hasHeightChanged = Math.abs(prevDimensionsRef.current.height - availableHeight) > 1;
        const hasRowHeightChanged = Math.abs(prevDimensionsRef.current.rowHeight - calculatedRowHeight) > 0.5;
        
        if (hasHeightChanged || hasRowHeightChanged) {
          // Only update state when dimensions have actually changed
          setViewportHeight(availableHeight);
          setRowHeight(calculatedRowHeight);
          
          // Update reference for next comparison
          prevDimensionsRef.current = { 
            height: availableHeight, 
            rowHeight: calculatedRowHeight 
          };
          
          // Only log changes when they actually occur for debugging
          // console.log(`Viewport updated: height=${availableHeight}px, rowHeight=${calculatedRowHeight}px`);
          
          // Handle specific chart count layouts
          handleSpecificChartLayouts(availableHeight, calculatedRowHeight);
        }
      }, 100); // 100ms debounce
    };
    
    // Function to handle layouts for specific chart counts
    const handleSpecificChartLayouts = (availableHeight: number, calculatedRowHeight: number) => {
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
                minH: 3
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
                minH: 3
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
                minH: 3
              };
            }
          });
          
          // Update the layouts with our custom layout
          setLayouts(prev => ({
            ...prev,
            [currentBreakpoint]: customLayout
          }));
          
          // Trigger a single resize event after layout update
          setTimeout(() => window.dispatchEvent(new Event("resize")), 150);
        }, 150);
      } 
      // Handle 3 graph case as before
      else if (charts.length === 3) {
        resizeTimeoutRef.current = setTimeout(() => {
          const layout = calculateOptimalLayout();
          setLayouts(prev => ({
            ...prev,
            [currentBreakpoint]: layout,
          }));
          
          // Trigger a single resize event after layout update
          setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
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

  // Enhanced function to calculate ideal chart height based on viewport and number of charts
  const calculateIdealChartHeight = useCallback((numCharts: number) => {
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
    
    const optimalHeight = Math.max(4, Math.min(12, Math.floor((viewportHeight / (rowHeight * 1.2)) / divisor)));
    
    // Only log when debugging is needed
    // console.log(`Calculated optimal height for ${numCharts} charts: ${optimalHeight} rows`);
    return optimalHeight;
  }, [viewportHeight, rowHeight]);

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
                isTemplatePage={isTemplatePage} // Add the isTemplatePage prop
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
          className={cn(
            "layout", 
            isTemplatePage && styles.templatesPage,
            !isTemplatePage && styles.resizePrevention
          )}
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 992, sm: 768, xs: 576, xxs: 320 }}
          cols={{ lg: 12, md: 9, sm: 6, xs: 3, xxs: 2 }}
          rowHeight={rowHeight} // Use dynamic row height
          margin={[6, 6]} // Reduced from [8, 8] to [6, 6]
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
                      maxH: 12
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
                      maxH: 12
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
                      maxH: 12
                    };
                  }
                });
                
                // Update the layouts with our custom layout
                if (customLayout) {
                  setLayouts(prev => ({
                    ...prev,
                    [breakpoint]: customLayout
                  }));
                  
                  // Trigger resize events to ensure charts render properly
                  setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
                  setTimeout(() => window.dispatchEvent(new Event("resize")), 300);
                }
              }, 150);
            } else if (charts.length === 3) {
              setTimeout(() => {
                const layout = calculateOptimalLayout();
                // Update the layout for the current breakpoint
                setLayouts(prev => ({
                  ...prev,
                  [breakpoint]: prev[breakpoint]?.map((item: Layout) => {
                    const matchingLayout = layout.find(l => l.i === item.i);
                    if (matchingLayout) {
                      // Apply special positioning for small screens
                      if (breakpoint === 'xs' || breakpoint === 'xxs') {
                        return {
                          ...item,
                          w: breakpoint === 'xxs' ? 2 : 3,
                          x: 0
                        };
                      }
                      // Otherwise use the calculated optimal layout
                      return {
                        ...item,
                        ...matchingLayout
                      };
                    }
                    return item;
                  }) || []
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
                  resolution={resolution} // Pass resolution to each DraggableChart
                  className="h-full"
                  onFullscreenChange={handleFullscreenChange}
                  isFullscreenMode={chart.id === fullscreenChartId}
                  hideControls={chart.hideControls || hideControls}
                  onDeleteGraph={chart.onDeleteGraph || onDeleteGraph}
                  onEditGraph={onEditGraph} // Add this prop
                  isLoading={chart.isLoading} // Add this line
                  isTemplatePage={isTemplatePage} // Add the isTemplatePage prop
                />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      </motion.div>
    </AnimatePresence>
  );
}
