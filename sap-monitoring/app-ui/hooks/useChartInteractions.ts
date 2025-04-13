import { useCallback } from 'react'
import * as echarts from 'echarts'

interface UseChartInteractionsProps {
  chartRef: React.RefObject<HTMLDivElement>
  chartInstance: React.MutableRefObject<echarts.ECharts | null>
  theme?: string
  onBrushSelected?: (params: any) => void
  onDataZoom?: (params: any) => void
}

interface BrushSelectedParams {
  batch: Array<{
    selected: Array<any>
  }>
}

interface DataZoomParams {
  batch?: Array<any>
}

export const useChartInteractions = ({
  chartRef,
  chartInstance,
  theme,
  onBrushSelected,
  onDataZoom
}: UseChartInteractionsProps) => {
  const initializeChart = useCallback(() => {
    if (!chartRef.current) return

    if (chartInstance.current) {
      chartInstance.current.dispose()
    }

    chartInstance.current = echarts.init(chartRef.current, theme === 'dark' ? 'dark' : undefined)

    // Set up event listeners
    chartInstance.current.on('brushSelected', (params: any) => {
      const brushComponent = params.batch[0]
      if (brushComponent?.selected?.length > 0) {
        onBrushSelected?.(brushComponent.selected)
      }
    })

    chartInstance.current.on('datazoom', (params: any) => {
      if (params.batch?.[0]) {
        onDataZoom?.(params.batch[0])
      }
    })
  }, [chartRef, chartInstance, theme, onBrushSelected, onDataZoom])

  const updateChart = useCallback((options: echarts.EChartsOption) => {
    if (!chartInstance.current) return

    const enhancedOptions: echarts.EChartsOption = {
      ...options,
      brush: {
        toolbox: ['rect', 'polygon', 'lineX', 'lineY', 'keep', 'clear'],
        xAxisIndex: 0,
        throttleType: 'debounce',
        throttleDelay: 300,
        transformable: true,
        brushStyle: {
          borderWidth: 1,
          color: 'rgba(59, 130, 246, 0.1)',
          borderColor: 'rgba(59, 130, 246, 0.6)'
        },
        removeOnClick: true
      },
      toolbox: {
        ...options.toolbox,
        feature: {
          ...(options.toolbox as any)?.feature,
          brush: {
            type: ['rect', 'polygon', 'lineX', 'lineY', 'keep', 'clear'],
            title: {
              rect: 'Box Selection',
              polygon: 'Lasso Selection',
              lineX: 'Horizontal Selection',
              lineY: 'Vertical Selection',
              keep: 'Keep Selection',
              clear: 'Clear Selection'
            }
          }
        }
      }
    }

    chartInstance.current.setOption(enhancedOptions, { notMerge: true })
  }, [])

  return { initializeChart, updateChart }
}