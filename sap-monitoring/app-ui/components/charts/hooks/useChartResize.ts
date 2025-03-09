"use client"

import { useEffect, useRef } from 'react';
import type * as echarts from 'echarts/core';

interface UseChartResizeProps {
  chartRef: React.RefObject<HTMLDivElement>;
  chartInstance: React.RefObject<echarts.ECharts | null>;
}

export const useChartResize = ({ chartRef, chartInstance }: UseChartResizeProps) => {
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      resizeTimeoutRef.current = setTimeout(() => {
        if (chartInstance.current && chartRef.current) {
          const { width, height } = chartRef.current.getBoundingClientRect();
          chartRef.current.style.width = `${width}px`;
          chartRef.current.style.height = `${height}px`;
          chartInstance.current.resize();
        }
      }, 100);
    };

    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(chartRef.current);

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [chartRef, chartInstance]);
};