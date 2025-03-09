"use client"

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { GripHorizontal, BarChart2, LineChart, Calendar, Maximize2, Minimize2 } from 'lucide-react';
import ChartContainer from './ChartContainer';
import { DataPoint, ChartType } from '@/types/index';
import { DateRangePicker } from '@/components/date-range-picker';
import { DateRange } from 'react-day-picker';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DraggableChartProps {
  id: string;
  data: DataPoint[];
  type: ChartType;
  title: string;
  className?: string;
  width: number;
  height: number;
  activeKPIs: Set<string>;
  initialActiveKPIs?: Set<string>;  // Add this new prop
  kpiColors: Record<string, { 
    color: string;
    name: string;
  }>;
  globalDateRange?: DateRange;
}

export function DraggableChart({
  id,
  data,
  type,
  title,
  className,
  width,
  height,
  activeKPIs,
  initialActiveKPIs,  // Add this new prop
  kpiColors = {}, // Provide default empty object
  globalDateRange,
}: DraggableChartProps) {
  const [chartType, setChartType] = useState<ChartType>(type);
  const [localActiveKPIs, setLocalActiveKPIs] = useState<Set<string>>(
    initialActiveKPIs || new Set()
  );
  const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>(undefined);
  const [useGlobalDate, setUseGlobalDate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        const chart = chartRef.current.querySelector('.echarts-for-react');
        if (chart) {
          (chart as any).getEchartsInstance()?.resize();
        }
      }
    };

    if (chartRef.current) {
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(chartRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        toggleFullscreen();
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: '100%',
    height: '100%'
  };

  const toggleKPI = useCallback((kpiId: string) => {
    setLocalActiveKPIs(prev => {
      const next = new Set(prev);
      if (next.has(kpiId)) {
        next.delete(kpiId);
      } else {
        next.add(kpiId);
      }
      return next;
    });
  }, []);

  const toggleFullscreen = () => {
    setIsTransitioning(true);
    setIsFullscreen(!isFullscreen);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const effectiveDateRange = useGlobalDate ? globalDateRange : localDateRange;

  // Add this check before rendering KPI toggles
  const hasKpis = kpiColors && Object.keys(kpiColors).length > 0;

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={`${className} relative group touch-none`}
      >
        <AnimatePresence>
          {isFullscreen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
              onClick={toggleFullscreen}
            />
          )}
        </AnimatePresence>

        <motion.div
          ref={cardRef}
          layout
          transition={{
            layout: { duration: 0.3 },
            opacity: { duration: 0.2 }
          }}
          className={`${
            isFullscreen 
              ? 'fixed inset-4 z-50' 
              : 'relative w-full h-full'
          }`}
        >
          <Card 
            className={`w-full h-full overflow-hidden bg-card/90 backdrop-blur-sm border-border/40 shadow-xl hover:shadow-2xl transition-all duration-300 ${
              isFullscreen 
                ? 'rounded-xl flex flex-col' 
                : ''
            }`}
          >
            {/* Loading Overlay */}
            {isTransitioning && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            )}

            {/* Chart Header */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-card/95 backdrop-blur-sm border-b border-border/40 px-5 flex items-center justify-between z-30">
              <div className="flex items-center gap-4">
                {!isFullscreen && (
                  <div 
                    className="p-2.5 rounded-lg cursor-grab hover:bg-accent/40 transition-all duration-300"
                    {...attributes}
                    {...listeners}
                  >
                    <GripHorizontal className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <h3 className="text-sm font-medium text-foreground/90">{title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setUseGlobalDate(!useGlobalDate)}
                      >
                        <Calendar className={`h-4 w-4 ${useGlobalDate ? 'text-primary' : 'text-muted-foreground'}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{useGlobalDate ? 'Using global date range' : 'Using local date range'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setChartType(prev => prev === 'line' ? 'bar' : 'line')}
                >
                  {chartType === 'line' ? (
                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <LineChart className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9"
                        onClick={toggleFullscreen}
                      >
                        {isFullscreen ? (
                          <Minimize2 className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Maximize2 className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {!useGlobalDate && (
              <div className="absolute top-16 left-0 right-0 bg-muted/30 backdrop-blur-sm border-b border-border/40 p-3 z-20">
                <DateRangePicker
                  date={localDateRange}
                  onDateChange={setLocalDateRange}
                  className="w-full"
                  showTime
                  align="start"
                />
              </div>
            )}

            {/* Parameters Toggle */}
            {hasKpis && (
              <div className="absolute bottom-5 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-3 bg-card/95 backdrop-blur-sm rounded-xl p-2.5 shadow-xl border border-border/40">
                {Object.entries(kpiColors).map(([kpiId, kpi]) => {
                  return (
                    <button
                      key={kpiId}
                      onClick={() => toggleKPI(kpiId)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                        localActiveKPIs.has(kpiId)
                          ? 'bg-accent/70 text-accent-foreground shadow-lg hover:shadow-xl'
                          : 'text-muted-foreground hover:bg-accent/40 hover:shadow-md'
                      }`}
                      style={{
                        color: localActiveKPIs.has(kpiId) ? kpi.color : undefined
                      }}
                      title={`Toggle ${kpi.name}`}
                    >
                      <span className="text-xs font-medium">{kpi.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Chart Container */}
            <motion.div 
              ref={chartRef} 
              layout
              className={`${!useGlobalDate ? 'pt-28' : 'pt-16'} h-full ${
                isFullscreen 
                  ? 'flex-1 flex items-center justify-center'
                  : ''
              }`}
            >
              <ChartContainer
                data={data}
                type={chartType}
                title={title}
                activeKPIs={localActiveKPIs}
                kpiColors={kpiColors}
                dateRange={effectiveDateRange}
                className={`p-6 ${isFullscreen ? 'h-[calc(100vh-12rem)]' : ''}`}
              />
            </motion.div>
          </Card>
        </motion.div>
      </div>
    </>
  );
}