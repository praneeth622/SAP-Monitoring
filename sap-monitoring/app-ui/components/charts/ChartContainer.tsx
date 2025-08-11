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
import { format, differenceInDays, differenceInHours, differenceInMinutes, isValid } from "date-fns";

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
  resolution?: string;
}

const getDateFormatter = (dates: string[]) => {
  if (dates.length < 2) return (date: string) => date;

  try {
    const start = new Date(dates[0]);
    const end = new Date(dates[dates.length - 1]);

    if (!isValid(start) || !isValid(end)) return (date: string) => date;

    const diffDays = differenceInDays(end, start);
    const diffHours = differenceInHours(end, start);
    const diffMinutes = differenceInMinutes(end, start);

    return (date: string) => {
      try {
        const dateObj = new Date(date);
        if (!isValid(dateObj)) return date;

        if (diffDays > 365) {
          return format(dateObj, 'MMM yyyy');
        } else if (diffDays > 30) {
          return format(dateObj, 'dd MMM');
        } else if (diffDays > 7) {
          return format(dateObj, 'MMM dd');
        } else if (diffDays > 1) {
          return format(dateObj, 'EEE HH:mm');
        } else if (diffHours > 24) {
          return format(dateObj, 'HH:mm');
        } else if (diffMinutes > 60) {
          return format(dateObj, 'HH:mm');
        } else {
          return format(dateObj, 'HH:mm:ss');
        }
      } catch (error) {
        console.warn('Error formatting date:', date, error);
        return date;
      }
    };
  } catch (error) {
    console.warn('Error setting up date formatter:', error);
    return (date: string) => date;
  }
};

const ChartContainer = memo(
  React.forwardRef<
    {
      zoomIn: () => void;
      zoomOut: () => void;
      resetZoom: () => void;
      boxSelect: () => void;
      lassoSelect: () => void;
      clearSelection: () => void;
      download: (format: "png" | "svg" | "pdf" | "csv" | "json") => void;
      dispatchAction?: (action: any) => void;
      isValid: () => boolean;
      toggleFullscreen: () => void;
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
      resolution,
    } = props;

    const chartRef = useRef<echarts.ECharts | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [selectedTool, setSelectedTool] = useState<"box" | "lasso" | null>(
      null
    );
    const [isSelecting, setIsSelecting] = useState(false);
    const [mounted, setMounted] = useState(false);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const fullscreenContainerRef = useRef<HTMLDivElement>(null);

    const filteredData = React.useMemo(() => {
      if (!dateRange?.from || !dateRange?.to) return data;
      return data.filter((item) => {
        const itemDate = dayjs(item.date);
        const fromDate = dayjs(dateRange.from);
        const toDate = dayjs(dateRange.to);

        // Include data points that fall within the exact date-time range (inclusive)
        return (
          (itemDate.isAfter(fromDate) || itemDate.isSame(fromDate)) &&
          (itemDate.isBefore(toDate) || itemDate.isSame(toDate))
        );
      });
    }, [data, dateRange]);

    const initChart = useCallback(() => {
      if (!chartContainerRef.current) return;

      try {
        // Safely dispose of the previous chart instance
        if (chartRef.current) {
          try {
            chartRef.current.dispose();
          } catch (err) {
            console.warn("Error disposing previous chart instance:", err);
          }
          chartRef.current = null;
        }

        // Create a new chart instance
        const chart = echarts.init(chartContainerRef.current);

        // Add brush component during initialization with safe defaults
        const initOptions = {
          brush: {
            toolbox: ["rect", "polygon", "keep", "clear"] as const,
            xAxisIndex: 0,
            brushLink: "all",
            outOfBrush: {
              colorAlpha: 0.1,
            },
            brushStyle: {
              borderWidth: 1,
              color: "rgba(120, 140, 180, 0.2)",
              borderColor: "rgba(120, 140, 180, 0.8)",
            },
            throttleType: "debounce",
            throttleDelay: 300,
            transformable: true,
            removeOnClick: true,
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

        // Set up resize observer
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }

        resizeObserverRef.current = new ResizeObserver((entries) => {
          entries.forEach((entry) => {
            if (chartRef.current && !chartRef.current.isDisposed?.()) {
              requestAnimationFrame(() => {
                try {
                  chartRef.current?.resize();
                } catch (error) {
                  console.warn("Chart resize error:", error);
                }
              });
            }
          });
        });

        if (chartContainerRef.current) {
          resizeObserverRef.current.observe(chartContainerRef.current);
        }
      } catch (error) {
        console.error("Error initializing chart:", error);
      }
    }, []);

    useEffect(() => {
      initChart();

      // Force a resize after initialization to ensure proper rendering
      const initialResizeTimeout = setTimeout(() => {
        if (chartRef.current && !chartRef.current.isDisposed?.()) {
          try {
            chartRef.current.resize();
          } catch (error) {
            console.warn("Error resizing chart after init:", error);
          }
        }
      }, 100);

      return () => {
        clearTimeout(initialResizeTimeout);

        // Cleanup: disconnect observer and dispose chart
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
          resizeObserverRef.current = null;
        }

        if (chartRef.current) {
          try {
            chartRef.current.dispose();
          } catch (error) {
            console.warn("Error disposing chart on unmount:", error);
          }
          chartRef.current = null;
        }
      };
    }, [initChart]);

    // Enhanced updateChart function to decrease font size of graph name
    const updateChart = useCallback(() => {
      if (!chartRef.current || !filteredData || filteredData.length === 0) {
        console.warn("No data to display or chart not initialized");
        return;
      }

      try {
        // Check if chart has been disposed
        if (chartRef.current.isDisposed?.() === true) {
          console.warn("Chart has been disposed, cannot update");
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
          console.warn(
            "No categories match activeKPIs, showing all categories"
          );
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
              opacity: isActive ? 1 : 0.3,
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
              opacity: isActive ? 1 : 0.3,
            },
          };

          return type === "line"
            ? {
                ...baseSeriesConfig,
                type: "line" as const,
                areaStyle: {
                  opacity: isActive ? 0.2 : 0.1,
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
          animationEasing: "cubicInOut",
          // Only show title if it's not empty
          title: title ? {
            text: title.replace(/\./g, ''),
            textStyle: {
              fontSize: 8,
              fontWeight: 'normal',
              color: '#666',
              overflow: 'break',
              width: '100%',
              lineHeight: 12
            },
            left: 'center',
            top: 2,
            padding: [0, 0, 2, 0],
            textAlign: 'center',
            triggerEvent: true
          } : undefined,
          grid: {
            left: "20px",
            right: "20px",
            bottom: "60px",
            top: title ? "18px" : "10px",
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
              },
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
              if (!Array.isArray(params)) return "";

              const date = params[0].axisValue;
              let result = `<div style="margin-bottom: 4px; font-weight: 500;">${date}</div>`;

              params.forEach((param: any) => {
                if (param.value !== null && param.value !== undefined) {
                  const color = param.color || "#fff";
                  const value =
                    typeof param.value === "number"
                      ? param.value.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
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
            },
          },
          dataZoom: [
            {
              type: "slider",
              show: true,
              xAxisIndex: [0],
              start: 0,
              end: 100,
              height: 16,
              bottom: 30,
              borderColor: "transparent",
              backgroundColor: "rgba(0,0,0,0.05)",
              fillerColor: "rgba(0,0,0,0.1)",
              handleStyle: {
                color: theme?.colors?.[0] || "#666",
                borderColor: "transparent",
                opacity: 0.8,
                shadowBlur: 2,
                shadowColor: 'rgba(0,0,0,0.2)',
                borderRadius: 2
              },
              selectedDataBackground: {
                lineStyle: {
                  color: theme?.colors?.[0] || "#666",
                  opacity: 0.3,
                },
                areaStyle: {
                  color: theme?.colors?.[0] || "#666",
                  opacity: 0.1,
                },
              },
              emphasis: {
                handleStyle: {
                  opacity: 1,
                  shadowBlur: 4,
                  borderRadius: 2
                },
                handleLabel: {
                  show: true,
                },
              },
              handleIcon: 'path://M 4 8 L 4 -8 L -4 -8 L -4 8 Z',
              handleSize: '80%',
              moveHandleSize: 3,
              zoomLock: false,
              throttle: 100,
              textStyle: {
                color: "#666",
                fontSize: 10,
              },
              labelFormatter: (value: number) => {
                try {
                  const index = Math.floor((value / 100) * (dates.length - 1));
                  if (index < 0 || index >= dates.length) return '';
                  
                  const dateStr = dates[index];
                  if (!dateStr) return '';

                  const date = new Date(dateStr);
                  if (!isValid(date)) return dateStr;

                  return format(date, 'MMM dd HH:mm');
                } catch (error) {
                  console.warn('Error formatting zoom label:', error);
                  return '';
                }
              },
            },
            {
              type: "inside",
              xAxisIndex: [0],
              start: 0,
              end: 100,
              zoomOnMouseWheel: true,
              moveOnMouseMove: true,
            },
          ],
          xAxis: {
            type: "category",
            data: dates,
            axisLabel: {
              formatter: (value: string) => {
                try {
                  const date = new Date(value);
                  if (!isValid(date)) return value;
                  
                  const formatter = getDateFormatter(dates);
                  return formatter(value);
                } catch (error) {
                  console.warn('Error formatting axis label:', error);
                  return value;
                }
              },
              interval: 'auto',
              showMaxLabel: true,
              hideOverlap: true,
              margin: 14,
              fontSize: 10,
              color: "#666",
              rotate: 0,
            },
            axisTick: {
              alignWithLabel: true,
              length: 3,
              lineStyle: {
                color: "#666",
              },
            },
            axisLine: {
              lineStyle: {
                color: "#666",
                width: 1,
              },
              onZero: false,
            },
            splitLine: {
              show: false,
            },
            boundaryGap: true,
          },
          yAxis: {
            type: "value",
            axisLabel: {
              formatter: (value: number) => value.toString(),
              fontSize: 10,
              color: "#666",
              margin: 4,
              align: 'right'
            },
            axisLine: {
              lineStyle: {
                color: "#666"
              }
            },
            splitLine: {
              lineStyle: {
                color: "rgba(0, 0, 0, 0.05)"
              }
            },
            axisTick: {
              show: true,
              length: 3,
              lineStyle: {
                color: "#666"
              }
            }
          },
          series,
        };

        if (externalOptions) {
          Object.assign(option, externalOptions);
        }

        // Check if chart is still valid before setting option
        if (chartRef.current && !chartRef.current.isDisposed?.()) {
          // Force immediate update with smooth transitions for color changes
          chartRef.current.setOption(option, {
            replaceMerge: ["series", "title"],
            lazyUpdate: false,
          });
        }
      } catch (error) {
        console.error("Error updating chart:", error);
      }
    }, [
      filteredData,
      type,
      activeKPIs,
      kpiColors,
      theme,
      externalOptions,
      resolution,
      title, // Added title dependency
    ]);

    // Enhanced theme application in ChartContainer
    useEffect(() => {
      if (!mounted || !chartRef.current) return;

      try {
        // If the chart needs a theme update but is already initialized,
        // we can use a targeted update rather than full redraw
        if (chartRef.current && theme?.colors) {
          console.log("Applying theme to chart:", theme.name, theme.colors);
          
          // Get current option without triggering a redraw
          const existingOption = chartRef.current.getOption();

          if (existingOption && existingOption.series) {
            const series = existingOption.series as any[];

            // Create a new series array with updated colors
            const updatedSeries = series.map((seriesItem, index) => {
              if (!seriesItem || !seriesItem.data) return seriesItem;

              const categoryName = seriesItem.name;
              const colorIndex = index % theme.colors.length;
              const newColor =
                kpiColors?.[categoryName]?.color || theme.colors[colorIndex];

              // Create a new series item with updated colors
              return {
                ...seriesItem,
                itemStyle: {
                  ...seriesItem.itemStyle,
                  color: newColor,
                },
                lineStyle:
                  seriesItem.type === "line"
                    ? {
                        ...seriesItem.lineStyle,
                        color: newColor,
                      }
                    : undefined,
                areaStyle:
                  seriesItem.type === "line"
                    ? {
                        ...seriesItem.areaStyle,
                        color: {
                          type: "linear",
                          x: 0,
                          y: 0,
                          x2: 0,
                          y2: 1,
                          colorStops: [
                            { offset: 0, color: `${newColor}40` },
                            { offset: 1, color: `${newColor}00` },
                          ],
                        },
                      }
                    : undefined,
              };
            });

            // Apply the updated series with a smooth transition
            if (chartRef.current && !chartRef.current.isDisposed?.()) {
              chartRef.current.setOption(
                {
                  series: updatedSeries,
                },
                {
                  replaceMerge: ["series"],
                  lazyUpdate: true,
                  notMerge: false,
                }
              );
              
              // Force a resize after theme change to ensure proper rendering
              setTimeout(() => {
                if (chartRef.current && !chartRef.current.isDisposed?.()) {
                  chartRef.current.resize();
                }
              }, 50);
            }
          }
        }
      } catch (error) {
        console.error("Error updating chart theme:", error);
      }
    }, [theme, kpiColors, mounted]);

    useEffect(() => {
      if (!mounted || !chartRef.current) return;

      try {
        if (externalOptions) {
          chartRef.current.setOption(externalOptions, { notMerge: true });
        } else {
          updateChart();
        }
      } catch (error) {
        console.error("Error applying chart options:", error);
      }
    }, [mounted, updateChart, externalOptions, activeKPIs]);

    const zoomIn = useCallback(() => {
      if (!chartRef.current || chartRef.current.isDisposed?.() === true) return;

      try {
        const option = chartRef.current.getOption();
        const dataZoom =
          Array.isArray(option.dataZoom) && option.dataZoom.length > 0
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
        chartRef.current.setOption(
          {
            dataZoom: [
              {
                ...dataZoom,
                start: newStart,
                end: newEnd,
              },
            ],
          },
          { replaceMerge: ["dataZoom"] }
        );
      } catch (error) {
        console.error("Error in zoom in:", error);
      }
    }, []);

    const zoomOut = useCallback(() => {
      if (!chartRef.current || chartRef.current.isDisposed?.() === true) return;

      try {
        const option = chartRef.current.getOption();
        const dataZoom =
          Array.isArray(option.dataZoom) && option.dataZoom.length > 0
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
        chartRef.current.setOption(
          {
            dataZoom: [
              {
                ...dataZoom,
                start: newStart,
                end: newEnd,
              },
            ],
          },
          { replaceMerge: ["dataZoom"] }
        );
      } catch (error) {
        console.error("Error in zoom out:", error);
      }
    }, []);

    const resetZoom = useCallback(() => {
      if (!chartRef.current || chartRef.current.isDisposed?.() === true) return;

      try {
        const option = chartRef.current.getOption();
        const dataZoom =
          Array.isArray(option.dataZoom) && option.dataZoom.length > 0
            ? option.dataZoom[0]
            : undefined;

        if (!dataZoom) return;

        // Reset dataZoom to default view (0-100%)
        chartRef.current.setOption(
          {
            dataZoom: [
              {
                ...dataZoom,
                start: 0,
                end: 100,
              },
            ],
          },
          { replaceMerge: ["dataZoom"] }
        );
      } catch (error) {
        console.error("Error in reset zoom:", error);
      }
    }, []);

    const boxSelect = useCallback(() => {
      if (!chartRef.current || chartRef.current.isDisposed?.() === true) return;

      try {
        // Configure brush options for box selection
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
              brushStyle: {
                borderWidth: 1,
                color: "rgba(120, 140, 180, 0.3)",
                borderColor: "rgba(120, 140, 180, 0.8)",
              },
            },
          },
          { replaceMerge: ["brush"] }
        );

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
      if (!chartRef.current || chartRef.current.isDisposed?.() === true) return;

      try {
        // Configure brush options for lasso selection
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
              brushStyle: {
                borderWidth: 1,
                color: "rgba(120, 140, 180, 0.3)",
                borderColor: "rgba(120, 140, 180, 0.8)",
              },
            },
          },
          { replaceMerge: ["brush"] }
        );

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
      setSelectedTool(null);
      setIsSelecting(false);

      requestAnimationFrame(() => {
        if (!chartRef.current) return;

        chartRef.current.setOption(
          {
            brush: undefined,
          },
          { replaceMerge: ["brush"] }
        );

        chartRef.current.dispatchAction({
          type: "brush",
          command: "clear",
        });
      });
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
      if (!chartRef.current || chartRef.current.isDisposed?.() === true) return;

      try {
        chartRef.current.dispatchAction(action);
      } catch (error) {
        console.error("Error dispatching chart action:", error);
      }
    }, []);

    const toggleFullscreen = useCallback(() => {
      if (!fullscreenContainerRef.current) return;

      try {
        if (!document.fullscreenElement) {
          // Enter fullscreen
          if (fullscreenContainerRef.current.requestFullscreen) {
            fullscreenContainerRef.current.requestFullscreen();
          } else if (
            (fullscreenContainerRef.current as any).webkitRequestFullscreen
          ) {
            (fullscreenContainerRef.current as any).webkitRequestFullscreen();
          } else if (
            (fullscreenContainerRef.current as any).msRequestFullscreen
          ) {
            (fullscreenContainerRef.current as any).msRequestFullscreen();
          }
          setIsFullscreen(true);
        } else {
          // Exit fullscreen
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
          } else if ((document as any).msExitFullscreen) {
            (document as any).msExitFullscreen();
          }
          setIsFullscreen(false);
        }
      } catch (error) {
        console.error("Error toggling fullscreen:", error);
      }
    }, []);

    // Handle fullscreen change events
    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };

      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.addEventListener("msfullscreenchange", handleFullscreenChange);

      return () => {
        document.removeEventListener(
          "fullscreenchange",
          handleFullscreenChange
        );
        document.removeEventListener(
          "webkitfullscreenchange",
          handleFullscreenChange
        );
        document.removeEventListener(
          "msfullscreenchange",
          handleFullscreenChange
        );
      };
    }, []);

    // Handle fullscreen resize
    useEffect(() => {
      if (isFullscreen && chartRef.current) {
        const handleResize = () => {
          if (chartRef.current && !chartRef.current.isDisposed?.()) {
            requestAnimationFrame(() => {
              try {
                chartRef.current?.resize();
              } catch (error) {
                console.warn("Chart resize error in fullscreen:", error);
              }
            });
          }
        };

        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
      }
    }, [isFullscreen]);

    useImperativeHandle(
      ref,
      () => ({
        zoomIn,
        zoomOut,
        resetZoom,
        boxSelect,
        lassoSelect,
        clearSelection,
        download,
        dispatchAction,
        toggleFullscreen,
        isValid: () => {
          return (
            chartRef.current !== null &&
            chartRef.current.isDisposed?.() !== true
          );
        },
      }),
      [
        zoomIn,
        zoomOut,
        resetZoom,
        boxSelect,
        lassoSelect,
        clearSelection,
        download,
        dispatchAction,
        toggleFullscreen,
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
        // console.log("Brush selected:", params);
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
      if (!chartRef.current || chartRef.current.isDisposed?.() === true) return;

      try {
        const chart = chartRef.current;

        // Handle brush events
        const handleBrushSelected = (params: any) => {
          // console.log("Brush selected event triggered:", params);

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
          // Safety check before removing listeners
          if (chart && !chart.isDisposed?.()) {
            // Remove event listeners when component unmounts or re-renders
            chart.off("brushSelected", handleBrushSelected);
            chart.off("brushEnd", handleBrushEnd);
          }
        };
      } catch (error) {
        console.error("Error setting up brush events:", error);
      }
    }, [mounted]);

    useEffect(() => {
      if (chartRef.current && data && data.length > 0) {
        try {
          updateChart();
        } catch (error) {
          console.error("Error updating chart with new data:", error);
        }
      }
    }, [data, type, dateRange, activeKPIs, kpiColors, theme, updateChart]);

    // Add an effect to update chart when data changes or on layout shift
    useEffect(() => {
      if (mounted && chartRef.current && !chartRef.current.isDisposed?.()) {
        try {
          updateChart();

          // Force resize after data update to ensure proper rendering
          setTimeout(() => {
            if (chartRef.current && !chartRef.current.isDisposed?.()) {
              chartRef.current.resize();
            }
          }, 50);
        } catch (error) {
          console.error("Error updating or resizing chart:", error);
        }
      }
    }, [filteredData, activeKPIs, mounted, updateChart]);

    return (
      <div
        ref={fullscreenContainerRef}
        className={cn(
          "w-full h-full transition-all duration-300",
          isFullscreen ? "fixed inset-0 z-50 bg-white" : "relative",
          className
        )}
        style={{ width, height }}
      >
        <div
          ref={chartContainerRef}
          className={cn("w-full h-full", isFullscreen ? "p-4" : "")}
        />
      </div>
    );
  })
);

ChartContainer.displayName = "ChartContainer";

export default ChartContainer;
