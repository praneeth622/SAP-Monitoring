"use client"

import React, { useMemo } from 'react'
import { DataPoint } from '@/types'
import ChartContainer from './ChartContainer'

interface BarChartProps {
  data: DataPoint[]
  title: string
  className?: string
}

const BarChart: React.FC<BarChartProps> = ({ data, title, className }) => {
  const options = useMemo(() => {
    const categories = Array.from(new Set(data.map(item => item.category)))

    return {
      animation: true,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
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
            yAxisIndex: 'none'
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
        type: 'category',
        data: categories,
        axisLabel: {
          interval: 0,
          rotate: 30
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
      series: [{
        type: 'bar',
        data: categories.map(category => {
          const point = data.find(item => item.category === category)
          return point ? point.value : null
        }),
        itemStyle: {
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    }
  }, [data])

  return <ChartContainer options={options} title={title} className={className} />
}

export default BarChart