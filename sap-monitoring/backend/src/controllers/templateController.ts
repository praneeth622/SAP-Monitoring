import { Request, Response, NextFunction } from "express";
import { PrismaClient, Prisma } from "@prisma/client"; // Added Prisma types
import { z } from "zod";

const prisma = new PrismaClient();

interface Graph {
  id: string;
  name: string;
  type: "line" | "bar";
  monitoringArea: string;
  kpiGroup: string;
  primaryKpi: string;
  correlationKpis: string[];
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  activeKPIs: string[];
  kpiColors: Record<string, { color: string; name: string }>;
}

// Define interface for template request body
interface TemplateRequest {
  name: string;
  system: string;
  timeRange: string;
  resolution: string;
  isDefault: boolean;
  isFavorite: boolean;
  graphs: Graph[];
}

// Updated validation schema for graph structure
const GraphSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Graph name is required"),
  type: z.enum(["line", "bar"]), // Removed invalid parameter
  monitoringArea: z.string().min(1, "Monitoring area is required"),
  kpiGroup: z.string().min(1, "KPI group is required"),
  primaryKpi: z.string().min(1, "Primary KPI is required"),
  correlationKpis: z.array(z.string()),
  layout: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
  }),
  activeKPIs: z.array(z.string()),
  kpiColors: z.record(
    z.object({
      color: z.string(),
      name: z.string(),
    })
  ),
});

const TemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  system: z.string().min(1, "System is required"),
  timeRange: z.string().min(1, "Time range is required"),
  resolution: z.string().min(1, "Resolution is required"),
  isDefault: z.boolean(),
  isFavorite: z.boolean(),
  graphs: z
    .array(GraphSchema)
    .min(1, "At least one graph is required")
    .max(9, "Maximum 9 graphs allowed"),
});

export const createTemplate = async (
  req: Request<{}, {}, TemplateRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const validationResult = TemplateSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.errors,
      });
      return;
    }

    const {
      name,
      system,
      timeRange,
      resolution,
      isDefault,
      isFavorite,
      graphs,
    } = validationResult.data;

    // Process graphs data for storage
    const processedGraphs = graphs.map((graph) => ({
      ...graph,
      activeKPIs: Array.from(graph.activeKPIs || []),
      kpiColors: Object.fromEntries(
        Object.entries(graph.kpiColors).map(([key, value]) => [
          key,
          { color: value.color, name: value.name },
        ])
      ),
    }));

    const template = await prisma.template.create({
      data: {
        name,
        system,
        timeRange,
        resolution,
        isDefault,
        isFavorite,
        graphs: processedGraphs as Prisma.JsonArray, // Cast to JsonArray
      },
    });

    res.status(201).json(template);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        error: "Failed to create template",
        message: error.message,
      });
    } else {
      next(error);
    }
  }
};

// Add a utility function to convert stored JSON back to proper types
const convertStoredGraphs = (graphs: any[]) => {
  return graphs.map((graph) => ({
    ...graph,
    activeKPIs: new Set(graph.activeKPIs),
    kpiColors: Object.fromEntries(
      Object.entries(graph.kpiColors).map(([key, value]: [string, any]) => [
        key,
        { color: value.color, name: value.name },
      ])
    ),
  }));
};

export const getTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const templates = await prisma.template.findMany();

    // Convert stored JSON to proper types
    const processedTemplates = templates.map((template) => ({
      ...template,
      graphs: convertStoredGraphs(template.graphs as any[]),
    }));

    res.status(200).json(processedTemplates);
  } catch (error) {
    next(error);
  }
};

export const getTemplateById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const template = await prisma.template.findUnique({
      where: { id },
    }); // Removed include since graphs is now JSONB

    if (!template) {
      res.status(404).json({ error: "Template not found" });
      return;
    }

    // Convert stored graphs back to proper format
    const processedTemplate = {
      ...template,
      graphs: convertStoredGraphs(template.graphs as any[]),
    };

    res.status(200).json(processedTemplate);
  } catch (error) {
    next(error);
  }
};

export const updateTemplate = async (
  req: Request<{ id: string }, {}, TemplateRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const validationResult = TemplateSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        error: "Validation failed",
        details: validationResult.error.errors,
      });
      return;
    }

    const {
      name,
      system,
      timeRange,
      resolution,
      isDefault,
      isFavorite,
      graphs,
    } = validationResult.data;

    const processedGraphs = graphs.map((graph) => ({
      ...graph,
      activeKPIs: Array.from(graph.activeKPIs || []),
      kpiColors: Object.fromEntries(
        Object.entries(graph.kpiColors).map(([key, value]) => [
          key,
          { color: value.color, name: value.name },
        ])
      ),
    }));

    const template = await prisma.template.update({
      where: { id },
      data: {
        name,
        system,
        timeRange,
        resolution,
        isDefault,
        isFavorite,
        graphs: processedGraphs as Prisma.JsonArray, // Cast to JsonArray
      },
    });

    res.status(200).json(template);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({
        error: "Failed to update template",
        message: error.message,
      });
    } else {
      next(error);
    }
  }
};

export const deleteTemplate = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.template.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
