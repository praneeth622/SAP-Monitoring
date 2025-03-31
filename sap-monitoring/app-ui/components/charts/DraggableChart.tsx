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

// Update the interface to properly make icon optional
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
  const chartRef = useRef<{
    zoomIn: () => void;
    zoomOut: () => void;
    boxSelect: () => void;
    lassoSelect: () => void;
    clearSelection: () => void;
    download: (format: "png" | "svg" | "pdf" | "csv" | "json") => void;
  }>(null);
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
    setLocalActiveKPIs(() => {
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
  }, [activeKPIs]);

  // Re-render when kpiColors or theme changes
  useEffect(() => {
    console.log("DraggableChart received theme update:", theme?.name);
    console.log("DraggableChart received kpiColors update:", kpiColors);
    // No state update needed, just trigger a re-render
  }, [kpiColors, theme]);

  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      const chart = chartRef.current;
      if (chart) {
        // Trigger chart resize after container resize
        requestAnimationFrame(() => {
          chart.resize?.();
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [isFullscreen]);

  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        toggleFullscreen();
      }
    };

    if (isFullscreen) {
      document.addEventListener("keydown", handleEscKey);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

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
      return next;
    });
  }, []);

  const toggleFullscreen = () => {
    setIsTransitioning(true);
    setIsFullscreen(!isFullscreen);

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false);
      if (chartRef.current) {
        const chart = chartRef.current.querySelector(".echarts-for-react");
        if (chart) {
          (chart as any).getEchartsInstance()?.resize();
        }
      }
    }, 300);
  };

  const effectiveDateRange = useGlobalDate ? globalDateRange : localDateRange;

  const handleDownload = useCallback(
    (format: "png" | "svg" | "pdf" | "csv" | "json") => {
      if (!containerRef.current) return;

      const chartElement =
        containerRef.current.querySelector(".echarts-for-react");
      if (!chartElement) {
        console.error("Chart element not found");
        return;
      }

      const chartInstance = (chartElement as any).getEchartsInstance?.();
      if (!chartInstance) {
        console.error("Chart instance not available");
        return;
      }

      try {
        switch (format) {
          case "png": {
            const url = chartInstance.getDataURL({
              type: "png",
              pixelRatio: 2,
              backgroundColor: "#fff",
            });
            saveAs(url, `chart-${title}.png`);
            break;
          }
          case "pdf": {
            const url = chartInstance.getDataURL({
              type: "png",
              pixelRatio: 2,
              backgroundColor: "#fff",
            });
            const pdf = new jsPDF({
              orientation: "landscape",
              unit: "px",
            });
            const imgProps = pdf.getImageProperties(url);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            pdf.addImage(url, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save(`chart-${title}.pdf`);
            break;
          }
          case "csv": {
            const csvContent = data
              .map((row) => Object.values(row).join(","))
              .join("\n");
            const blob = new Blob([csvContent], {
              type: "text/csv;charset=utf-8;",
            });
            saveAs(blob, `chart-${title}.csv`);
            break;
          }
          case "json": {
            const blob = new Blob([JSON.stringify(data, null, 2)], {
              type: "application/json",
            });
            saveAs(blob, `chart-${title}.json`);
            break;
          }
          default:
            console.warn(`Unsupported download format: ${format}`);
        }
      } catch (error) {
        console.error("Error downloading chart:", error);
      }
    },
    [data, title]
  );

  const handleZoomIn = useCallback(() => {
    chartRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    chartRef.current?.zoomOut();
  }, []);

  const handleBoxSelect = useCallback(() => {
    chartRef.current?.boxSelect();
  }, []);

  const handleLassoSelect = useCallback(() => {
    chartRef.current?.lassoSelect();
  }, []);

  const handleClearSelection = useCallback(() => {
    chartRef.current?.clearSelection();
  }, []);

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          className,
          "relative group touch-none",
          isFullscreen && "fixed inset-0 z-50"
        )}
      >
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-md z-40"
              onClick={toggleFullscreen}
            />
          )}
        </AnimatePresence>

        <motion.div
          ref={containerRef}
          layout
          transition={{
            layout: { duration: 0.3, ease: "easeInOut" },
          }}
          className={cn(
            "relative w-full h-full transition-all duration-300",
            isFullscreen && "fixed inset-4 z-50"
          )}
        >
          <Card
            className={cn(
              "w-full h-full overflow-hidden bg-card/90 backdrop-blur-sm border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300",
              isFullscreen && "rounded-xl flex flex-col"
            )}
          >
            {isTransitioning && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}

            <div className="absolute top-0 left-0 right-0 flex flex-col">
              {/* Title Bar */}
              <div className="h-8 bg-card/95 backdrop-blur-sm border-b border-border/40 px-2 flex items-center justify-between z-30">
                <div className="flex items-center gap-1">
                  {!isFullscreen && (
                    <div
                      className="p-1 rounded-lg cursor-grab hover:bg-accent/40 transition-all duration-300"
                      {...attributes}
                      {...listeners}
                    >
                      <GripHorizontal className="w-3 h-3 text-muted-foreground" />
                    </div>
                  )}
                  <h3 className="text-xs font-medium text-foreground/90 truncate max-w-[150px]">
                    {title}
                  </h3>
                </div>

                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => setUseGlobalDate(!useGlobalDate)}
                  >
                    <Calendar
                      className={`h-3 w-3 ${
                        useGlobalDate ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() =>
                      setChartType((prev) => (prev === "line" ? "bar" : "line"))
                    }
                  >
                    {chartType === "line" ? (
                      <BarChart2 className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <LineChart className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>

                  {/* Tools Button with Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Settings2 className="h-3 w-3 text-muted-foreground" />
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
                          className="h-7 w-7"
                          onClick={handleZoomIn}
                          title="Zoom In"
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleZoomOut}
                          title="Zoom Out"
                        >
                          <ZoomOut className="h-3.5 w-3.5" />
                        </Button>

                        <div className="w-[1px] h-7 bg-border mx-0.5" />

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleBoxSelect}
                          title="Box Selection"
                        >
                          <Square className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleLassoSelect}
                          title="Lasso Selection"
                        >
                          <Lasso className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={handleClearSelection}
                          title="Clear Selection"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Download Button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Download className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleDownload("png")}>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        <span>Download PNG</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload("pdf")}>
                        <File className="h-4 w-4 mr-2" />
                        <span>Download PDF</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload("csv")}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        <span>Download CSV</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload("json")}>
                        <FileJson className="h-4 w-4 mr-2" />
                        <span>Download JSON</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Maximize2 className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {!useGlobalDate && (
              <div className="absolute top-8 left-0 right-0 bg-muted/30 backdrop-blur-sm border-b border-border/40 p-1 z-20">
                <DateRangePicker
                  date={localDateRange}
                  onDateChange={setLocalDateRange}
                  className="w-full"
                  showTime
                  align="start"
                />
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-1 pb-1">
              {/* Range Selector */}
              <div className="px-3">
                {/* Your existing range selector component */}
              </div>

              {/* KPI Parameters - Only render if kpiColors exists and has entries */}
              {kpiColors && Object.keys(kpiColors).length > 0 && (
                <div className="flex items-center justify-center gap-1 px-3">
                  {Object.entries(kpiColors || {}).map(([kpiId, kpi]) => {
                    // Skip if kpi is missing color or name
                    if (!kpi || !kpi.color) {
                      console.warn(`Missing color for KPI: ${kpiId}`);
                      return null;
                    }
                    
                    const Icon = kpi.icon; // This might be undefined, handle it below
                    const parameterButtonClasses = `flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all duration-300 text-[0.65em] md:text-[0.7em] lg:text-[0.75em] ${
                      localActiveKPIs.has(kpiId)
                        ? "bg-accent/70 text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/40"
                    }`;
                    
                    return (
                      <button
                        key={kpiId}
                        onClick={() => toggleKPI(kpiId)}
                        className={parameterButtonClasses}
                        style={{
                          color: localActiveKPIs.has(kpiId)
                            ? kpi.color
                            : undefined,
                        }}
                        title={`Toggle ${kpi.name}`}
                      >
                        {Icon && <Icon className="w-[1em] h-[1em]" />}
                        <span className="font-medium whitespace-nowrap">
                          {kpi.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <motion.div
              ref={chartRef}
              layout
              className={cn(
                "h-full",
                !useGlobalDate ? "pt-10" : "pt-6", // Reduced padding-top
                isFullscreen && "flex items-center justify-center"
              )}
            >
              <ChartContainer
                ref={chartRef}
                data={data}
                type={chartType}
                title={title}
                activeKPIs={localActiveKPIs}
                kpiColors={kpiColors}
                dateRange={effectiveDateRange}
                theme={theme}
                className={cn(
                  "p-0",
                  isFullscreen ? "h-[calc(100vh-10rem)]" : "h-full"
                )}
              />
            </motion.div>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

DraggableChart.displayName = "DraggableChart";

export default DraggableChart;
