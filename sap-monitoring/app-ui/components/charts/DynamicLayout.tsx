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
  activeKPIs = new Set(), // Default empty Set
  kpiColors = {}, // Default empty object
  globalDateRange,
  theme,
}: DynamicLayoutProps) {
  const [layouts, setLayouts] = useState({});
  const [currentBreakpoint, setCurrentBreakpoint] = useState("lg");
  const [mounted, setMounted] = useState(false);
  const initTimeoutRef = useRef<NodeJS.Timeout>();
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();

  const calculateOptimalLayout = useCallback(() => {
    const numCharts = charts.length;
    const viewportHeight =
      typeof window !== "undefined" ? window.innerHeight : 900;
    const baseRowHeight = Math.floor(viewportHeight / 12); // Divide viewport into 12 rows

    const getChartSize = (total: number) => {
      switch (total) {
        case 1:
          return { w: 12, h: 8 };
        case 2:
          return { w: 6, h: 8 };
        case 3:
          return { w: 4, h: 6 };
        case 4:
          return { w: 6, h: 6 };
        case 6:
          return { w: 4, h: 6 };
        case 9:
          return { w: 4, h: 4 };
        default:
          return { w: 4, h: 5 };
      }
    };

    const size = getChartSize(numCharts);

    return charts.map((chart, i) => {
      const row = Math.floor(i / Math.ceil(12 / size.w));
      const col = (i * size.w) % 12;

      return {
        i: chart.id,
        x: col,
        y: row * size.h,
        w: size.w,
        h: size.h,
        minW: 3,
        maxW: 12,
        minH: 3,
        maxH: 12,
        isDraggable: true,
        isResizable: true,
      };
    });
  }, [charts]);

  useEffect(() => {
    const layout = calculateOptimalLayout();
    const initialLayouts = {
      lg: layout,
      md: layout.map((item) => ({ ...item, w: Math.min(12, item.w * 2) })),
      sm: layout.map((item) => ({ ...item, w: 12, x: 0 })),
      xs: layout.map((item) => ({ ...item, w: 12, x: 0 })),
      xxs: layout.map((item) => ({ ...item, w: 12, x: 0 })),
    };

    setLayouts(initialLayouts);
    setMounted(true);
  }, [calculateOptimalLayout]);

  const handleLayoutChange = (layout: Layout[], allLayouts: any) => {
    setLayouts(allLayouts);
  };

  if (!mounted) return null;

  return (
    <div className="relative w-full h-full">
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
        rowHeight={40} // Reduced from 60 to 40
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
          // Create a debug log to track chart configuration 
          console.log(`Rendering chart ${chart.id}:`, {
            title: chart.title,
            type: chart.type,
            dataPoints: chart.data.length,
            activeKPIs: chart.activeKPIs ? 
              (chart.activeKPIs instanceof Set ? 
                Array.from(chart.activeKPIs) : 
                chart.activeKPIs) : 
              'none',
            kpiColors: chart.kpiColors || 'none',
            defaultActiveKPIs: activeKPIs instanceof Set ? 
              Array.from(activeKPIs) : 
              activeKPIs,
            theme: theme ? theme.name : 'none'
          });

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
                // Ensure chart-specific values are prioritized
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
