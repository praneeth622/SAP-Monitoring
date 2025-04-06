import React, { useState, useCallback, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import {
  GripHorizontal,
  BarChart2,
  LineChart,
  Calendar,
  Maximize2,
  Minimize2,
  Settings2,
  ZoomIn,
  ZoomOut,
  Square,
  Lasso,
  Trash2,
  Download,
  Image as ImageIcon, // Rename to avoid conflict with HTML Image element
  File,
  FileSpreadsheet,
  FileJson,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import ChartContainer from "./ChartContainer";
import { DataPoint, ChartType } from "@/types";
import { DateRangePicker } from "@/components/date-range-picker";
import { DateRange } from "react-day-picker";
import { Button } from "../ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";

// Update the interface to add hideControls and onDeleteGraph props
interface DraggableChartProps {
  id: string;
  data: DataPoint[];
  type: ChartType;
  title: string;
  className?: string;
  width: number;
  height: number;
  activeKPIs?: Set<string> | string[]; // Support both Set and string[] from page.tsx
  kpiColors?: Record<string, { color: string; name: string; icon?: any }>; // Make icon optional
  globalDateRange?: DateRange | undefined;
  theme?: {
    name: string;
    colors: string[];
  };
  onFullscreenChange?: (id: string, isFullscreen: boolean) => void;
  isFullscreenMode?: boolean;
  hideControls?: boolean; // Add this to hide calendar, tools, download, and fullscreen buttons
  onDeleteGraph?: (id: string) => void; // Add this to handle graph deletion
  resolution?: string; // Add resolution as a prop
}

// Then update the component parameters with default values
export const DraggableChart: React.FC<DraggableChartProps> = ({
  id,
  data,
  type,
  title,
  className,
  activeKPIs = new Set(), // Default empty Set
  kpiColors = {}, // Default empty object
  globalDateRange,
  theme,
  onFullscreenChange,
  isFullscreenMode,
  hideControls = false, // Default to showing controls
  onDeleteGraph,
  resolution = 'auto', // Default to auto resolution
}) => {
  const [chartType, setChartType] = useState<ChartType>(type);
  const [localActiveKPIs, setLocalActiveKPIs] = useState<Set<string>>(() => {
    // Convert string[] to Set if needed
    if (Array.isArray(activeKPIs)) {
      console.log("Converting activeKPIs array to Set:", activeKPIs);
      return new Set(activeKPIs);
    }
    if (activeKPIs instanceof Set) {
      console.log("Using activeKPIs Set:", activeKPIs);
      return activeKPIs;
    }
    // Default to empty set if activeKPIs is invalid
    console.warn("Invalid activeKPIs format, using empty set");
    return new Set();
  });
  const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>(
    undefined
  );
  const [useGlobalDate, setUseGlobalDate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement & {
    zoomIn: () => void;
    zoomOut: () => void;
    boxSelect: () => void;
    lassoSelect: () => void;
    clearSelection: () => void;
    download: (format: "png" | "svg" | "pdf" | "csv" | "json") => void;
    dispatchAction?: (action: any) => void;
    isValid?: () => boolean;
  }>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  useEffect(() => {
    // Initialize local date range if it's not set and global date is available
    if (!localDateRange && globalDateRange && useGlobalDate) {
      setLocalDateRange({
        from: globalDateRange.from ? new Date(globalDateRange.from) : undefined,
        to: globalDateRange.to ? new Date(globalDateRange.to) : undefined,
      });
    }
  }, [globalDateRange, localDateRange, useGlobalDate]);

  // Sync with parent's fullscreen state
  useEffect(() => {
    if (isFullscreenMode !== undefined) {
      setIsFullscreen(isFullscreenMode);
    }
  }, [isFullscreenMode]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: "100%",
    height: "100%",
    zIndex: isFullscreen ? 50 : "auto",
  };

  const toggleKPI = useCallback((kpiId: string) => {
    setLocalActiveKPIs((prev) => {
      const next = new Set(prev);
      if (next.has(kpiId)) {
        next.delete(kpiId);
      } else {
        next.add(kpiId);
      }
      // Force chart update by triggering a resize only if chart is available and valid
      if (chartRef.current && chartRef.current.isValid?.()) {
        try {
          chartRef.current.dispatchAction?.({
            type: 'update',
            notMerge: true,
            replaceMerge: ['series']
          });
        } catch (error) {
          console.error("Error updating chart after KPI toggle:", error);
        }
      }
      return next;
    });
  }, []);

  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsTransitioning(true);
    setIsFullscreen(newFullscreenState);

    // Notify parent component about fullscreen change
    if (onFullscreenChange) {
      onFullscreenChange(id, newFullscreenState);
    }

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
      if (chartRef.current && chartRef.current.isValid?.()) {
        // Force chart to redraw and resize to fit the new container
        try {
          chartRef.current.dispatchAction?.({
            type: 'resize'
          });
        } catch (error) {
          console.error("Error resizing chart after fullscreen toggle:", error);
        }
      }
    }, 300);
  };

  // Add resize observer to handle layout changes
  useEffect(() => {
    const chartContainer = chartContainerRef.current;
    if (!chartContainer) return;

    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current?.dispatchAction && chartRef.current.isValid?.()) {
        // Allow a small delay for the container to fully resize
        setTimeout(() => {
          try {
            if (chartRef.current?.dispatchAction && chartRef.current.isValid?.()) {
              chartRef.current.dispatchAction({
                type: 'resize'
              });
            }
          } catch (error) {
            console.error("Error resizing chart in observer:", error);
          }
        }, 10);
      }
    });

    resizeObserver.observe(chartContainer);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Force resize after initial render
  useEffect(() => {
    // Ensure chart resizes properly on initial render
    const initialResizeTimeout = setTimeout(() => {
      if (chartRef.current?.dispatchAction && chartRef.current.isValid?.()) {
        try {
          chartRef.current.dispatchAction({
            type: 'resize'
          });
          
          // Try once more after a longer delay to catch any delayed layout changes
          setTimeout(() => {
            if (chartRef.current?.dispatchAction && chartRef.current.isValid?.()) {
              try {
                chartRef.current.dispatchAction({
                  type: 'resize'
                });
              } catch (error) {
                console.error("Error in delayed chart resize:", error);
              }
            }
          }, 500);
        } catch (error) {
          console.error("Error in initial chart resize:", error);
        }
      }
    }, 100);

    return () => clearTimeout(initialResizeTimeout);
  }, []);

  // Add event listener for ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  const effectiveDateRange = useGlobalDate ? globalDateRange : localDateRange;

  // Add a state to track the selected tool
  const [selectedTool, setSelectedTool] = useState<"box" | "lasso" | null>(
    null
  );

  // Update handlers to set the selected tool state
  const handleZoomIn = useCallback(() => {
    if (!chartRef.current || !chartRef.current.isValid?.()) return;
    try {
      chartRef.current.zoomIn();
    } catch (error) {
      console.error("Error zooming in:", error);
    }
    // Zooming doesn't change the selected tool
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!chartRef.current || !chartRef.current.isValid?.()) return;
    try {
      chartRef.current.zoomOut();
    } catch (error) {
      console.error("Error zooming out:", error);
    }
    // Zooming doesn't change the selected tool
  }, []);

  const handleBoxSelect = useCallback(() => {
    if (!chartRef.current || !chartRef.current.isValid?.()) return;
    setSelectedTool("box"); // Set tool state first
    try {
      chartRef.current.boxSelect(); // Then activate the selection
    } catch (error) {
      console.error("Error activating box select:", error);
      setSelectedTool(null);
    }
  }, []);

  const handleLassoSelect = useCallback(() => {
    if (!chartRef.current || !chartRef.current.isValid?.()) return;
    setSelectedTool("lasso"); // Set tool state first
    try {
      chartRef.current.lassoSelect(); // Then activate the selection
    } catch (error) {
      console.error("Error activating lasso select:", error);
      setSelectedTool(null);
    }
  }, []);

  const handleClearSelection = useCallback(() => {
    if (!chartRef.current || !chartRef.current.isValid?.()) return;
    try {
      chartRef.current.clearSelection();
    } catch (error) {
      console.error("Error clearing selection:", error);
    }
    setSelectedTool(null);
  }, []);

  const handleDownload = useCallback(
    (format: "png" | "svg" | "pdf" | "csv" | "json") => {
      if (!chartRef.current || !chartRef.current.isValid?.()) {
        console.error("Chart reference not available or invalid");
        return;
      }

      // Directly call the download method from the chart ref
      try {
        chartRef.current.download(format);
      } catch (error) {
        console.error(`Error downloading chart as ${format}:`, error);
      }
    },
    [data, title]
  );

  return (
    <>
      {isFullscreen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40" onClick={toggleFullscreen} />
      )}
      <div
        ref={setNodeRef}
        style={!isFullscreen ? style : undefined}
        className={cn(
          "relative group touch-none",
          isFullscreen && "fixed inset-0 z-50 flex items-center justify-center p-8"
        )}
      >
        <div
          ref={containerRef}
          className={cn(
            "relative w-full h-full transition-all duration-300",
            isFullscreen && "w-[90vw] h-[85vh] max-w-[1600px] max-h-[900px]"
          )}
        >
          <Card
            ref={cardRef}
            className={cn(
              "w-full h-full overflow-hidden bg-card/90 backdrop-blur-sm border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300",
              isFullscreen && "rounded-xl flex flex-col shadow-2xl"
            )}
          >
            {isTransitioning && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}

            <div className="flex h-5 items-center justify-between border-b border-border bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center gap-2">
                {!isFullscreen && (
                  <div
                    className="p-0.5 rounded-lg cursor-grab hover:bg-accent/40 transition-all duration-300"
                    {...attributes}
                    {...listeners}
                  >
                    <GripHorizontal className="w-2.5 h-2.5 text-muted-foreground" />
                  </div>
                )}
                {selectedTool && (
                  <div className="flex items-center gap-1 text-primary">
                    {selectedTool === "box" ? (
                      <Square className="h-2.5 w-2.5" />
                    ) : (
                      <Lasso className="h-2.5 w-2.5" />
                    )}
                  </div>
                )}
                <h3 className={cn("font-medium truncate", isFullscreen ? "text-sm" : "text-xs")}>{title}</h3>
              </div>
              <div className="flex items-center gap-2">
                {!hideControls ? (
                  <>
                    <DropdownMenu open={!useGlobalDate} onOpenChange={(open) => !open && setUseGlobalDate(true)}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className={cn(
                            isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5",
                            !useGlobalDate && "bg-accent/20"
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            setUseGlobalDate(!useGlobalDate);
                            if (!localDateRange && globalDateRange) {
                              setLocalDateRange(globalDateRange);
                            }
                          }}
                          title={useGlobalDate ? "Use Local Date Range" : "Use Global Date Range"}
                        >
                          <Calendar className={isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" side="bottom" className="p-0 w-auto">
                        <DateRangePicker
                          date={localDateRange}
                          onDateChange={setLocalDateRange}
                          align="end"
                          showTime={true}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5"}
                      onClick={() => setChartType(chartType === "line" ? "bar" : "line")}
                      title={`Switch to ${chartType === "line" ? "Bar" : "Line"} Chart`}
                    >
                      {chartType === "line" ? (
                        <BarChart3 className={isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} />
                      ) : (
                        <LineChart className={isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} />
                      )}
                    </Button>

                    {/* Tools Button with Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5"}
                        >
                          <Settings2 className={isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" side="bottom" className="w-auto">
                        <div className="flex items-center gap-1 p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={handleZoomIn}
                            title="Zoom In"
                          >
                            <ZoomIn className="h-2.5 w-2.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={handleZoomOut}
                            title="Zoom Out"
                          >
                            <ZoomOut className="h-2.5 w-2.5" />
                          </Button>

                          <div className="h-4 w-[1px] bg-border" />

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={handleBoxSelect}
                            title="Box Selection"
                          >
                            <Square className="h-2.5 w-2.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={handleLassoSelect}
                            title="Lasso Selection"
                          >
                            <Lasso className="h-2.5 w-2.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={handleClearSelection}
                            title="Clear Selection"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Download Button */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5"}
                        >
                          <Download className={isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleDownload("png")}>
                          <ImageIcon className="mr-2 h-3.5 w-3.5" />
                          <span>Download PNG</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload("pdf")}>
                          <File className="mr-2 h-3.5 w-3.5" />
                          <span>Download PDF</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload("csv")}>
                          <FileSpreadsheet className="mr-2 h-3.5 w-3.5" />
                          <span>Download CSV</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload("json")}>
                          <FileJson className="mr-2 h-3.5 w-3.5" />
                          <span>Download JSON</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      size="icon"
                      variant="ghost"
                      className={isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5"}
                      onClick={toggleFullscreen}
                      title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                      aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    >
                      {isFullscreen ? (
                        <Minimize2 className={isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} />
                      ) : (
                        <Maximize2 className={isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} />
                      )}
                    </Button>
                  </>
                ) : (
                  // Show only chart type toggle and delete button in template editor mode
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5"}
                      onClick={() => setChartType(chartType === "line" ? "bar" : "line")}
                      title={`Switch to ${chartType === "line" ? "Bar" : "Line"} Chart`}
                    >
                      {chartType === "line" ? (
                        <BarChart3 className={isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} />
                      ) : (
                        <LineChart className={isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} />
                      )}
                    </Button>
                    
                    {onDeleteGraph && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className={isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5 text-destructive hover:text-destructive/80 hover:bg-destructive/10"}
                        onClick={() => onDeleteGraph(id)}
                        title="Delete Graph"
                      >
                        <Trash2 className={isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} />
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <motion.div
              ref={chartContainerRef}
              layout
              className={cn(
                "h-full",
                "pt-1 pb-10",
                isFullscreen ? "flex items-center justify-center" : ""
              )}
            >
              <ChartContainer
                ref={chartRef as any}
                data={data}
                type={chartType}
                title={title}
                activeKPIs={localActiveKPIs}
                kpiColors={kpiColors}
                dateRange={effectiveDateRange}
                theme={theme}
                resolution={resolution}
                className={cn(
                  "p-0",
                  isFullscreen ? "h-[calc(100vh-10rem)]" : "h-full"
                )}
              />
            </motion.div>

            {/* KPI Parameters */}
            {kpiColors && Object.keys(kpiColors).length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-muted/10 border-t border-border/20">
                <div className="flex flex-wrap justify-center gap-1 py-1.5 px-2">
                  {Object.entries(kpiColors).map(([kpiId, kpi]) => {
                    if (!kpi || !kpi.color) return null;

                    return (
                      <button
                        key={kpiId}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                          isFullscreen ? "text-xs" : "text-[10px]"
                        } ${
                          localActiveKPIs.has(kpiId)
                            ? "bg-muted/20 opacity-100"
                            : "opacity-40"
                        } hover:bg-muted/30 transition-all`}
                        onClick={() => toggleKPI(kpiId)}
                      >
                        <span
                          className={cn("rounded-full flex-shrink-0", isFullscreen ? "w-3 h-3" : "w-2 h-2")}
                          style={{ backgroundColor: kpi.color }}
                        />
                        <span className={cn("truncate", isFullscreen ? "max-w-36" : "max-w-24", "text-foreground/70")}>
                          {kpi.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};

DraggableChart.displayName = "DraggableChart";

export default DraggableChart;



