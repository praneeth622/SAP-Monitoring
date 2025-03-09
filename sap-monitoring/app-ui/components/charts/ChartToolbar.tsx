"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Download, ZoomIn, ZoomOut, Square, Lasso, Trash2, FileJson, FileSpreadsheet, File as FilePdf, Image } from 'lucide-react';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';

interface ChartToolbarProps {
  chartInstance: echarts.ECharts | null;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onBoxSelect: () => void;
  onLassoSelect: () => void;
  onClearSelection: () => void;
  data: any[];
  title: string;
}

export function ChartToolbar({
  chartInstance,
  onZoomIn,
  onZoomOut,
  onBoxSelect,
  onLassoSelect,
  onClearSelection,
  data,
  title
}: ChartToolbarProps) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDownloadMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownload = async (format: 'png' | 'svg' | 'pdf' | 'csv' | 'json') => {
    if (!chartInstance) return;

    switch (format) {
      case 'png':
      case 'svg': {
        const url = chartInstance.getDataURL({
          type: format,
          pixelRatio: 2,
          backgroundColor: '#fff'
        });
        saveAs(url, `chart-${title}.${format}`);
        break;
      }
      case 'pdf': {
        const url = chartInstance.getDataURL({
          type: 'png',
          pixelRatio: 2,
          backgroundColor: '#fff'
        });
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px'
        });
        const imgProps = pdf.getImageProperties(url);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(url, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`chart-${title}.pdf`);
        break;
      }
      case 'csv': {
        const csvContent = data.map(row => 
          Object.values(row).join(',')
        ).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `chart-${title}.csv`);
        break;
      }
      case 'json': {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        saveAs(blob, `chart-${title}.json`);
        break;
      }
    }
    setShowDownloadMenu(false);
  };

  return (
    <div className="absolute top-2 right-2 z-30 flex items-center gap-2">
      <div className="flex items-center gap-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
        <button
          onClick={onZoomIn}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-l-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
        <button
          onClick={onZoomOut}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 border-l border-r border-slate-200 dark:border-slate-700 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
        <button
          onClick={onBoxSelect}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 border-r border-slate-200 dark:border-slate-700 transition-colors"
          title="Box Selection"
        >
          <Square className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
        <button
          onClick={onLassoSelect}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 border-r border-slate-200 dark:border-slate-700 transition-colors"
          title="Lasso Selection"
        >
          <Lasso className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
        <button
          onClick={onClearSelection}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Clear Selection"
        >
          <Trash2 className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
      </div>

      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setShowDownloadMenu(!showDownloadMenu)}
          className="p-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          title="Download"
        >
          <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>

        {showDownloadMenu && (
          <div
            ref={menuRef}
            className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-50"
          >
            <button
              onClick={() => handleDownload('png')}
              className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Image className="w-4 h-4 mr-2" />
              Download PNG
            </button>
            <button
              onClick={() => handleDownload('pdf')}
              className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <FilePdf className="w-4 h-4 mr-2" />
              Download PDF
            </button>
            <button
              onClick={() => handleDownload('csv')}
              className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Download CSV
            </button>
            <button
              onClick={() => handleDownload('json')}
              className="flex items-center w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <FileJson className="w-4 h-4 mr-2" />
              Download JSON
            </button>
          </div>
        )}
      </div>
    </div>
  );
}