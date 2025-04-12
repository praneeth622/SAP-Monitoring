"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { DraggableChart } from "./DraggableChart";
import { DataPoint } from "@/types";
import _ from "lodash";
import { DateRange } from "react-day-picker";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
}: DynamicLayoutProps) {
  const [layouts, setLayouts] = useState({});
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
    console.log(`Calculating layout for ${numCharts} charts`);

    // Define minimum sizes to ensure charts don't get too small
    const minWidth = 3;
    const minHeight = 4;

    // Calculate scaling factor based on viewport height
    // This helps charts fill more vertical space on larger screens
    const heightScaleFactor = viewportHeight > 0 
      ? Math.min(1.5, Math.max(0.9, viewportHeight / 800)) 
      : 1;
    
    console.log(`Using height scale factor: ${heightScaleFactor.toFixed(2)} for viewport height: ${viewportHeight}px`);

    // Use the specific layout configurations based on number of charts
    let layoutConfig = [];

    // Get baseline size for charts
    const defaultSize = getChartSize(numCharts);
    const baseHeight = calculateIdealChartHeight(numCharts);
    
    console.log(
      `Using optimized layout for ${numCharts} charts: w=${defaultSize.w}, h=${baseHeight}`
    );

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
        // For 3 charts, we'll use a more flexible layout that fills vertical space
        const threeChartHeight = Math.max(8, Math.round(12 * heightScaleFactor));
        layoutConfig = [
          { x: 0, y: 0, w: 12, h: Math.floor(threeChartHeight / 2) }, // Wider chart on top
          { x: 0, y: Math.floor(threeChartHeight / 2), w: 6, h: Math.ceil(threeChartHeight / 2) }, // Two charts side by side below
          { x: 6, y: Math.floor(threeChartHeight / 2), w: 6, h: Math.ceil(threeChartHeight / 2) },
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
        const eightChartHeight = Math.max(4, Math.round(5.5 * heightScaleFactor));
        const bottomRowHeight = Math.max(5, Math.round(6 * heightScaleFactor));
        layoutConfig = [
          { x: 0, y: 0, w: 3, h: eightChartHeight }, // Top row of 4
          { x: 3, y: 0, w: 3, h: eightChartHeight },
          { x: 6, y: 0, w: 3, h: eightChartHeight },
          { x: 9, y: 0, w: 3, h: eightChartHeight },
          { x: 0, y: eightChartHeight, w: 3, h: eightChartHeight }, // Middle row of 3
          { x: 3, y: eightChartHeight, w: 3, h: eightChartHeight },
          { x: 6, y: eightChartHeight, w: 6, h: bottomRowHeight }, // Bottom right (larger)
          { x: 0, y: eightChartHeight * 2, w: 6, h: bottomRowHeight }, // Bottom left (larger)
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
    const initialLayouts = {
      lg: layout,
      md: layout.map((item) => ({ 
        ...item, 
        w: Math.min(9, item.w * 0.75),
        x: Math.floor(item.x * 0.75)
      })),
      sm: layout.map((item) => ({ 
        ...item, 
        w: Math.min(6, item.w * 0.5),
        x: Math.floor(item.x * 0.5)
      })),
      xs: layout.map((item) => ({ 
        ...item, 
        w: 3,
        x: (item.x % 3) // Ensure x position cycles within 3-column grid
      })),
      xxs: layout.map((item) => ({ 
        ...item, 
        w: 2,
        x: (item.x % 2) // Ensure x position cycles within 2-column grid
      })),
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
    const updatedLayouts = {
      lg: layout,
      md: layout.map((item) => ({ 
        ...item, 
        w: Math.min(9, item.w * 0.75),
        x: Math.floor(item.x * 0.75)
      })),
      sm: layout.map((item) => ({ 
        ...item, 
        w: Math.min(6, item.w * 0.5),
        x: Math.floor(item.x * 0.5)
      })),
      xs: layout.map((item) => ({ 
        ...item, 
        w: 3,
        x: (item.x % 3) // Ensure x position cycles within 3-column grid
      })),
      xxs: layout.map((item) => ({ 
        ...item, 
        w: 2,
        x: (item.x % 2) // Ensure x position cycles within 2-column grid
      })),
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

  // Add viewport height detection
  useEffect(() => {
    const updateViewportDimensions = () => {
      // Get viewport height
      const height = window.innerHeight;
      const containerHeight = containerRef.current?.clientHeight || height;
      
      // Calculate available height (accounting for any other UI elements)
      const availableHeight = Math.max(containerHeight * 0.95, height * 0.8);
      setViewportHeight(availableHeight);
      
      // Adjust row height based on viewport height - larger screens get larger row heights
      const calculatedRowHeight = Math.max(30, Math.min(60, height / 20));
      setRowHeight(calculatedRowHeight);
      
      console.log(`Viewport updated: height=${availableHeight}px, rowHeight=${calculatedRowHeight}px`);
    };

    // Initial update
    updateViewportDimensions();
    
    // Add resize listener
    window.addEventListener("resize", updateViewportDimensions);

    return () => {
      window.removeEventListener("resize", updateViewportDimensions);
    };
  }, []);

  // Enhanced function to calculate ideal chart height based on viewport and number of charts
  const calculateIdealChartHeight = useCallback((numCharts: number) => {
    if (!viewportHeight) return 4; // Default if viewport height isn't available yet
    
    // Calculate optimal chart height based on viewport and number of charts
    // The goal is to fill the available vertical space completely
    const optimalHeight = Math.max(4, Math.min(18, Math.floor((viewportHeight / (rowHeight * 1.2)) / Math.ceil(numCharts / 3))));
    
    console.log(`Calculated optimal height for ${numCharts} charts: ${optimalHeight} rows`);
    return optimalHeight;
  }, [viewportHeight, rowHeight]);

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
          key={`grid-${charts.length}-${viewportHeight}-${rowHeight}`} // Force rerender when key metrics change
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
      </motion.div>
    </AnimatePresence>
  );
}
