"use client"

import React, { useEffect, useRef, memo, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import { DataPoint } from '@/types';
import { ChartToolbar } from './ChartToolbar';
import { DateRange } from 'react-day-picker';
import dayjs from 'dayjs';

interface ChartContainerProps {
  data: DataPoint[];
  type: 'line' | 'bar';
  title: string;
  activeKPIs: Set<string>;
  kpiColors: Record<string, { color: string; name: string }>;
  dateRange?: DateRange;
  className?: string;
}

const ChartContainer = memo(({
  data,
  type,
  title,
  activeKPIs,
  kpiColors,
  dateRange,
  className
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'box' | 'lasso' | null>(null);
  const [mounted, setMounted] = useState(false);

  const filteredData = React.useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return data;
    
    return data.filter(item => {
      const itemDate = dayjs(item.date);
      const fromDate = dayjs(dateRange.from);
      const toDate = dayjs(dateRange.to);
      return itemDate.isAfter(fromDate) && itemDate.isBefore(toDate);
    });
  }, [data, dateRange]);

  const updateChart = useCallback(() => {
    if (!chartInstance.current) return;

    const categories = Array.from(new Set(filteredData.map(item => item.category)))
      .filter(category => activeKPIs.has(category.toLowerCase()));
    const dates = Array.from(new Set(filteredData.map(item => item.date)));

    const options: echarts.EChartsOption = {
      animation: {
        duration: 300,
        easing: 'cubicOut'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        },
        formatter: (params: any) => {
          const date = params[0].axisValue;
          let html = `<div style="font-weight: bold">${dayjs(date).format('MMM D, YYYY HH:mm')}</div>`;
          params.forEach((param: any) => {
            const kpiId = param.seriesName.toLowerCase();
            const color = kpiColors[kpiId]?.color || param.color;
            html += `
              <div style="color: ${color}">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 50%; margin-right: 5px;"></span>
                ${param.seriesName}: ${param.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </div>`;
          });
          return html;
        }
      },
      toolbox: {
        show: false
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100
        },
        {
          show: true,
          type: 'slider',
          bottom: 60,
          start: 0,
          end: 100,
          borderColor: 'transparent',
          backgroundColor: 'rgba(200,200,200,0.2)',
          fillerColor: 'rgba(144,197,237,0.2)',
          textStyle: {
            fontSize: 11
          },
          height: 20
        }
      ],
      grid: {
        left: '3%',
        right: '4%',
        bottom: 100,
        top: 60,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: type === 'bar',
        data: dates,
        axisLabel: {
          formatter: (value: string) => dayjs(value).format('MMM D HH:mm'),
          interval: 'auto',
          rotate: 30,
          margin: 14
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value: number) => 
            value.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0
            })
        }
      },
      series: categories.map(category => {
        const kpiId = category.toLowerCase();
        const color = kpiColors[kpiId]?.color;
        
        return {
          name: category,
          type,
          data: dates.map(date => {
            const point = filteredData.find(item => item.date === date && item.category === category);
            return point ? point.value : null;
          }),
          smooth: true,
          symbolSize: 6,
          itemStyle: {
            color
          },
          ...(type === 'line' && {
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: color + '40' },
                { offset: 1, color: color + '00' }
              ])
            }
          })
        };
      })
    };

    requestAnimationFrame(() => {
      chartInstance.current?.setOption(options, { notMerge: true });
    });
  }, [filteredData, type, activeKPIs, kpiColors, title]);

  // Initialize chart when component mounts
  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current);
    setMounted(true);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  // Update chart when data changes or after initialization
  useEffect(() => {
    if (!mounted || !chartInstance.current) return;
    
    requestAnimationFrame(() => {
      updateChart();
    });
  }, [mounted, updateChart]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!chartInstance.current) return;
      requestAnimationFrame(() => {
        chartInstance.current?.resize();
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (!chartInstance.current) return;
    const option = chartInstance.current.getOption();
    const dataZoom = option.dataZoom?.[0] as { start: number; end: number };
    if (!dataZoom) return;

    const range = dataZoom.end - dataZoom.start;
    const center = (dataZoom.start + dataZoom.end) / 2;
    const newRange = Math.max(range * 0.5, 10);
    const newStart = Math.max(0, center - newRange / 2);
    const newEnd = Math.min(100, center + newRange / 2);

    requestAnimationFrame(() => {
      chartInstance.current?.dispatchAction({
        type: 'dataZoom',
        start: newStart,
        end: newEnd
      });
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!chartInstance.current) return;
    const option = chartInstance.current.getOption();
    const dataZoom = option.dataZoom?.[0] as { start: number; end: number };
    if (!dataZoom) return;

    const range = dataZoom.end - dataZoom.start;
    const center = (dataZoom.start + dataZoom.end) / 2;
    const newRange = Math.min(range * 2, 100);
    const newStart = Math.max(0, center - newRange / 2);
    const newEnd = Math.min(100, center + newRange / 2);

    requestAnimationFrame(() => {
      chartInstance.current?.dispatchAction({
        type: 'dataZoom',
        start: newStart,
        end: newEnd
      });
    });
  }, []);

  const handleBoxSelect = useCallback(() => {
    if (!chartInstance.current) return;
    setSelectedTool('box');
    setIsSelecting(true);
    
    requestAnimationFrame(() => {
      if (!chartInstance.current) return;
      
      chartInstance.current.setOption({
        brush: {
          toolbox: ['rect'],
          xAxisIndex: 0,
          brushMode: 'single',
          brushStyle: {
            borderWidth: 1,
            color: 'rgba(120, 140, 180, 0.2)',
            borderColor: 'rgba(120, 140, 180, 0.8)'
          },
          transformable: true,
          throttleType: 'debounce',
          throttleDelay: 300
        }
      }, { replaceMerge: ['brush'] });

      chartInstance.current.dispatchAction({
        type: 'takeGlobalCursor',
        key: 'brush',
        brushOption: {
          brushType: 'rect',
          brushMode: 'single'
        }
      });
    });
  }, []);

  const handleLassoSelect = useCallback(() => {
    if (!chartInstance.current) return;
    setSelectedTool('lasso');
    setIsSelecting(true);
    
    requestAnimationFrame(() => {
      if (!chartInstance.current) return;
      
      chartInstance.current.setOption({
        brush: {
          toolbox: ['polygon'],
          xAxisIndex: 0,
          brushMode: 'single',
          brushStyle: {
            borderWidth: 1,
            color: 'rgba(120, 140, 180, 0.2)',
            borderColor: 'rgba(120, 140, 180, 0.8)'
          },
          transformable: true,
          throttleType: 'debounce',
          throttleDelay: 300
        }
      }, { replaceMerge: ['brush'] });

      chartInstance.current.dispatchAction({
        type: 'takeGlobalCursor',
        key: 'brush',
        brushOption: {
          brushType: 'polygon',
          brushMode: 'single'
        }
      });
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    if (!chartInstance.current) return;
    setSelectedTool(null);
    setIsSelecting(false);
    
    requestAnimationFrame(() => {
      if (!chartInstance.current) return;
      
      chartInstance.current.setOption({
        brush: undefined
      }, { replaceMerge: ['brush'] });

      chartInstance.current.dispatchAction({
        type: 'brush',
        command: 'clear'
      });
    });
  }, []);

  return (
    <div className={`relative w-full h-full ${className || ''}`}>
      <ChartToolbar
        chartInstance={chartInstance.current}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onBoxSelect={handleBoxSelect}
        onLassoSelect={handleLassoSelect}
        onClearSelection={handleClearSelection}
        data={filteredData}
        title={title}
      />
      <div ref={chartRef} className="w-full h-full" />
    </div>
  );
});

ChartContainer.displayName = 'ChartContainer';

export default ChartContainer;