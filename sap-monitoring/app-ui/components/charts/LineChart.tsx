"use client"

import React, { useMemo } from 'react'
import { DataPoint } from '@/types'
import ChartContainer from './ChartContainer'
import { format } from 'date-fns'

interface LineChartProps {
  data: DataPoint[]
  title: string
  className?: string
}

const LineChart: React.FC<LineChartProps> = ({ data, title, className }) => {
  const options = useMemo(() => {
    const categories = Array.from(new Set(data.map(item => item.category)))

    return {
      animation: true,
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          type: 'cross' as const,
          label: {
            backgroundColor: '#6a7985'
          }
        },
        formatter: (params: any) => {
          let html = `<div style="font-weight: bold">${params[0].name}</div>`
          params.forEach((param: any) => {
            html += `
              <div style="color: ${param.color}">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${param.color}; border-radius: 50%; margin-right: 5px;"></span>
                ${param.seriesName}: ${param.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </div>`
          })
          return html
        }
      },
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: 'none' as 'none'
          },
          restore: {},
          saveAsImage: {}
        }
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          start: 0,
          end: 100
        },
        {
          type: 'inside',
          xAxisIndex: [0],
          start: 0,
          end: 100
        }
      ],
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category' as const,
        boundaryGap: false,
        data: categories,
        axisLabel: {
          formatter: (value: string) => value
        }
      },
      yAxis: {
        type: 'value' as const,
        axisLabel: {
          formatter: (value: number) => `${value}`
        }
      },
      series: [{
        data: categories.map(category => {
          const point = data.find(item => item.category === category)
          return point ? point.value : null
        }),
        type: 'line' as const,
        showBackground: true,
        backgroundStyle: {
          color: 'rgba(180, 180, 180, 0.2)'
        }
      }]
    }
  }, [data])

  return (
    <ChartContainer
      options={options}
      title={title}
      className={className}
      data={data}
      type="line"
      activeKPIs={['default']}
      kpiColors={{
        default: {
          color: '#4F46E5',
          name: title
        }
      }}
    />
  )
}

export default LineChart