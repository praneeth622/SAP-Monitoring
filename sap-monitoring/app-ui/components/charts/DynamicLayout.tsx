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
  isLoading?: boolean;
}

interface DynamicLayoutProps {
  charts: ChartConfig[];
  activeKPIs?: Set<string> | string[];
  kpiColors?: Record<string, { color: string; name: string; icon?: any }>;
  globalDateRange?: DateRange | undefined;
  theme?: {
    name: string;
    colors: string[];
  };
  onLayoutChange?: (layout: Layout[]) => void;
  hideControls?: boolean;
  onDeleteGraph?: (id: string) => void;
  onEditGraph?: (id: string) => void;
  resolution?: string;
  onSaveLayout?: (layouts: Record<string, Layout[]>) => Promise<void>;
  templateId?: string;
  templateData?: any;
  useDynamicLayout?: boolean; // Add this prop
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
  onEditGraph,
  resolution = "auto",
  onSaveLayout,
  templateId,
  templateData,
  useDynamicLayout = false, // Add this prop
}: DynamicLayoutProps) {
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
  const [viewportHeight, setViewportHeight] = useState(0);
  const [rowHeight, setRowHeight] = useState(40);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLayoutModified, setIsLayoutModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastChartsSignatureRef = useRef('');
  const lastUseDynamicLayoutRef = useRef(false); // Add this line with other refs

  const chartPositionsRef = useRef<
    Record<string, { top_xy_pos: string; bottom_xy_pos: string }>
  >({});

  const [baseUrl, setBaseUrl] = useState<string>(
    process.env.NEXT_PUBLIC_API_URL || ""
  );

  useEffect(() => {
    setBaseUrl(process.env.NEXT_PUBLIC_API_URL || "");
  }, []);

  const prevDimensionsRef = useRef({ height: 0, rowHeight: 0 });
  const dimensionsDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleFullscreenChange = useCallback(
    (chartId: string, isFullscreen: boolean) => {
      setFullscreenChartId(isFullscreen ? chartId : null);
    },
    []
  );

  useEffect(() => {
    if (prevThemeRef.current !== theme) {
      prevThemeRef.current = theme;
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 50);
    }
  }, [theme]);

  const [initializedWithSavedLayouts, setInitializedWithSavedLayouts] =
    useState(false);

  const [savedLayoutsLocked, setSavedLayoutsLocked] = useState(false);
  const savedLayoutsRef = useRef(false);

  const determineIfHasSavedLayouts = useCallback(() => {
    return charts.some(
      (chart) =>
        chart.layout &&
        typeof chart.layout.x === "number" &&
        typeof chart.layout.y === "number" &&
        typeof chart.layout.w === "number" &&
        typeof chart.layout.h === "number" &&
        chart.layout.w > 0 &&
        chart.layout.h > 0
    );
  }, [charts]);

  const calculateOptimalLayout = useCallback((shouldUseSavedLayouts?: boolean) => {
    const useSavedLayout = shouldUseSavedLayouts ?? false;
    
    if (useSavedLayout) {
      console.log("Using saved layouts instead of calculating dynamic layout");
      
      // Log the charts layouts we're using
      charts.forEach(chart => {
        console.log(`Chart ${chart.id} layout:`, chart.layout);
      });

      return charts.map((chart) => {
        // Default fallback layout if none is available
        const defaultLayout = { x: 0, y: 0, w: 6, h: 4 };
        // Get saved layout or use default
        const savedLayout = chart.layout || defaultLayout;
        
        console.log(`Creating layout item for ${chart.id}:`, savedLayout);

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

    console.log("Calculating dynamic layout for", charts.length, "charts");
    
    // Dynamic layout calculation logic based on chart count
    switch (charts.length) {
      case 1:
        return [
          {
            i: charts[0].id,
            x: 0,
            y: 0,
            w: 12,
            h: 8,
            minW: 3,
            maxW: 12,
            minH: 4,
            maxH: 12,
            isDraggable: true,
            isResizable: true,
          },
        ];
      case 2:
        return [
          {
            i: charts[0].id,
            x: 0,
            y: 0,
            w: 6,
            h: 8,
            minW: 3,
            maxW: 12,
            minH: 4,
            maxH: 12,
            isDraggable: true,
            isResizable: true,
          },
          {
            i: charts[1].id,
            x: 6,
            y: 0,
            w: 6,
            h: 8,
            minW: 3,
            maxW: 12,
            minH: 4,
            maxH: 12,
            isDraggable: true,
            isResizable: true,
          },
        ];
      case 3:
        return [
          {
            i: charts[0].id,
            x: 0,
            y: 0,
            w: 4,
            h: 8,
            minW: 3,
            maxW: 12,
            minH: 4,
            maxH: 12,
            isDraggable: true,
            isResizable: true,
          },
          {
            i: charts[1].id,
            x: 4,
            y: 0,
            w: 4,
            h: 8,
            minW: 3,
            maxW: 12,
            minH: 4,
            maxH: 12,
            isDraggable: true,
            isResizable: true,
          },
          {
            i: charts[2].id,
            x: 8,
            y: 0,
            w: 4,
            h: 8,
            minW: 3,
            maxW: 12,
            minH: 4,
            maxH: 12,
            isDraggable: true,
            isResizable: true,
          },
        ];
      case 4:
        return [
          {
            i: charts[0].id,
            x: 0,
            y: 0,
            w: 6,
            h: 5,
            minW: 3,
            maxW: 12,
            minH: 4,
            maxH: 12,
            isDraggable: true,
            isResizable: true,
          },
          {
            i: charts[1].id,
            x: 6,
            y: 0,
            w: 6,
            h: 5,
            minW: 3,
            maxW: 12,
            minH: 4,
            maxH: 12,
            isDraggable: true,
            isResizable: true,
          },
          {
            i: charts[2].id,
            x: 0,
            y: 5,
            w: 6,
            h: 5,
            minW: 3,
            maxW: 12,
            minH: 4,
            maxH: 12,
            isDraggable: true,
            isResizable: true,
          },
          {
            i: charts[3].id,
            x: 6,
            y: 5,
            w: 6,
            h: 5,
            minW: 3,
            maxW: 12,
            minH: 4,
            maxH: 12,
            isDraggable: true,
            isResizable: true,
          },
        ];
      // Handle more cases for other chart counts...
      default:
        // For any other number of charts, create a generic grid layout
        return charts.map((chart, i) => {
          const rowIndex = Math.floor(i / 2);
          const colIndex = i % 2;
          return {
            i: chart.id,
            x: colIndex * 6,
            y: rowIndex * 5,
            w: 6,
            h: 5,
            minW: 3,
            maxW: 12,
            minH: 4,
            maxH: 12,
            isDraggable: true,
            isResizable: true,
          };
        });
    }
  }, [charts, viewportHeight]);

  const resetToDynamicLayout = useCallback(() => {
    console.log("Resetting to dynamic layout");

    const layout = calculateOptimalLayout(false);
    
    savedLayoutsRef.current = false;
    setSavedLayoutsLocked(false);
    
    const adjustLayoutForBreakpoint = (
      layout: Layout[],
      cols: number,
      widthFactor: number,
      breakpoint: string
    ) => {
      // Filter out any undefined or null values before mapping
      return layout
        .filter(item => item && typeof item.w === 'number' && typeof item.x === 'number')
        .map((item) => {
          // Add null checks and default values
          const w = typeof item.w === 'number' ? item.w : 4;
          const x = typeof item.x === 'number' ? item.x : 0;
          
          const newWidth = Math.min(cols, Math.ceil(w * widthFactor));
          const newX = Math.min(cols - newWidth, Math.floor(x * widthFactor));

          // Special handling for 3 charts on mobile
          if (charts.length === 3 && (breakpoint === "xs" || breakpoint === "xxs")) {
            return { ...item, w: cols, x: 0 };
          }

          // Special handling for 8 charts layout
          if (charts.length === 8) {
            const chartIndex = charts.findIndex((c) => c.id === item.i);
            if (chartIndex < 0) return { ...item, w: newWidth, x: newX };

            if (chartIndex < 3) {
              // First row (3 charts)
              return {
                ...item,
                w: Math.max(Math.floor(cols / 3), 1),
                x: (chartIndex % 3) * Math.max(Math.floor(cols / 3), 1),
                y: 0,
              };
            } else if (chartIndex < 6) {
              // Second row (3 charts)
              return {
                ...item,
                w: Math.max(Math.floor(cols / 3), 1),
                x: ((chartIndex - 3) % 3) * Math.max(Math.floor(cols / 3), 1),
                y: item.h || 4,
              };
            } else {
              // Third row (2 charts)
              const bottomColSpan = Math.floor(cols / 2);
              return {
                ...item,
                w: bottomColSpan,
                x: (chartIndex - 6) * bottomColSpan,
                y: (item.h || 4) * 2,
              };
            }
          }

          return { ...item, w: newWidth, x: newX };
        });
    };

    const resetLayouts = {
      lg: layout,
      md: adjustLayoutForBreakpoint(layout, 9, 0.75, "md"),
      sm: adjustLayoutForBreakpoint(layout, 6, 0.5, "sm"),
      xs: adjustLayoutForBreakpoint(layout, 3, 0.33, "xs"),
      xxs: adjustLayoutForBreakpoint(layout, 2, 0.25, "xxs"),
    };

    setLayouts(resetLayouts);
    layoutRef.current = layout;

    charts.forEach((chart) => {
      const layoutItem = layout.find((l) => l.i === chart.id);
      if (layoutItem) {
        chart.layout = {
          x: layoutItem.x,
          y: layoutItem.y,
          w: layoutItem.w,
          h: layoutItem.h,
        };
      }
    });

    setIsLayoutModified(true);

    setTimeout(() => window.dispatchEvent(new Event("resize")), 100);
    setTimeout(() => window.dispatchEvent(new Event("resize")), 400);

    toast.success("Layout reset to default");
  }, [charts, calculateOptimalLayout, toast]);

  useEffect(() => {
    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight);
    };

    updateViewportHeight();

    window.addEventListener('resize', updateViewportHeight);

    return () => {
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      return;
    }
    
    if (charts.length === 0) return;
    
    const chartsSignature = charts.map(c => c.id).join('|');
    
    if (chartsSignature === lastChartsSignatureRef.current && 
        useDynamicLayout === lastUseDynamicLayoutRef.current) {
      return;
    }
    
    console.log("Processing new chart set or dynamic layout change:", 
      `chartsSignature: ${chartsSignature}, useDynamicLayout: ${useDynamicLayout}`);
    
    lastChartsSignatureRef.current = chartsSignature;
    lastUseDynamicLayoutRef.current = useDynamicLayout;
    
    const hasSavedLayouts = determineIfHasSavedLayouts();
    console.log("Charts have saved layouts:", hasSavedLayouts, 
      charts.map(c => c.id + ": " + (c.layout ? JSON.stringify(c.layout) : "no layout")));
    
    // Use dynamic layout if useDynamicLayout is true
    // Use saved layouts if useDynamicLayout is false AND there are saved layouts
    if (useDynamicLayout) {
      console.log("Using dynamic layout");
      resetToDynamicLayout();
    } else if (hasSavedLayouts) {
      console.log("Using saved layouts");
      // Use saved layouts only - this branch is for when useDynamicLayout is false AND saved layouts exist
      const layout = calculateOptimalLayout(true);
      console.log("Calculated layout from saved positions:", layout);
      
      const adjustLayoutForBreakpoint = (
        layout: Layout[],
        cols: number,
        widthFactor: number,
        breakpoint: string
      ) => {
        // Implementation from resetToDynamicLayout...
        return layout
          .filter(item => item && typeof item.w === 'number' && typeof item.x === 'number')
          .map((item) => {
            const w = typeof item.w === 'number' ? item.w : 4;
            const x = typeof item.x === 'number' ? item.x : 0;
            
            const newWidth = Math.min(cols, Math.ceil(w * widthFactor));
            const newX = Math.min(cols - newWidth, Math.floor(x * widthFactor));

            if (charts.length === 3 && (breakpoint === "xs" || breakpoint === "xxs")) {
              return { ...item, w: cols, x: 0 };
            }

            if (charts.length === 8) {
              const chartIndex = charts.findIndex((c) => c.id === item.i);
              if (chartIndex < 0) return { ...item, w: newWidth, x: newX };

              if (chartIndex < 3) {
                return {
                  ...item,
                  w: Math.max(Math.floor(cols / 3), 1),
                  x: (chartIndex % 3) * Math.max(Math.floor(cols / 3), 1),
                  y: 0,
                };
              } else if (chartIndex < 6) {
                return {
                  ...item,
                  w: Math.max(Math.floor(cols / 3), 1),
                  x: ((chartIndex - 3) % 3) * Math.max(Math.floor(cols / 3), 1),
                  y: item.h || 4,
                };
              } else {
                const bottomColSpan = Math.floor(cols / 2);
                return {
                  ...item,
                  w: bottomColSpan,
                  x: (chartIndex - 6) * bottomColSpan,
                  y: (item.h || 4) * 2,
                };
              }
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
      
      console.log("Setting layouts with saved positions:", initialLayouts);
      setLayouts(initialLayouts);
      layoutRef.current = layout;
      
      savedLayoutsRef.current = true;
      setSavedLayoutsLocked(true);
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 100);
    } else {
      // No saved layouts available, use dynamic layout
      console.log("No saved layouts found, falling back to dynamic layout");
      resetToDynamicLayout();
    }
  }, [charts, mounted, determineIfHasSavedLayouts, useDynamicLayout, resetToDynamicLayout, calculateOptimalLayout]);

  if (!mounted) {
    console.log("DynamicLayout not mounted yet, returning null");
    setTimeout(() => setMounted(true), 0);
    return null;
  }

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
                  onDeleteGraph={fullscreenChart.onDeleteGraph || onDeleteGraph}
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
          rowHeight={rowHeight}
          margin={[6, 6]}
          containerPadding={[4, 4]}
          onLayoutChange={(layout, allLayouts) => {
            if (onLayoutChange) {
              onLayoutChange(layout);
            }
            setLayouts(allLayouts);
            layoutRef.current = layout;
            setIsLayoutModified(true);
          }}
          onBreakpointChange={(breakpoint) => {
            setCurrentBreakpoint(breakpoint);
            window.dispatchEvent(new Event("resize"));
          }}
          verticalCompact={true}
          compactType="vertical"
          useCSSTransforms={true}
          isResizable={true}
          isDraggable={true}
          draggableHandle=".cursor-grab"
          preventCollision={false}
          measureBeforeMount={false}
          autoSize={true}
          key={`grid-${charts.length}-${viewportHeight}-${rowHeight}-${currentBreakpoint}-${useDynamicLayout ? 'dynamic' : 'saved'}-${savedLayoutsLocked ? 'locked' : 'unlocked'}`}
          style={{
            padding: "0 4px",
            margin: "0 auto",
            maxWidth: "100%",
            width: "100%",
            height: "100%",
          }}
        >
          {charts.map((chart) => (
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
                resolution={resolution}
                className="h-full"
                onFullscreenChange={handleFullscreenChange}
                isFullscreenMode={chart.id === fullscreenChartId}
                hideControls={chart.hideControls || hideControls}
                onDeleteGraph={chart.onDeleteGraph || onDeleteGraph}
                onEditGraph={onEditGraph}
                isLoading={chart.isLoading}
              />
            </div>
          ))}
        </ResponsiveGridLayout>

        {isLayoutModified && (
          <div className="fixed bottom-4 right-4 z-50 flex gap-2">
            <Button
              onClick={resetToDynamicLayout}
              variant="outline"
              className="bg-background/90"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Layout
            </Button>

            <Button
              onClick={async () => {
                if (onSaveLayout && !isSaving) {
                  setIsSaving(true);
                  try {
                    await onSaveLayout(layouts);
                    toast.success("Layout saved successfully!");
                    setIsLayoutModified(false);
                  } catch (error) {
                    console.error("Error saving layout:", error);
                    toast.error(
                      "Failed to save layout: " +
                        (error instanceof Error ? error.message : "Unknown error")
                    );
                  } finally {
                    setIsSaving(false);
                  }
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
