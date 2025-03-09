"use client"

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import * as echarts from 'echarts';

export interface ChartWrapperProps {
  options: echarts.EChartsOption;
  theme?: 'light' | 'dark' | string;
  style?: React.CSSProperties;
  className?: string;
  onChartReady?: (chart: echarts.ECharts) => void;
}

export interface ChartWrapperRef {
  getChart: () => echarts.ECharts | null;
}

const ChartWrapper = forwardRef<ChartWrapperRef, ChartWrapperProps>(
  ({ options, theme = 'light', style, className, onChartReady }, ref) => {
    const chartRef = useRef<HTMLDivElement>(null);
    const chartInstance = useRef<echarts.ECharts | null>(null);

    useImperativeHandle(ref, () => ({
      getChart: () => chartInstance.current,
    }));

    useEffect(() => {
      if (!chartRef.current) return;

      chartInstance.current = echarts.init(chartRef.current, theme);
      chartInstance.current.setOption(options);
      onChartReady?.(chartInstance.current);

      const resizeChart = () => chartInstance.current?.resize();
      window.addEventListener('resize', resizeChart);

      return () => {
        chartInstance.current?.dispose();
        window.removeEventListener('resize', resizeChart);
      };
    }, [theme, onChartReady]);

    useEffect(() => {
      chartInstance.current?.setOption(options, true);
    }, [options]);

    return (
      <div
        ref={chartRef}
        className={className}
        style={{ width: '100%', height: '100%', ...style }}
      />
    );
  }
);

ChartWrapper.displayName = 'ChartWrapper';

export default ChartWrapper;