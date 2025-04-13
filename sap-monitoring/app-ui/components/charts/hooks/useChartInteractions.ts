"use client"

import { useEffect } from 'react';
import * as echarts from 'echarts';
import type { EChartsType } from 'echarts';

interface BrushSelectedParams {
  batch: Array<{
    selected: Array<{
      dataIndex: number[];
      seriesIndex: number;
    }>;
  }>;
}

interface DataZoomParams {
  batch: Array<{
    start: number;
    end: number;
  }>;
}

interface UseChartInteractionsProps {
  chartInstance: React.MutableRefObject<EChartsType | null>;
  onBrushSelected?: (selected: Array<{ dataIndex: number[]; seriesIndex: number }>) => void;
  onDataZoom?: (params: { start: number; end: number }) => void;
}

export const useChartInteractions = ({
  chartInstance,
  onBrushSelected,
  onDataZoom,
}: UseChartInteractionsProps) => {
  useEffect(() => {
    if (!chartInstance.current) return;

    const handleBrushSelected = function(this: EChartsType, params: unknown) {
      const brushParams = params as BrushSelectedParams;
      const brushComponent = brushParams.batch[0];
      if (brushComponent?.selected?.length > 0) {
        onBrushSelected?.(brushComponent.selected);
      }
    };

    const handleDataZoom = function(this: EChartsType, params: unknown) {
      const zoomParams = params as DataZoomParams;
      if (zoomParams.batch?.[0]) {
        const { start, end } = zoomParams.batch[0];
        onDataZoom?.({ start, end });
      }
    };

    chartInstance.current.on('brushSelected', handleBrushSelected);
    chartInstance.current.on('datazoom', handleDataZoom);

    return () => {
      chartInstance.current?.off('brushSelected');
      chartInstance.current?.off('datazoom');
    };
  }, [chartInstance, onBrushSelected, onDataZoom]);

  return { setupEventListeners: () => {} };
};