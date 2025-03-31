"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Download,
  ZoomIn,
  ZoomOut,
  Square,
  Lasso,
  Trash2,
  FileJson,
  FileSpreadsheet,
  File as FilePdf,
  Image,
} from "lucide-react";
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
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Handle clicks outside the toolbar to close it
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

  // Handle download functionality for different formats
  const handleDownload = async (
    format: "png" | "svg" | "pdf" | "csv" | "json"
  ) => {
    if (!chartInstance) {
      console.error("Chart instance is not available");
      return;
    }

    try {
      switch (format) {
        case "png": {
          const url = chartInstance.getDataURL({
            type: "png",
            pixelRatio: 2,
            backgroundColor: "#ffffff",
          });
          const link = document.createElement("a");
          link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.png`;
          link.href = url;
          link.click();
          break;
        }
        case "pdf": {
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

          // Calculate aspect ratio to fit the image properly
          const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
          const width = imgWidth * ratio;
          const height = imgHeight * ratio;
          const x = (pdfWidth - width) / 2;
          const y = (pdfHeight - height) / 2;

          pdf.addImage(url, "PNG", x, y, width, height);
          pdf.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
          break;
        }
        case "csv": {
          if (!data || !data.length) {
            console.error("No data available for CSV export");
            return;
          }

          // Create CSV header
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
          break;
        }
        case "json": {
          if (!data) {
            console.error("No data available for JSON export");
            return;
          }
          const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          });
          saveAs(blob, `${title.toLowerCase().replace(/\s+/g, "-")}.json`);
          break;
        }
        default:
          console.warn(`Download format not supported: ${format}`);
      }
    } catch (error) {
      console.error("Error downloading chart:", error);
    }
  };

  return (
    <div
      ref={toolbarRef}
      className="absolute top-2 right-2 z-30 flex items-center gap-2"
    >
      <div className="flex items-center">
        <motion.div
          className="flex items-center bg-background/95 backdrop-blur-sm rounded-lg shadow-lg border border-border"
          initial={false}
          animate={{
            width: showTools ? "auto" : "2rem",
            paddingRight: showTools ? "0.375rem" : "0",
          }}
          transition={{
            duration: 0.2,
            ease: "easeInOut",
          }}
        >
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-lg transition-colors",
              showTools && "rounded-r-none border-r border-border"
            )}
            onClick={() => setShowTools(!showTools)}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <AnimatePresence>
            {showTools && (
              <motion.div
                className="flex items-center gap-1 px-1"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onZoomIn}
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onZoomOut}
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <div className="w-[1px] h-8 bg-border mx-1" />

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onBoxSelect}
                  title="Box Selection"
                >
                  <Square className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onLassoSelect}
                  title="Lasso Selection"
                >
                  <Lasso className="h-4 w-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onClearSelection}
                  title="Clear Selection"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleDownload("png")}>
                      <Image className="h-4 w-4 mr-2" />
                      <span>Download PNG</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload("pdf")}>
                      <FilePdf className="h-4 w-4 mr-2" />
                      <span>Download PDF</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload("csv")}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      <span>Download CSV</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload("json")}>
                      <FileJson className="h-4 w-4 mr-2" />
                      <span>Download JSON</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

export default ChartToolbar;
