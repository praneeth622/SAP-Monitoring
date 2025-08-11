"use client";

import React, { useState, useEffect, useRef } from "react";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import type { ECharts } from "echarts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Square, Lasso } from "lucide-react";

interface ChartToolbarProps {
  chartInstance: ECharts | null;
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
  title,
}: ChartToolbarProps) {
  const [showTools, setShowTools] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(event.target as Node)
      ) {
        setShowTools(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDownload = async (
    format: "png" | "svg" | "pdf" | "csv" | "json"
  ) => {
    if (!chartInstance) {
      console.error("Chart instance is not available");
      return;
    }

    try {
      if (format === "png" || format === "svg") {
        const url = chartInstance.getDataURL({
          type: format,
          pixelRatio: 2,
          backgroundColor: "#ffffff",
        });

        const link = document.createElement("a");
        link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.${format}`;

        if (format === "svg") {
          link.href =
            "data:image/svg+xml;charset=utf-8," + encodeURIComponent(url);
        } else {
          link.href = url;
        }

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      if (format === "pdf") {
        const url = chartInstance.getDataURL({
          type: "png",
          pixelRatio: 2,
          backgroundColor: "#ffffff",
        });

        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "px",
          format: "a4",
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = chartInstance.getWidth();
        const imgHeight = chartInstance.getHeight();

        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const width = imgWidth * ratio;
        const height = imgHeight * ratio;
        const x = (pdfWidth - width) / 2;
        const y = (pdfHeight - height) / 2;

        pdf.addImage(url, "PNG", x, y, width, height);
        pdf.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
        return;
      }

      if (format === "csv" || format === "json") {
        if (!data || !data.length) {
          console.error(`No data available for ${format.toUpperCase()} export`);
          return;
        }

        if (format === "csv") {
          const headers = Object.keys(data[0]);
          const csvContent = [
            headers.join(","),
            ...data.map((row) =>
              headers
                .map((header) => {
                  const cell = row[header];
                  return typeof cell === "string" && cell.includes(",")
                    ? `"${cell}"`
                    : cell;
                })
                .join(",")
            ),
          ].join("\n");

          const blob = new Blob([csvContent], {
            type: "text/csv;charset=utf-8;",
          });
          saveAs(blob, `${title.toLowerCase().replace(/\s+/g, "-")}.csv`);
        } else {
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          });
          saveAs(blob, `${title.toLowerCase().replace(/\s+/g, "-")}.json`);
        }
      }
    } catch (error) {
      console.error(`Error downloading chart as ${format}:`, error);
    }
  };

  const handleZoomIn = () => {
    onZoomIn();
  };

  const handleZoomOut = () => {
    onZoomOut();
  };

  const handleBoxSelect = () => {
    try {
      onBoxSelect();
      setSelectedTool("box");
      setShowTools(true);
    } catch (error) {
      console.error("Error in box selection:", error);
      setSelectedTool(null);
      setShowTools(true);
    }
  };

  const handleLassoSelect = () => {
    try {
      onLassoSelect();
      setSelectedTool("lasso");
      setShowTools(true);
    } catch (error) {
      console.error("Error in lasso selection:", error);
      setSelectedTool(null);
      setShowTools(true);
    }
  };

  const handleClearSelection = () => {
    try {
      onClearSelection();
      setSelectedTool(null);
      setShowTools(true);
    } catch (error) {
      console.error("Error clearing selection:", error);
      setSelectedTool(null);
      setShowTools(true);
    }
  };

  return (
    <div
      ref={toolbarRef}
      className="absolute top-1 right-1 z-30 flex items-center gap-1"
    >
      <div className="flex items-center bg-background/80 backdrop-blur-sm rounded-md border border-border shadow-sm">
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "h-6 w-6 rounded-none rounded-l-md",
            selectedTool === "box" && "bg-accent text-accent-foreground"
          )}
          onClick={handleBoxSelect}
          title="Box Select"
        >
          <Square className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "h-6 w-6 rounded-none",
            selectedTool === "lasso" && "bg-accent text-accent-foreground"
          )}
          onClick={handleLassoSelect}
          title="Lasso Select"
        >
          <Lasso className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 rounded-none"
          onClick={handleClearSelection}
          title="Clear Selection"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-x"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 rounded-none"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
            <path d="M8 11h6" />
            <path d="M11 8v6" />
          </svg>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 rounded-none"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
            <path d="M8 11h6" />
          </svg>
        </Button>
        <DropdownMenu open={showExport} onOpenChange={setShowExport}>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 rounded-none rounded-r-md"
              title="Export"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v12" />
                <path d="m8 11 4 4 4-4" />
                <path d="M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDownload("png")}>
              PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload("svg")}>
              SVG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload("pdf")}>
              PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload("csv")}>
              CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload("json")}>
              JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default ChartToolbar;
