"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import React, { memo, useImperativeHandle } from "react";
import * as echarts from "echarts";
import { ChartType, DataPoint } from "@/types";
import { ChartToolbar } from "./ChartToolbar";
import { DateRange } from "react-day-picker";
import dayjs from "dayjs";
import type { EChartsOption, ECharts } from "echarts";
import { cn } from "@/lib/utils";
import { Download } from "./ChartContainer";
import { DateRangePicker } from "@/components/date-range-picker";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { saveAs } from "file-saver";
import { Button } from "../ui/button";
import { jsPDF } from "jspdf";

interface ChartContainerProps {
  data: DataPoint[];
  type: ChartType;
  title: string;
  activeKPIs: Set<string> | string[] | undefined;
  kpiColors: Record<string, { color: string; name: string }> | undefined;
  dateRange?: DateRange;
  className?: string;
  options?: echarts.EChartsOption;
  theme?: {
    name: string;
    colors: string[];
  };
  width?: string;
  height?: string;
}

const ChartContainer = memo(
  React.forwardRef<
    {
      zoomIn: () => void;
      zoomOut: () => void;
      boxSelect: () => void;
      lassoSelect: () => void;
      clearSelection: () => void;
      download: (format: "png" | "svg" | "pdf" | "csv" | "json") => void;
      dispatchAction?: (action: any) => void;
    },
    ChartContainerProps
  >((props, ref) => {
    const {
      data,
      type,
      title,
      activeKPIs,
      kpiColors,
      dateRange,
      className,
      options: externalOptions,
      theme,
      width,
      height,
    } = props;

    const chartRef = useRef<echarts.ECharts | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectedTool, setSelectedTool] = useState<"box" | "lasso" | null>(
      null
    );
    const [mounted, setMounted] = useState(false);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    const filteredData = React.useMemo(() => {
      if (!dateRange?.from || !dateRange?.to) return data;
      return data.filter((item) => {
        const itemDate = dayjs(item.date);
        const fromDate = dayjs(dateRange.from).startOf("day");
        const toDate = dayjs(dateRange.to).endOf("day");
        // Include both from and to dates in the range (inclusive)
        return (
          (itemDate.isAfter(fromDate) || itemDate.isSame(fromDate)) &&
          (itemDate.isBefore(toDate) || itemDate.isSame(toDate))
        );
      });
    }, [data, dateRange]);

    const initChart = useCallback(() => {
      if (!chartContainerRef.current) return;

      if (chartRef.current) {
        chartRef.current.dispose();
      }

      const chart = echarts.init(chartContainerRef.current);

      // Add brush component during initialization
      chart.setOption({
        brush: {
          toolbox: ["rect", "polygon", "keep", "clear"],
          xAxisIndex: 0,
          brushLink: "all",
          outOfBrush: {
            colorAlpha: 0.1,
          },
          brushStyle: {
            borderWidth: 1,
            color: "rgba(80, 100, 150, 0.2)",
            borderColor: "rgba(80, 100, 150, 0.8)",
          },
        },
        toolbox: {
          feature: {
            brush: {
              type: ["rect", "polygon", "keep", "clear"],
            },
          },
          show: false, // Hide the built-in toolbox
        },
      });

      chartRef.current = chart;
      setMounted(true);

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }

      resizeObserverRef.current = new ResizeObserver((entries) => {
        if (chartRef.current) {
          requestAnimationFrame(() => {
            chartRef.current?.resize();
          });
        }
      });

      resizeObserverRef.current.observe(chartContainerRef.current);
    }, []);

    useEffect(() => {
      initChart();

      return () => {
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }
        if (chartRef.current) {
          chartRef.current.dispose();
          chartRef.current = null;
        }
      };
    }, [initChart]);

    const updateChart = useCallback(() => {
      if (!chartRef.current || !filteredData || filteredData.length === 0) {
        console.warn("No data to display or chart not initialized");
        return;
      }

      const uniqueCategories = Array.from(
        new Set(filteredData.map((item) => item.category))
      );

      const categories = uniqueCategories.filter((category) => {
        if (!activeKPIs) return true;
        if (Array.isArray(activeKPIs)) {
          return activeKPIs.includes(category);
        } else if (activeKPIs instanceof Set) {
          return activeKPIs.has(category);
        }
        return true;
      });

      if (categories.length === 0) {
        console.warn("No categories match activeKPIs, showing all categories");
        categories.push(...uniqueCategories);
      }

      const dates = Array.from(
        new Set(filteredData.map((item) => item.date))
      ).sort();

      const series = categories.map((category, index) => {
        const defaultColor =
          theme?.colors && theme.colors.length > 0
            ? theme.colors[index % theme.colors.length]
            : `hsl(${(index * 60) % 360}, 70%, 50%)`;
        const color = kpiColors?.[category]?.color || defaultColor;

        const categoryData = dates.map((date) => {
          const points = filteredData.filter(
            (p) => p.date === date && p.category === category
          );
          return points.length > 0
            ? points.reduce((sum, p) => sum + p.value, 0)
            : null;
        });

        return {
          name: kpiColors?.[category]?.name || category,
          type: type,
          data: categoryData,
          itemStyle: { color },
          emphasis: {
            focus: "series",
            itemStyle: {
              shadowBlur: 10,
              shadowColor: color,
            },
          },
          areaStyle: type === "line" ? { opacity: 0.2 } : undefined,
          lineStyle: type === "line" ? { width: 2 } : undefined,
          smooth: true,
        };
      });

      const option: echarts.EChartsOption = {
        animation: true,
        grid: {
          top: 5, // Reduced from 10 to minimize space below chart title
          right: 10,
          bottom: 40, // Keep bottom space for the slider
          left: 35, // Reduced from 50 to use more space on the left side
          containLabel: true, // Important: this ensures labels are included in the layout calculation
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "cross" },
          confine: true, // Keep tooltips within chart area
        },
        // Keep the existing dataZoom configuration
        dataZoom: [
          // Inside zoom functionality
          {
            type: "inside",
            start: 0,
            end: 100,
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
          },
          // Range selector slider
          {
            show: true,
            type: "slider",
            bottom: 10, // Position from bottom
            height: 15, // Height of slider
            borderColor: "transparent",
            backgroundColor: "rgba(200,200,200,0.15)",
            fillerColor: "rgba(144,197,237,0.1)",
            handleStyle: {
              color: "#fff",
              shadowBlur: 2,
              shadowColor: "rgba(0,0,0,0.2)",
              shadowOffsetX: 0,
              shadowOffsetY: 1,
            },
            textStyle: {
              fontSize: "0.7em", // Relative font size
              color: "#666",
              margin: 2,
            },
            moveHandleStyle: {
              opacity: 0.3,
            },
          },
        ],
        xAxis: {
          type: "category",
          data: dates,
          axisLabel: {
            formatter: (value: string) => dayjs(value).format("MMM DD HH:mm"),
            fontSize: 10, // Smaller font to avoid overflow
          },
        },
        yAxis: {
          type: "value",
          splitLine: {
            lineStyle: { color: "rgba(120, 120, 120, 0.1)" },
          },
          
          nameLocation: "middle",
          nameGap: 25, // Space between name and axis
          nameTextStyle: {
            fontSize: 10,
            padding: [0, 0, 0, 0],
          },
          axisLabel: {
            formatter: (value: number) => {
              if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
              if (value >= 1000) return (value / 1000).toFixed(1) + "K";
              return value;
            },
            fontSize: 10, // Smaller font size to save space
            margin: 4, // Reduce margin to save space
            align: "right", // Better alignment for y-axis values
          },
        },
        series,
      };

      try {
        chartRef.current.setOption(option, { notMerge: true });
      } catch (error) {
        console.error("Error rendering chart:", error);
      }
    }, [filteredData, type, activeKPIs, kpiColors, theme]);

    useEffect(() => {
      if (!mounted || !chartRef.current) return;

      if (externalOptions) {
        chartRef.current.setOption(externalOptions, { notMerge: true });
      } else {
        updateChart();
      }
    }, [mounted, updateChart, externalOptions]);

    const zoomIn = useCallback(() => {
      if (!chartRef.current) return;

      const option = chartRef.current.getOption();
      const dataZoom = option.dataZoom?.[0] as any;

      if (!dataZoom) return;

      const range = dataZoom.end - dataZoom.start;
      const center = (dataZoom.start + dataZoom.end) / 2;
      const newRange = Math.max(range * 0.5, 10); // Limit minimum range to 10%
      const newStart = Math.max(0, center - newRange / 2);
      const newEnd = Math.min(100, center + newRange / 2);

      requestAnimationFrame(() => {
        chartRef.current?.dispatchAction({
          type: "dataZoom",
          start: newStart,
          end: newEnd,
          xAxisIndex: 0,
        });
      });
    }, []);

    const zoomOut = useCallback(() => {
      if (!chartRef.current) return;

      const option = chartRef.current.getOption();
      const dataZoom = option.dataZoom?.[0] as any;

      if (!dataZoom) return;

      const range = dataZoom.end - dataZoom.start;
      const center = (dataZoom.start + dataZoom.end) / 2;
      const newRange = Math.min(range * 2, 100); // Limit maximum range to 100%
      const newStart = Math.max(0, center - newRange / 2);
      const newEnd = Math.min(100, center + newRange / 2);

      requestAnimationFrame(() => {
        chartRef.current?.dispatchAction({
          type: "dataZoom",
          start: newStart,
          end: newEnd,
          xAxisIndex: 0,
        });
      });
    }, []);

    const boxSelect = useCallback(() => {
      if (!chartRef.current) return;

      // First, clear any existing brushes
      chartRef.current.dispatchAction({
        type: "brush",
        command: "clear",
        areas: [],
      });

      // Enable box selection with proper options
      chartRef.current.dispatchAction({
        type: "takeGlobalCursor",
        key: "brush",
        brushOption: {
          brushType: "rect",
          brushMode: "single",
          transformable: true,
          brushStyle: {
            borderWidth: 1,
            color: "rgba(120, 140, 180, 0.3)",
            borderColor: "rgba(120, 140, 180, 0.8)",
          },
        },
      });

      setSelectedTool("box");
      setIsSelecting(true);

      // Make sure brush component is properly configured
      chartRef.current.setOption(
        {
          brush: {
            toolbox: ["rect", "keep", "clear"],
            xAxisIndex: 0,
            brushLink: "all",
            outOfBrush: {
              colorAlpha: 0.1,
            },
            throttleType: "debounce",
            throttleDelay: 100,
          },
        },
        { replaceMerge: ["brush"] }
      );
    }, []);

    const lassoSelect = useCallback(() => {
      if (!chartRef.current) return;

      // First, clear any existing brushes
      chartRef.current.dispatchAction({
        type: "brush",
        command: "clear",
        areas: [],
      });

      // Enable polygon selection with proper options
      chartRef.current.dispatchAction({
        type: "takeGlobalCursor",
        key: "brush",
        brushOption: {
          brushType: "polygon",
          brushMode: "single",
          transformable: true,
          brushStyle: {
            borderWidth: 1,
            color: "rgba(120, 140, 180, 0.3)",
            borderColor: "rgba(120, 140, 180, 0.8)",
          },
        },
      });

      setSelectedTool("lasso");
      setIsSelecting(true);

      // Make sure brush component is properly configured for polygon selection
      chartRef.current.setOption(
        {
          brush: {
            toolbox: ["polygon", "keep", "clear"],
            xAxisIndex: 0,
            brushLink: "all",
            outOfBrush: {
              colorAlpha: 0.1,
            },
            throttleType: "debounce",
            throttleDelay: 100,
          },
        },
        { replaceMerge: ["brush"] }
      );
    }, []);

    const clearSelection = useCallback(() => {
      if (!chartRef.current) return;

      // Clear all brushes and reset selection state
      chartRef.current.dispatchAction({
        type: "brush",
        command: "clear",
        areas: [],
      });

      // Reset cursor by disabling brush mode
      chartRef.current.dispatchAction({
        type: "takeGlobalCursor",
        key: "brush",
        brushOption: null,
      });

      // Reset selection state
      setSelectedTool(null);
      setIsSelecting(false);

      // Update all series to show them normally
      const option = chartRef.current.getOption();
      const series = option.series;

      if (Array.isArray(series)) {
        chartRef.current.setOption(
          {
            series: series.map((s: any) => ({
              ...s,
              itemStyle: {
                ...s.itemStyle,
                opacity: 1,
              },
            })),
          },
          { replaceMerge: ["series"] }
        );
      }
    }, []);

    const download = useCallback(
      (format: "png" | "svg" | "pdf" | "csv" | "json") => {
        if (!chartRef.current) return;

        try {
          switch (format) {
            case "png": {
              const url = chartRef.current.getDataURL({
                type: "png",
                pixelRatio: 2,
                backgroundColor: "#ffffff",
              });
              const link = document.createElement("a");
              link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.png`;
              link.href = url;
              link.click();
              break;
            }
            case "svg": {
              const url = chartRef.current.getDataURL({
                type: "svg",
                pixelRatio: 2,
                backgroundColor: "#ffffff",
              });
              const link = document.createElement("a");
              link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.svg`;
              link.href =
                "data:image/svg+xml;charset=utf-8," + encodeURIComponent(url);
              link.click();
              break;
            }
            case "pdf": {
              const url = chartRef.current.getDataURL({
                type: "png",
                pixelRatio: 2,
                backgroundColor: "#ffffff",
              });

              const pdf = new jsPDF({
                orientation: "landscape",
                unit: "px",
                format: "a4",
              });

              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();
              const imgWidth = chartRef.current.getWidth();
              const imgHeight = chartRef.current.getHeight();

              const ratio = Math.min(
                pdfWidth / imgWidth,
                pdfHeight / imgHeight
              );
              const width = imgWidth * ratio;
              const height = imgHeight * ratio;
              const x = (pdfWidth - width) / 2;
              const y = (pdfHeight - height) / 2;

              pdf.addImage(url, "PNG", x, y, width, height);
              pdf.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
              break;
            }
            case "csv": {
              if (!filteredData || !filteredData.length) {
                console.error("No data available for CSV export");
                return;
              }

              const headers = ["category", "date", "value"];
              const csvContent = [
                headers.join(","),
                ...filteredData.map((row) =>
                  headers
                    .map((header) => {
                      const cell = row[header as keyof DataPoint];
                      return typeof cell === "string" && cell.includes(",")
                        ? `"${cell}"`
                        : cell;
                    })
                    .join(",")
                ),
              ].join("\n");

              const blob = new Blob([csvContent], {
                type: "text/csv;charset=utf-8;",
              });
              saveAs(blob, `${title.toLowerCase().replace(/\s+/g, "-")}.csv`);
              break;
            }
            case "json": {
              if (!filteredData) {
                console.error("No data available for JSON export");
                return;
              }
              const blob = new Blob([JSON.stringify(filteredData, null, 2)], {
                type: "application/json",
              });
              saveAs(blob, `${title.toLowerCase().replace(/\s+/g, "-")}.json`);
              break;
            }
          }
        } catch (error) {
          console.error(`Failed to download chart as ${format}:`, error);
        }
      },
      [filteredData, title]
    );

    const dispatchAction = useCallback((action: any) => {
      if (!chartRef.current) return;
      chartRef.current.dispatchAction(action);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        zoomIn,
        zoomOut,
        boxSelect,
        lassoSelect,
        clearSelection,
        download,
        dispatchAction,
      }),
      [
        zoomIn,
        zoomOut,
        boxSelect,
        lassoSelect,
        clearSelection,
        download,
        dispatchAction,
      ]
    );

    useEffect(() => {
      if (!mounted || !chartRef.current) return;

      const currentOption = chartRef.current.getOption();
      const updatedOption: echarts.EChartsOption = {
        ...currentOption,
        brush: {
          toolbox: ["rect", "polygon", "keep", "clear"],
          xAxisIndex: 0,
          brushLink: "all",
          outOfBrush: {
            colorAlpha: 0.1,
          },
        },
        toolbox: {
          feature: {
            brush: {
              type: ["rect", "polygon", "clear"],
            },
          },
          show: false,
        },
      };

      chartRef.current.setOption(updatedOption, {
        replaceMerge: ["brush", "toolbox"],
      });
    }, [mounted]);

    useEffect(() => {
      if (!chartRef.current) return;

      const chart = chartRef.current;

      const onBrushSelected = (params: any) => {
        console.log("Brush selected:", params);
        setIsSelecting(false);
        setSelectedTool(null);
      };

      chart.on("brushSelected", onBrushSelected);

      return () => {
        chart.off("brushSelected", onBrushSelected);
      };
    }, [mounted]);

    // Add this useEffect hook for improved brush event handling
    useEffect(() => {
      if (!chartRef.current) return;

      const chart = chartRef.current;

      // Handle brush events
      const handleBrushSelected = (params: any) => {
        console.log("Brush selected event triggered:", params);

        // Don't automatically clear selection, let user manually clear
        if (!params.areas || params.areas.length === 0) {
          setIsSelecting(false);
        }
      };

      const handleBrushEnd = (params: any) => {
        console.log("Brush end event triggered:", params);
        // Keep the selection tool active but mark selection as complete
        setIsSelecting(false);
      };

      // Add event listeners
      chart.on("brushSelected", handleBrushSelected);
      chart.on("brushEnd", handleBrushEnd);

      return () => {
        // Remove event listeners when component unmounts or re-renders
        chart.off("brushSelected", handleBrushSelected);
        chart.off("brushEnd", handleBrushEnd);
      };
    }, [mounted]);

    return (
      <div
        ref={chartContainerRef}
        className={cn("w-full h-full", className)}
        style={{ width, height }}
      />
    );
  })
);

ChartContainer.displayName = "ChartContainer";

export default ChartContainer;
