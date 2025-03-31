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
  layout?: { x: number, y: number, w: number, h: number };
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
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Improved layout calculation to handle different numbers of charts
  const calculateOptimalLayout = useCallback(() => {
    const numCharts = charts.length;
    console.log(`Calculating layout for ${numCharts} charts`);
    
    // Define minimum sizes to ensure charts don't get too small
    const minWidth = 3;
    const minHeight = 4;
    
    // Get size based on total number of charts - this is our layout rule
    const defaultSize = getChartSize(numCharts);
    console.log(`Using rule-based layout for ${numCharts} charts: w=${defaultSize.w}, h=${defaultSize.h}`);
    
    // For strict layout, we need to calculate the positions based on the layout rule
    let layoutConfig;
    
    switch (numCharts) {
      case 1:
        // Single chart takes full width
        layoutConfig = [{ x: 0, y: 0, w: 12, h: 10 }];
        break;
      case 2:
        // Two charts side by side
        layoutConfig = [
          { x: 0, y: 0, w: 6, h: 9 },
          { x: 6, y: 0, w: 6, h: 9 }
        ];
        break;
      case 3:
        // Three charts in a row
        layoutConfig = [
          { x: 0, y: 0, w: 4, h: 8 },
          { x: 4, y: 0, w: 4, h: 8 },
          { x: 8, y: 0, w: 4, h: 8 }
        ];
        break;
      case 4:
        // 2x2 grid
        layoutConfig = [
          { x: 0, y: 0, w: 6, h: 6 },
          { x: 6, y: 0, w: 6, h: 6 },
          { x: 0, y: 6, w: 6, h: 6 },
          { x: 6, y: 6, w: 6, h: 6 }
        ];
        break;
      case 5:
        // 2x3 grid (with one empty space)
        layoutConfig = [
          { x: 0, y: 0, w: 4, h: 6 },
          { x: 4, y: 0, w: 4, h: 6 },
          { x: 8, y: 0, w: 4, h: 6 },
          { x: 0, y: 6, w: 4, h: 6 },
          { x: 4, y: 6, w: 4, h: 6 }
        ];
        break;
      case 6:
        // 2x3 grid
        layoutConfig = [
          { x: 0, y: 0, w: 4, h: 6 },
          { x: 4, y: 0, w: 4, h: 6 },
          { x: 8, y: 0, w: 4, h: 6 },
          { x: 0, y: 6, w: 4, h: 6 },
          { x: 4, y: 6, w: 4, h: 6 },
          { x: 8, y: 6, w: 4, h: 6 }
        ];
        break;
      case 7:
        // 2x4 grid (with one empty space)
        layoutConfig = [
          { x: 0, y: 0, w: 4, h: 5 },
          { x: 4, y: 0, w: 4, h: 5 },
          { x: 8, y: 0, w: 4, h: 5 },
          { x: 0, y: 5, w: 4, h: 5 },
          { x: 4, y: 5, w: 4, h: 5 },
          { x: 8, y: 5, w: 4, h: 5 },
          { x: 0, y: 10, w: 4, h: 5 }
        ];
        break;
      case 8:
        // 2x4 grid
        layoutConfig = [
          { x: 0, y: 0, w: 4, h: 5 },
          { x: 4, y: 0, w: 4, h: 5 },
          { x: 8, y: 0, w: 4, h: 5 },
          { x: 0, y: 5, w: 4, h: 5 },
          { x: 4, y: 5, w: 4, h: 5 },
          { x: 8, y: 5, w: 4, h: 5 },
          { x: 0, y: 10, w: 4, h: 5 },
          { x: 4, y: 10, w: 4, h: 5 }
        ];
        break;
      case 9:
        // 3x3 grid
        layoutConfig = [
          { x: 0, y: 0, w: 4, h: 5 },
          { x: 4, y: 0, w: 4, h: 5 },
          { x: 8, y: 0, w: 4, h: 5 },
          { x: 0, y: 5, w: 4, h: 5 },
          { x: 4, y: 5, w: 4, h: 5 },
          { x: 8, y: 5, w: 4, h: 5 },
          { x: 0, y: 10, w: 4, h: 5 },
          { x: 4, y: 10, w: 4, h: 5 },
          { x: 8, y: 10, w: 4, h: 5 }
        ];
        break;
      default:
        // Default case - generate a grid using the standard formula
        layoutConfig = [];
        const cols = Math.ceil(12 / defaultSize.w);
        
        for (let i = 0; i < numCharts; i++) {
          const row = Math.floor(i / cols);
          const col = (i % cols) * defaultSize.w;
          layoutConfig.push({
            x: col,
            y: row * defaultSize.h,
            w: defaultSize.w,
            h: defaultSize.h
          });
        }
    }
    
    return charts.map((chart, i) => {
      // If we're past the number of defined positions, generate dynamically
      const position = i < layoutConfig.length 
        ? layoutConfig[i]
        : { 
            x: (i % 4) * 3, 
            y: Math.floor(i / 4) * 4, 
            w: 3, 
            h: 4 
          };
      
      // Check if the chart has its own layout, make it a user preference
      // but ensure minimum sizes are enforced
      if (chart.layout) {
        console.log(`Chart ${chart.id} has custom layout, but will enforce minimum size`);
        
        return {
          i: chart.id,
          x: chart.layout.x,
          y: chart.layout.y,
          w: Math.max(chart.layout.w, minWidth),
          h: Math.max(chart.layout.h, minHeight),
          minW: minWidth,
          maxW: 12,
          minH: minHeight,
          maxH: 12,
          isDraggable: true,
          isResizable: true,
        };
      }
      
      // Apply the calculated layout for this chart
      return {
        i: chart.id,
        x: position.x,
        y: position.y,
        w: position.w,
        h: position.h,
        minW: minWidth,
        maxW: 12,
        minH: minHeight,
        maxH: 12,
        isDraggable: true,
        isResizable: true,
      };
    });
  }, [charts, getChartSize]);

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

  useEffect(() => {
    // Cleanup function
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

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
