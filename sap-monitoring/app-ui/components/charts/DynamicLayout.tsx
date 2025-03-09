"use client"

import React, { useCallback, useEffect, useState } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { DraggableChart } from './DraggableChart';
import { DataPoint } from '@/types';
import _ from 'lodash';
import { DateRange } from 'react-day-picker';
import { AnimatePresence, motion } from 'framer-motion';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface ChartConfig {
  id: string;
  data: DataPoint[];
  type: 'line' | 'bar';
  title: string;
  width: number;
  height: number;
}

interface DynamicLayoutProps {
  charts: ChartConfig[];
  activeKPIs: Set<string>;
  kpiColors: Record<string, { color: string; name: string; icon: any }>;
  globalDateRange: DateRange | undefined;
  fullscreenChartId: string | null;
  setFullscreenChartId: (id: string | null) => void;
}

export function DynamicLayout({ 
  charts, 
  activeKPIs, 
  kpiColors, 
  globalDateRange,
  fullscreenChartId,
  setFullscreenChartId
}: DynamicLayoutProps) {
  const [layouts, setLayouts] = useState({});
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');
  const [mounted, setMounted] = useState(false);

  // Generate initial layout
  const generateLayout = useCallback(() => {
    return charts.map((chart, i) => ({
      i: chart.id,
      x: (i * 4) % 12,
      y: Math.floor(i / 4) * 4,
      w: 4,
      h: 4,
      minW: 3,
      maxW: 12,
      minH: 3,
      maxH: 8,
      isDraggable: true,
      isResizable: true,
    }));
  }, [charts]);

  // Initialize layout on mount
  useEffect(() => {
    const initialLayouts = {
      lg: generateLayout(),
      md: generateLayout(),
      sm: generateLayout(),
      xs: generateLayout(),
      xxs: generateLayout(),
    };
    setLayouts(initialLayouts);
    setMounted(true);

    // Trigger resize event after a short delay to ensure proper rendering
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);

    return () => clearTimeout(timer);
  }, [generateLayout]);

  const handleLayoutChange = (layout: any, layouts: any) => {
    setLayouts(layouts);
  };

  const handleBreakpointChange = (breakpoint: string) => {
    setCurrentBreakpoint(breakpoint);
  };

  const handleResize = useCallback((id: string, size: { width: number; height: number }) => {
    setLayouts(prevLayouts => {
      const newLayouts = { ...prevLayouts };
      const layout = newLayouts[currentBreakpoint];
      const itemIndex = layout.findIndex(item => item.i === id);
      
      if (itemIndex !== -1) {
        const newW = Math.round(size.width / 100);
        const newH = Math.round(size.height / 100);
        
        layout[itemIndex] = {
          ...layout[itemIndex],
          w: Math.min(Math.max(newW, 3), 12),
          h: Math.min(Math.max(newH, 3), 8),
        };
      }
      
      return newLayouts;
    });
  }, [currentBreakpoint]);

  const handleResizeStop = useCallback((layout: Layout[], oldItem: Layout, newItem: Layout) => {
    setLayouts(prevLayouts => ({
      ...prevLayouts,
      [currentBreakpoint]: layout
    }));

    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }, [currentBreakpoint]);

  if (!mounted) return null;

  return (
    <>
      <AnimatePresence>
        {fullscreenChartId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fullscreen-overlay active"
            onClick={() => setFullscreenChartId(null)}
          />
        )}
      </AnimatePresence>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
        margin={[16, 16]}
        containerPadding={[16, 16]}
        onLayoutChange={handleLayoutChange}
        onBreakpointChange={handleBreakpointChange}
        onResizeStop={handleResizeStop}
        useCSSTransforms={true}
        isResizable={!fullscreenChartId}
        isDraggable={!fullscreenChartId}
        draggableHandle=".cursor-grab"
        compactType="vertical"
        preventCollision={false}
        resizeHandle={
          <div className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute right-1 bottom-1 w-2 h-2 border-r-2 border-b-2 border-border dark:border-border-dark" />
          </div>
        }
      >
        {charts.map(chart => (
          <div 
            key={chart.id} 
            className={`chart-wrapper ${fullscreenChartId === chart.id ? 'fullscreen-chart' : ''}`}
          >
            <DraggableChart
              id={chart.id}
              data={chart.data}
              type={chart.type}
              title={chart.title}
              width={chart.width}
              height={chart.height}
              activeKPIs={activeKPIs}
              kpiColors={kpiColors}
              globalDateRange={globalDateRange}
              className="h-full"
              isFullscreen={fullscreenChartId === chart.id}
              onFullscreenToggle={() => setFullscreenChartId(fullscreenChartId === chart.id ? null : chart.id)}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </>
  );
}