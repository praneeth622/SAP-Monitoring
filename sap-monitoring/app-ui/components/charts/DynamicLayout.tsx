"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { DraggableChart } from "./DraggableChart";
import { DataPoint } from "@/types";
import _ from "lodash";
import { DateRange } from "react-day-picker";

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
}

export function DynamicLayout({
  charts,
  activeKPIs = new Set(),
  kpiColors = {},
  globalDateRange,
  theme,
}: DynamicLayoutProps) {
  const [layouts, setLayouts] = useState({});
  const [currentBreakpoint, setCurrentBreakpoint] = useState("lg");
  const [mounted, setMounted] = useState(false);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const layoutRef = useRef<Layout[]>([]);

  const getChartSize = (total: number) => {
    // Enhanced size calculation for different number of graphs
    switch (total) {
      case 1:
        return { w: 12, h: 10 }; // Full width, taller for single chart
      case 2:
        return { w: 6, h: 9 }; // Two charts side by side
      case 3:
        return { w: 4, h: 8 }; // Three charts in a row
      case 4:
        return { w: 6, h: 6 }; // 2x2 grid
      case 5:
      case 6:
        return { w: 4, h: 6 }; // 2x3 grid
      case 7:
      case 8:
        return { w: 4, h: 5 }; // 2x4 grid
      case 9:
      case 10:
      case 11:
      case 12:
        return { w: 3, h: 5 }; // 3x4 grid
      default:
        return { w: 3, h: 4 }; // For many charts, make them smaller
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
        layoutConfig = [{ x: 0, y: 0, w: 12, h: 10 }]; // Full width, taller for single chart
        break;
      case 2:
        layoutConfig = [
          { x: 0, y: 0, w: 6, h: 9 }, // Two charts side by side
          { x: 6, y: 0, w: 6, h: 9 },
        ];
        break;
      case 3:
        layoutConfig = [
          { x: 0, y: 0, w: 4, h: 8 }, // Three charts in a row
          { x: 4, y: 0, w: 4, h: 8 },
          { x: 8, y: 0, w: 4, h: 8 },
        ];
        break;
      case 4:
        layoutConfig = [
          { x: 0, y: 0, w: 6, h: 6 }, // 2x2 grid
          { x: 6, y: 0, w: 6, h: 6 },
          { x: 0, y: 6, w: 6, h: 6 },
          { x: 6, y: 6, w: 6, h: 6 },
        ];
        break;
      case 5:
        layoutConfig = [
          { x: 0, y: 0, w: 4, h: 6 }, // 2x3 grid (first row of 3)
          { x: 4, y: 0, w: 4, h: 6 },
          { x: 8, y: 0, w: 4, h: 6 },
          { x: 0, y: 6, w: 6, h: 6 }, // Second row of 2
          { x: 6, y: 6, w: 6, h: 6 },
        ];
        break;
      case 6:
        layoutConfig = [
          { x: 0, y: 0, w: 4, h: 6 }, // 2x3 grid
          { x: 4, y: 0, w: 4, h: 6 },
          { x: 8, y: 0, w: 4, h: 6 },
          { x: 0, y: 6, w: 4, h: 6 },
          { x: 4, y: 6, w: 4, h: 6 },
          { x: 8, y: 6, w: 4, h: 6 },
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
    if (mounted) return;

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
    setMounted(true);
  }, [calculateOptimalLayout, mounted]);

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

  if (!mounted) return null;

  // Add more detailed logging in the render function
  return (
    <div className="relative w-full h-full">
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
        rowHeight={50} // Increased from 40 for better height
        margin={[12, 12]}
        containerPadding={[12, 12]}
        onLayoutChange={handleLayoutChange}
        useCSSTransforms={true}
        isResizable={true}
        isDraggable={true}
        draggableHandle=".cursor-grab"
        compactType="vertical"
        preventCollision={false}
      >
        {charts.map((chart) => {
          console.log(
            `Rendering chart: ${chart.title}, data points: ${chart.data.length}`
          );
          return (
            <div
              key={chart.id}
              className="bg-card rounded-lg shadow-sm border border-border overflow-hidden"
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
                className="h-full"
              />
            </div>
          );
        })}
      </ResponsiveGridLayout>
    </div>
  );
}
