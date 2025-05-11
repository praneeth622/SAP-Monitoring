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
  Image as ImageIcon,
  File,
  FileSpreadsheet,
  FileJson,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Edit,
  Box,
  X,
  RotateCcw,
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
import styles from "./TemplateChartStyles.module.css";
import { fetchTemplateChartData } from "@/utils/data";
import isEqual from "lodash/isEqual";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

// Add onEditGraph to the props interface
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
  onEditGraph?: (id: string) => void; // Add this new prop
  resolution?: string; // Add resolution as a prop
  isLoading?: boolean; // Add this line
  isTemplatePage?: boolean; // Add this new prop for templates page detection
}

// Then update the component parameters with default values
export const DraggableChart: React.FC<DraggableChartProps> = ({
  id,
  data,
  type,
  title,
  className,
  activeKPIs = new Set(),
  kpiColors = {},
  globalDateRange,
  theme,
  onFullscreenChange,
  isFullscreenMode,
  hideControls = false,
  onDeleteGraph,
  onEditGraph, // Add this new prop
  resolution = "auto",
  isLoading = false, // Add this with default
  isTemplatePage = false, // Default to false
}) => {
  const [chartType, setChartType] = useState<ChartType>(type);
  const [localActiveKPIs, setLocalActiveKPIs] = useState<Set<string>>(() => {
    if (Array.isArray(activeKPIs)) {
      return new Set(activeKPIs);
    }
    if (activeKPIs instanceof Set) {
      return activeKPIs;
    }
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
  const chartRef = useRef<
    HTMLDivElement & {
      zoomIn: () => void;
      zoomOut: () => void;
      resetZoom: () => void;
      boxSelect: () => void;
      lassoSelect: () => void;
      clearSelection: () => void;
      download: (format: "png" | "svg" | "pdf" | "csv" | "json") => void;
      dispatchAction?: (action: any) => void;
      isValid?: () => boolean;
      toggleFullscreen: () => void;
    }
  >(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();
  const prevThemeRef = useRef(theme);
  const [localData, setLocalData] = useState<DataPoint[] | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const prevLocalRangeRef = useRef<DateRange | undefined>();
  const [showLocalDatePicker, setShowLocalDatePicker] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // Add theme change detection
  useEffect(() => {
    if (prevThemeRef.current !== theme) {
      prevThemeRef.current = theme;
      // Force a resize to ensure chart updates properly
      if (chartRef.current?.isValid?.()) {
        try {
          chartRef.current.dispatchAction?.({
            type: "resize",
          });
        } catch (error) {
          console.error("Error resizing chart after theme change:", error);
        }
      }
    }
  }, [theme]);

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
            type: "update",
            notMerge: true,
            replaceMerge: ["series"],
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
            type: "resize",
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
            if (
              chartRef.current?.dispatchAction &&
              chartRef.current.isValid?.()
            ) {
              chartRef.current.dispatchAction({
                type: "resize",
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
            type: "resize",
          });

          // Try once more after a longer delay to catch any delayed layout changes
          setTimeout(() => {
            if (
              chartRef.current?.dispatchAction &&
              chartRef.current.isValid?.()
            ) {
              try {
                chartRef.current.dispatchAction({
                  type: "resize",
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
      if (e.key === "Escape" && isFullscreen) {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
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

  const handleResetZoom = useCallback(() => {
    if (!chartRef.current || !chartRef.current.isValid?.()) return;
    try {
      chartRef.current.resetZoom();
    } catch (error) {
      console.error("Error resetting zoom:", error);
    }
    // Resetting zoom doesn't change the selected tool
  }, []);

  const handleBoxSelect = useCallback(() => {
    if (!chartRef.current || !chartRef.current.isValid?.()) return;
    try {
      chartRef.current.boxSelect();
      setSelectedTool("box");
    } catch (error) {
      console.error("Error in box selection:", error);
      setSelectedTool(null);
    }
  }, []);

  const handleLassoSelect = useCallback(() => {
    if (!chartRef.current || !chartRef.current.isValid?.()) return;
    try {
      chartRef.current.lassoSelect();
      setSelectedTool("lasso");
    } catch (error) {
      console.error("Error in lasso selection:", error);
      setSelectedTool(null);
    }
  }, []);

  const handleClearSelection = useCallback(() => {
    if (!chartRef.current || !chartRef.current.isValid?.()) return;
    try {
      chartRef.current.clearSelection();
      setSelectedTool(null);
    } catch (error) {
      console.error("Error clearing selection:", error);
      setSelectedTool(null);
    }
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

  // Add state for dynamic font size
  const [titleFontSize, setTitleFontSize] = useState(7);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Add effect to calculate and update font size based on container width
  useEffect(() => {
    const updateFontSize = () => {
      if (!titleRef.current || !containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const titleWidth = titleRef.current.scrollWidth;
      const containerHeight = containerRef.current.offsetHeight;
      
      // Increase base font size and scaling factors
      let newFontSize = Math.min(
        Math.max(11, containerWidth * 0.04), // Increased base size and width scaling
        containerHeight * 0.06  // Increased height scaling
      );
      
      // Adjust if title is too long, but maintain minimum readable size
      if (titleWidth > containerWidth * 0.9) {
        const scaleFactor = (containerWidth * 0.9) / titleWidth;
        newFontSize = Math.max(11, newFontSize * scaleFactor); // Never go below 11px
      }
      
      // Ensure font size stays within readable bounds
      newFontSize = Math.max(11, Math.min(newFontSize, isFullscreen ? 14 : 13));
      
      setTitleFontSize(Math.floor(newFontSize));
    };

    // Create resize observer
    const resizeObserver = new ResizeObserver(updateFontSize);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Initial calculation
    updateFontSize();

    return () => {
      resizeObserver.disconnect();
    };
  }, [isFullscreen]);

  // Helper to check if local range is outside global range
  function isOutsideGlobal(local: DateRange | undefined, global: DateRange | undefined) {
    if (!local?.from || !local?.to || !global?.from || !global?.to) return false;
    return local.from < global.from || local.to > global.to;
  }

  useEffect(() => {
    if (!useGlobalDate && localDateRange && globalDateRange) {
      if (isOutsideGlobal(localDateRange, globalDateRange)) {
        if (isEqual(prevLocalRangeRef.current, localDateRange)) return;
        prevLocalRangeRef.current = localDateRange;
        // Only call fetchTemplateChartData if both from and to are defined
        if (localDateRange.from && localDateRange.to) {
          setLocalLoading(true);
          const kpiList = Array.isArray(activeKPIs)
            ? activeKPIs
            : Array.from(localActiveKPIs);
          fetchTemplateChartData(
            kpiList[0] || title,
            kpiList.slice(1),
            "OS",
            { from: localDateRange.from, to: localDateRange.to },
            resolution,
            { graphId: id }
          ).then((result) => {
            setLocalData(result);
            setLocalLoading(false);
          }).catch(() => {
            setLocalData([]);
            setLocalLoading(false);
          });
        }
      } else {
        setLocalData(null);
      }
    } else {
      setLocalData(null);
    }
  }, [localDateRange, useGlobalDate, globalDateRange, resolution, id, title, activeKPIs, localActiveKPIs]);

  return (
    <>
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={toggleFullscreen}
        />
      )}
      <div
        ref={setNodeRef}
        style={!isFullscreen ? style : undefined}
        className={cn(
          "relative group touch-none",
          isFullscreen &&
            "fixed inset-0 z-50 flex items-center justify-center p-8",
          isTemplatePage && styles.templateChart,
          !isTemplatePage && styles.resizePrevention,
          styles.globalStyles
        )}
      >
        <div
          ref={containerRef}
          className={cn(
            "relative w-full h-full transition-all duration-300",
            isFullscreen && "w-[90vw] h-[85vh] max-w-[1600px] max-h-[900px]",
            isTemplatePage && styles.templateChart
          )}
          style={isTemplatePage ? { resize: 'none' } : undefined}
        >
          <Card
            ref={cardRef}
            className={cn(
              "w-full h-full overflow-hidden bg-card/90 backdrop-blur-sm border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300",
              isFullscreen && "rounded-xl flex flex-col shadow-2xl",
              isTemplatePage && styles.templateChart,
              styles.chartControls
            )}
            style={isTemplatePage ? { resize: 'none' } : undefined}
          >
            {isTransitioning && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}

            {/* Add loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}

            <div className="flex h-6 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <div className="flex items-center gap-2">
                {!isFullscreen && !isTemplatePage && (
                  <div
                    className="p-0.5 rounded-lg cursor-grab hover:bg-accent/40 transition-all duration-300 chart-drag-handle"
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
                <h3
                  ref={titleRef}
                  className={cn(
                    "font-medium chart-title text-muted-foreground",
                    "transition-all duration-200",
                    isFullscreen ? "py-1.5" : "py-1"
                  )}
                  style={{ 
                    userSelect: 'none',
                    fontSize: `${titleFontSize}px`,
                    width: '100%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.3',
                    padding: '0 8px',
                    textAlign: 'center',
                    fontWeight: 630,
                    letterSpacing: '-0.01em',
                    color: '#4B5563', // Darker color for better readability
                    textShadow: '0 0 1px rgba(0,0,0,0.05)' // Subtle text shadow for better contrast
                  }}
                  title={title.replace(/\./g, '')} // Show full title on hover
                >
                  {title.replace(/\./g, '')}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {!hideControls ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Popover open={showLocalDatePicker} onOpenChange={setShowLocalDatePicker}>
                        <PopoverTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className={cn(
                              isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5",
                              !useGlobalDate && "bg-accent/20"
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              if (useGlobalDate) {
                                setUseGlobalDate(false);
                                setShowLocalDatePicker(true);
                              } else {
                                setShowLocalDatePicker((prev) => !prev);
                              }
                            }}
                            title={
                              useGlobalDate
                                ? "Use Local Date Range"
                                : "Use Global Date Range"
                            }
                          >
                            <Calendar
                              className={
                                isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
                              }
                            />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" side="bottom" className="p-0 w-auto">
                          <DateRangePicker
                            date={localDateRange}
                            onDateChange={(range) => {
                              setLocalDateRange(range);
                              if (range?.from && range?.to) {
                                setUseGlobalDate(false); // Stay in local mode after apply
                                setShowLocalDatePicker(false); // Close popover after apply
                              }
                            }}
                            align="end"
                            showTime={true}
                          />
                        </PopoverContent>
                      </Popover>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5"}
                        onClick={() =>
                          setChartType(chartType === "line" ? "bar" : "line")
                        }
                        title={`Switch to ${
                          chartType === "line" ? "Bar" : "Line"
                        } Chart`}
                      >
                        {chartType === "line" ? (
                          <BarChart3
                            className={
                              isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
                            }
                          />
                        ) : (
                          <LineChart
                            className={
                              isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
                            }
                          />
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
                            <Settings2
                              className={
                                isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
                              }
                            />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          side="bottom"
                          className="w-auto"
                        >
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

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4"
                              onClick={handleResetZoom}
                              title="Reset Zoom"
                            >
                              <RotateCcw className="h-2.5 w-2.5" />
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
                            <Download
                              className={
                                isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
                              }
                            />
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
                          <DropdownMenuItem
                            onClick={() => handleDownload("json")}
                          >
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
                        title={
                          isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"
                        }
                        aria-label={
                          isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"
                        }
                      >
                        {isFullscreen ? (
                          <Minimize2
                            className={
                              isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
                            }
                          />
                        ) : (
                          <Maximize2
                            className={
                              isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
                            }
                          />
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  // Show only chart type toggle and delete button in template editor mode
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5"}
                      onClick={() =>
                        setChartType(chartType === "line" ? "bar" : "line")
                      }
                      title={`Switch to ${
                        chartType === "line" ? "Bar" : "Line"
                      } Chart`}
                    >
                      {chartType === "line" ? (
                        <BarChart3
                          className={
                            isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
                          }
                        />
                      ) : (
                        <LineChart
                          className={
                            isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
                          }
                        />
                      )}
                    </Button>

                    {/* Add Edit Button */}
                    {onEditGraph && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className={isFullscreen ? "h-5 w-5" : "h-3.5 w-3.5"}
                        onClick={() => onEditGraph && onEditGraph(id)}
                        title="Edit Graph"
                      >
                        <Edit className={isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"} />
                      </Button>
                    )}

                    {onDeleteGraph && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className={
                          isFullscreen
                            ? "h-5 w-5"
                            : "h-3.5 w-3.5 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        }
                        onClick={() => onDeleteGraph(id)}
                        title="Delete Graph"
                      >
                        <Trash2
                          className={
                            isFullscreen ? "h-3.5 w-3.5" : "h-2.5 w-2.5"
                          }
                        />
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
                "pt-1 pb-8",
                isFullscreen ? "flex items-center justify-center" : ""
              )}
            >
              <ChartContainer
                ref={chartRef as any}
                data={localData !== null ? localData : data}
                type={chartType}
                title=""
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
              {localLoading && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              )}
            </motion.div>

            {/* KPI Parameters */}
            {kpiColors && Object.keys(kpiColors).length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-muted/10 border-t border-border/20" style={{ userSelect: 'none' }}>
                <div className="flex items-center justify-evenly px-2 py-1" style={{ userSelect: 'none' }}>
                  {Object.entries(kpiColors).map(([kpiId, kpi]) => {
                    if (!kpi || !kpi.color) return null;
                    
                    // Adjust max width based on number of KPIs
                    const kpiCount = Object.keys(kpiColors).length;
                    const maxWidthClass = kpiCount > 5 ? "max-w-16" : 
                                         kpiCount > 3 ? "max-w-20" : "max-w-24";
                    
                    return (
                      <button
                        key={kpiId}
                        className={`flex items-center flex-shrink-0 gap-1 rounded ${
                          isFullscreen ? "text-xs" : "text-[10px]"
                        } ${
                          localActiveKPIs.has(kpiId)
                            ? "bg-muted/20 opacity-100"
                            : "opacity-60 hover:opacity-90"
                        } hover:bg-muted/30 transition-all px-1.5 py-0.5`}
                        onClick={() => toggleKPI(kpiId)}
                        title={kpi.name}
                      >
                        <span
                          className={cn(
                            "rounded-full flex-shrink-0",
                            isFullscreen ? "w-3 h-3" : "w-2 h-2"
                          )}
                          style={{ backgroundColor: kpi.color }}
                        />
                        <span
                          className={cn(
                            "truncate",
                            isFullscreen ? "max-w-32" : maxWidthClass,
                            "text-foreground/70"
                          )}
                          style={{ userSelect: 'none' }}
                        >
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
