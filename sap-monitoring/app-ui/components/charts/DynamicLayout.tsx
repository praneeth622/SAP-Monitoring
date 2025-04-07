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

    // Get size based on total number of charts using your specified requirements
    const defaultSize = getChartSize(numCharts);
    console.log(
      `Using rule-based layout for ${numCharts} charts: w=${defaultSize.w}, h=${defaultSize.h}`
    );

    // For strict layout, we need to calculate the positions based on the layout rule
    let layoutConfig = [];

    // Use the specific layout configurations based on number of charts
    switch (numCharts) {
      case 1:
        layoutConfig = [{ x: 0, y: 0, w: 12, h: 14 }]; // Full width, taller for single chart
        break;
      case 2:
        layoutConfig = [
          { x: 0, y: 0, w: 12, h: 7 }, // Two charts side by side
          { x: 0, y: 7, w: 12, h: 7 },
        ];
        break;
      case 3:
        layoutConfig = [
          { x: 0, y: 0, w: 12, h: 5 }, // Three charts in a row
          { x: 4, y: 0, w: 12, h: 5 },
          { x: 8, y: 0, w: 12, h: 5 },
        ];
        break;
      case 4:
        layoutConfig = [
          { x: 0, y: 0, w: 6, h: 7 }, // 2x2 grid
          { x: 6, y: 0, w: 6, h: 7 },
          { x: 0, y: 7, w: 6, h: 7 },
          { x: 6, y: 7, w: 6, h: 7 },
        ];
        break;
      case 5:
        layoutConfig = [
          { x: 0, y: 0, w: 4, h: 7 }, // 2x3 grid (first row of 3)
          { x: 4, y: 0, w: 4, h: 7 },
          { x: 8, y: 0, w: 4, h: 7 },
          { x: 0, y: 7, w: 6, h: 7 }, // Second row of 2
          { x: 6, y: 8, w: 6, h: 7 },
        ];
        break;
      case 6:
        layoutConfig = [
          { x: 0, y: 0, w: 4, h: 7 }, // 2x3 grid
          { x: 4, y: 0, w: 4, h: 7 },
          { x: 8, y: 0, w: 4, h: 7 },
          { x: 0, y: 7, w: 4, h: 7 },
          { x: 4, y: 7, w: 4, h: 7 },
          { x: 8, y: 7, w: 4, h: 7 },
        ];
        break;
      case 7:
        layoutConfig = [
          { x: 0, y: 0, w: 4, h: 5 }, // 2x4 grid (first row of 3)
          { x: 4, y: 0, w: 4, h: 5 },
          { x: 8, y: 0, w: 4, h: 5 },
          { x: 0, y: 5, w: 4, h: 5 }, // Second row of 3
          { x: 4, y: 5, w: 4, h: 5 },
          { x: 8, y: 5, w: 4, h: 5 },
          { x: 0, y: 10, w: 12, h: 5 }, // Third row of 1 full width
        ];
        break;
      case 8:
        layoutConfig = [
          { x: 0, y: 0, w: 4, h: 5 }, // 2x4 grid
          { x: 4, y: 0, w: 4, h: 5 },
          { x: 8, y: 0, w: 4, h: 5 },
          { x: 0, y: 5, w: 4, h: 5 },
          { x: 4, y: 5, w: 4, h: 5 },
          { x: 8, y: 5, w: 4, h: 5 },
          { x: 0, y: 10, w: 6, h: 5 }, // Third row of 2
          { x: 6, y: 10, w: 6, h: 5 },
        ];
        break;
      case 9:
        layoutConfig = [
          { x: 0, y: 0, w: 4, h: 5 }, // 3x3 grid
          { x: 4, y: 0, w: 4, h: 5 },
          { x: 8, y: 0, w: 4, h: 5 },
          { x: 0, y: 5, w: 4, h: 5 },
          { x: 4, y: 5, w: 4, h: 5 },
          { x: 8, y: 5, w: 4, h: 5 },
          { x: 0, y: 10, w: 4, h: 5 },
          { x: 4, y: 10, w: 4, h: 5 },
          { x: 8, y: 10, w: 4, h: 5 },
        ];
        break;
      default:
        layoutConfig = [];
        // For more than 9 charts, calculate a grid layout
        const cols = Math.floor(12 / 3); // Use columns of width 3
        const width = 3; // Fixed width of 3
        const height = 4; // Fixed height of 4

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
  }, [charts]);

  // Initialize layouts only once on mount
  useEffect(() => {
    if (!mounted) {
      setMounted(true);
    }

    const layout = calculateOptimalLayout();
    const initialLayouts = {
      lg: layout,
      md: layout.map((item) => ({ ...item, w: Math.min(12, item.w * 2) })),
      sm: layout.map((item) => ({ ...item, w: 12, x: 0 })),
      xs: layout.map((item) => ({ ...item, w: 12, x: 0 })),
      xxs: layout.map((item) => ({ ...item, w: 12, x: 0 })),
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
      md: layout.map((item) => ({ ...item, w: Math.min(12, item.w * 2) })),
      sm: layout.map((item) => ({ ...item, w: 12, x: 0 })),
      xs: layout.map((item) => ({ ...item, w: 12, x: 0 })),
      xxs: layout.map((item) => ({ ...item, w: 12, x: 0 })),
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
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
          rowHeight={40} // Reduced from 50 to 40
          margin={[6, 6]} // Reduced from [8, 8] to [6, 6]
          containerPadding={[4, 4]}
          onLayoutChange={handleLayoutChange}
          onResize={() => {
            // Force charts to rerender after resize events
            if (resizeTimeoutRef.current) {
              clearTimeout(resizeTimeoutRef.current);
            }
            resizeTimeoutRef.current = setTimeout(() => {
              window.dispatchEvent(new Event("resize"));
            }, 50);
          }}
          useCSSTransforms={true}
          isResizable={true}
          isDraggable={true}
          draggableHandle=".cursor-grab"
          compactType="vertical"
          preventCollision={false}
          measureBeforeMount={false}
          // useStaticSize={false}
          key={`grid-${charts.length}`} // Force rerender when charts count changes
          style={{
            padding: "0 4px",
            margin: "0 auto",
            maxWidth: "100%",
            width: "100%",
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
