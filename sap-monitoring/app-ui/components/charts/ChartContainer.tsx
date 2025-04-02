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
      const initOptions = {
        brush: {
          toolbox: ["rect", "polygon", "keep", "clear"] as const,
          xAxisIndex: 0,
          brushLink: "all",
          outOfBrush: {
            colorAlpha: 0.1,
          },
        },
        toolbox: {
          feature: {
            brush: {
              type: ["rect", "polygon", "clear"] as const,
            },
          },
          show: false,
        },
        timeline: undefined,
      } satisfies echarts.EChartsOption;

      chart.setOption(initOptions);
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

        const baseSeriesConfig = {
          name: kpiColors?.[category]?.name || category,
          data: categoryData,
          itemStyle: { color },
          emphasis: {
            focus: "series" as const,
            itemStyle: {
              shadowBlur: 10,
              shadowColor: color,
            },
          },
          smooth: true,
        };

        return type === "line"
          ? {
              ...baseSeriesConfig,
              type: "line" as const,
              areaStyle: { opacity: 0.2 },
              lineStyle: { width: 2 },
            }
          : {
              ...baseSeriesConfig,
              type: "bar" as const,
            };
      }) as echarts.SeriesOption[];

      const option: echarts.EChartsOption = {
        animation: true,
        grid: {
          top: 5,
          right: 10,
          bottom: 40,
          left: 35,
          containLabel: true,
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "cross" },
          confine: true,
        },
        dataZoom: [
          {
            type: "inside",
            start: 0,
            end: 100,
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
          },
          {
            show: true,
            type: "slider",
            bottom: 10,
            height: 15,
          },
        ],
        xAxis: {
          type: "category",
          data: dates,
          axisLabel: {
            formatter: (value: string) => value,
            margin: 15,
          },
        },
        yAxis: {
          type: "value",
          axisLabel: {
            formatter: (value: number) => value.toString(),
          },
        },
        series,
      };

      if (externalOptions) {
        Object.assign(option, externalOptions);
      }

      chartRef.current.setOption(option);
    }, [filteredData, type, activeKPIs, kpiColors, theme, externalOptions]);

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
      const dataZoom = Array.isArray(option.dataZoom) && option.dataZoom.length > 0
        ? option.dataZoom[0]
        : undefined;

      if (!dataZoom) return;

      const start = dataZoom.start || 0;
      const end = dataZoom.end || 100;
      const range = end - start;

      if (range <= 10) return;

      const newStart = Math.max(0, start + 10);
      const newEnd = Math.min(100, end - 10);

      chartRef.current.dispatchAction({
        type: "dataZoom",
        start: newStart,
        end: newEnd,
      });
    }, []);

    const zoomOut = useCallback(() => {
      if (!chartRef.current) return;

      const option = chartRef.current.getOption();
      const dataZoom = Array.isArray(option.dataZoom) && option.dataZoom.length > 0
        ? option.dataZoom[0] as { start?: number; end?: number }
        : undefined;

      if (!dataZoom) return;

      const start = dataZoom.start || 0;
      const end = dataZoom.end || 100;
      const range = end - start;

      if (range >= 100) return;

      const newStart = Math.max(0, start - 10);
      const newEnd = Math.min(100, end + 10);

      chartRef.current.dispatchAction({
        type: "dataZoom",
        start: newStart,
        end: newEnd,
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
      const updatedOption = {
        ...currentOption,
        brush: {
          toolbox: ["rect", "polygon", "keep", "clear"] as const,
          xAxisIndex: 0,
          brushLink: "all",
          outOfBrush: {
            colorAlpha: 0.1,
          },
        },
        toolbox: {
          feature: {
            brush: {
              type: ["rect", "polygon", "clear"] as const,
            },
          },
          show: false,
        },
      } as const;

      chartRef.current.setOption(updatedOption);
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
