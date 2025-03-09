"use client"

import { useCallback } from 'react';
import type * as echarts from 'echarts/core';

interface UseChartInteractionsProps {
  chartInstance: React.RefObject<echarts.ECharts | null>;
  onBrushSelected?: (selected: any[]) => void;
  onDataZoom?: (params: { start: number; end: number }) => void;
}

export const useChartInteractions = ({
  chartInstance,
  onBrushSelected,
  onDataZoom
}: UseChartInteractionsProps) => {
  const setupEventListeners = useCallback(() => {
    if (!chartInstance.current) return;

    chartInstance.current.on('brushSelected', (params) => {
      const brushComponent = params.batch[0];
      if (brushComponent?.selected?.length > 0) {
        onBrushSelected?.(brushComponent.selected);
      }
    });

    chartInstance.current.on('datazoom', (params) => {
      if (params.batch?.[0]) {
        const { start, end } = params.batch[0];
        onDataZoom?.({ start, end });
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.off('brushSelected');
        chartInstance.current.off('datazoom');
      }
    };
  }, [chartInstance, onBrushSelected, onDataZoom]);

  return { setupEventListeners };
};