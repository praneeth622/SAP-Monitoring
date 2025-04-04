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
        entries.forEach((entry) => {
          if (chartRef.current) {
            requestAnimationFrame(() => {
              try {
                chartRef.current?.resize();
              } catch (error) {
                console.warn('Chart resize error:', error);
              }
            });
          }
        });
      });

      if (chartContainerRef.current) {
        resizeObserverRef.current.observe(chartContainerRef.current);
      }
    }, []);

    useEffect(() => {
      initChart();

      // Force a resize after initialization to ensure proper rendering
      const initialResizeTimeout = setTimeout(() => {
        if (chartRef.current) {
          chartRef.current.resize();
        }
      }, 100);

      return () => {
        clearTimeout(initialResizeTimeout);
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

      const isKpiActive = (category: string) => {
        if (!activeKPIs) return true;
        if (Array.isArray(activeKPIs)) {
          return activeKPIs.includes(category);
        }
        return activeKPIs.has(category);
      };

      const series = categories.map((category, index) => {
        const defaultColor =
          theme?.colors && theme.colors.length > 0
            ? theme.colors[index % theme.colors.length]
            : `hsl(${(index * 60) % 360}, 70%, 50%)`;
        const color = kpiColors?.[category]?.color || defaultColor;
        const isActive = isKpiActive(category);

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
          itemStyle: { 
            color,
            opacity: isActive ? 1 : 0.3 
          },
          emphasis: {
            focus: "series" as const,
            itemStyle: {
              shadowBlur: 10,
              shadowColor: color,
            },
          },
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          lineStyle: { 
            width: 2,
            opacity: isActive ? 1 : 0.3 
          },
        };

        return type === "line"
          ? {
              ...baseSeriesConfig,
              type: "line" as const,
              areaStyle: { 
                opacity: isActive ? 0.2 : 0.1 
              },
            }
          : {
              ...baseSeriesConfig,
              type: "bar" as const,
              itemStyle: {
                ...baseSeriesConfig.itemStyle,
                opacity: isActive ? 1 : 0.3,
              },
            };
      }) as echarts.SeriesOption[];

      const option: echarts.EChartsOption = {
        animation: true,
        animationDuration: 300,
        animationEasing: 'cubicInOut',
        grid: {
          left: '10px',
          right: '10px',
          bottom: '35px',
          top: '20px',
          containLabel: true
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { 
            type: "cross",
            label: {
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              color: "#fff",
              fontSize: 10,
              padding: [4, 8],
              borderRadius: 4,
            }
          },
          confine: true,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          textStyle: {
            color: "#fff",
            fontSize: 11,
            lineHeight: 16,
          },
          padding: [8, 12],
          extraCssText: "max-width: 200px;",
          formatter: (params: any) => {
            if (!Array.isArray(params)) return '';
            
            const date = params[0].axisValue;
            let result = `<div style="margin-bottom: 4px; font-weight: 500;">${date}</div>`;
            
            params.forEach((param: any) => {
              if (param.value !== null && param.value !== undefined) {
                const color = param.color || '#fff';
                const value = typeof param.value === 'number' 
                  ? param.value.toLocaleString(undefined, { maximumFractionDigits: 2 })
                  : param.value;
                result += `
                  <div style="display: flex; align-items: center; margin: 2px 0;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${color}; margin-right: 6px;"></span>
                    <span style="color: ${color};">${param.seriesName}: ${value}</span>
                  </div>
                `;
              }
            });
            
            return result;
          }
        },
        dataZoom: [
          {
            type: 'slider',
            show: true,
            xAxisIndex: [0],
            start: 0,
            end: 100,
            height: 12,
            bottom: 8,
            borderColor: 'transparent',
            backgroundColor: 'rgba(0,0,0,0.05)',
            fillerColor: 'rgba(0,0,0,0.1)',
            handleStyle: {
              color: theme?.colors?.[0] || '#666',
              borderColor: 'transparent'
            },
            handleLabel: {
              show: false
            },
            moveHandleSize: 0,
            zoomLock: false,
            throttle: 100,
            zoomOnMouseWheel: true
          },
          {
            type: 'inside',
            xAxisIndex: [0],
            start: 0,
            end: 100,
            zoomOnMouseWheel: true
          }
        ],
        xAxis: {
          type: "category",
          data: dates,
          axisLabel: {
            formatter: (value: string) => {
              // Format date to be more compact
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            },
            margin: 8,
            fontSize: 10,
            color: "#666",
          },
          axisLine: {
            lineStyle: {
              color: "#666",
            },
          },
          axisTick: {
            show: false,
          },
        },
        yAxis: {
          type: "value",
          axisLabel: {
            formatter: (value: number) => value.toString(),
            fontSize: 10,
            color: "#666",
            margin: 8,
          },
          axisLine: {
            lineStyle: {
              color: "#666",
            },
          },
          splitLine: {
            lineStyle: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
        },
        series,
      };

      if (externalOptions) {
        Object.assign(option, externalOptions);
      }

      // Force immediate update with smooth transitions
      chartRef.current.setOption(option, { 
        notMerge: true,
        replaceMerge: ['series'],
        lazyUpdate: false
      });
    }, [filteredData, type, activeKPIs, kpiColors, theme, externalOptions]);

    useEffect(() => {
      if (!mounted || !chartRef.current) return;

      if (externalOptions) {
        chartRef.current.setOption(externalOptions, { notMerge: true });
      } else {
        updateChart();
      }
    }, [mounted, updateChart, externalOptions, activeKPIs]);

    const zoomIn = useCallback(() => {
      if (!chartRef.current) return;

      try {
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

        // Update dataZoom directly instead of using dispatchAction
        chartRef.current.setOption({
          dataZoom: [{
            ...dataZoom,
            start: newStart,
            end: newEnd
          }]
        }, { replaceMerge: ['dataZoom'] });
      } catch (error) {
        console.error("Error in zoom in:", error);
      }
    }, []);

    const zoomOut = useCallback(() => {
      if (!chartRef.current) return;

      try {
        const option = chartRef.current.getOption();
        const dataZoom = Array.isArray(option.dataZoom) && option.dataZoom.length > 0
          ? option.dataZoom[0]
          : undefined;

        if (!dataZoom) return;

        const start = dataZoom.start || 0;
        const end = dataZoom.end || 100;
        const range = end - start;

        if (range >= 100) return;

        const newStart = Math.max(0, start - 10);
        const newEnd = Math.min(100, end + 10);

        // Update dataZoom directly instead of using dispatchAction
        chartRef.current.setOption({
          dataZoom: [{
            ...dataZoom,
            start: newStart,
            end: newEnd
          }]
        }, { replaceMerge: ['dataZoom'] });
      } catch (error) {
        console.error("Error in zoom out:", error);
      }
    }, []);

    const boxSelect = useCallback(() => {
      if (!chartRef.current) return;

      try {
        // First, clear any existing brushes
        chartRef.current.dispatchAction({
          type: "brush",
          command: "clear",
          areas: [],
        });

        // Configure brush options
        chartRef.current.setOption({
          brush: {
            toolbox: ["rect", "keep", "clear"],
            xAxisIndex: 0,
            brushLink: "all",
            outOfBrush: {
              colorAlpha: 0.1,
            },
            throttleType: "debounce",
            throttleDelay: 100,
            brushStyle: {
              borderWidth: 1,
              color: "rgba(120, 140, 180, 0.3)",
              borderColor: "rgba(120, 140, 180, 0.8)",
            },
          },
        }, { replaceMerge: ["brush"] });

        // Enable box selection
        chartRef.current.dispatchAction({
          type: "takeGlobalCursor",
          key: "brush",
          brushOption: {
            brushType: "rect",
            brushMode: "single",
            transformable: true,
          },
        });

        setSelectedTool("box");
        setIsSelecting(true);
      } catch (error) {
        console.error("Error in box selection:", error);
        setSelectedTool(null);
        setIsSelecting(false);
      }
    }, []);

    const lassoSelect = useCallback(() => {
      if (!chartRef.current) return;

      try {
        // First, clear any existing brushes
        chartRef.current.dispatchAction({
          type: "brush",
          command: "clear",
          areas: [],
        });

        // Configure brush options
        chartRef.current.setOption({
          brush: {
            toolbox: ["polygon", "keep", "clear"],
            xAxisIndex: 0,
            brushLink: "all",
            outOfBrush: {
              colorAlpha: 0.1,
            },
            throttleType: "debounce",
            throttleDelay: 100,
            brushStyle: {
              borderWidth: 1,
              color: "rgba(120, 140, 180, 0.3)",
              borderColor: "rgba(120, 140, 180, 0.8)",
            },
          },
        }, { replaceMerge: ["brush"] });

        // Enable polygon selection
        chartRef.current.dispatchAction({
          type: "takeGlobalCursor",
          key: "brush",
          brushOption: {
            brushType: "polygon",
            brushMode: "single",
            transformable: true,
          },
        });

        setSelectedTool("lasso");
        setIsSelecting(true);
      } catch (error) {
        console.error("Error in lasso selection:", error);
        setSelectedTool(null);
        setIsSelecting(false);
      }
    }, []);

    const clearSelection = useCallback(() => {
      if (!chartRef.current) return;

      try {
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
      } catch (error) {
        console.error("Error clearing selection:", error);
        // Reset states even if there's an error
        setSelectedTool(null);
        setIsSelecting(false);
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

    useEffect(() => {
      if (chartRef.current && data && data.length > 0) {
        updateChart();
      }
    }, [data, type, dateRange, activeKPIs, kpiColors, theme, updateChart]);

    // Add an effect to update chart when data changes or on layout shift
    useEffect(() => {
      if (mounted && chartRef.current) {
        updateChart();
        
        // Force resize after data update to ensure proper rendering
        setTimeout(() => {
          if (chartRef.current) {
            chartRef.current.resize();
          }
        }, 50);
      }
    }, [filteredData, activeKPIs, mounted, updateChart]);

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
