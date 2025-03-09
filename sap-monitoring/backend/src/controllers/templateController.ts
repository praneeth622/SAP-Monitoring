import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define interface for template request body
interface TemplateRequest {
  name: string;
  system: string;
  timeRange: string;
  resolution: string;
  isDefault: boolean;
  isFavorite: boolean;
  graphs: Array<{
    name: string;
    type: 'line' | 'bar';
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
  }>;
}

export const createTemplate = async (
  req: Request<{}, {}, TemplateRequest>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, system, timeRange, resolution, isDefault, isFavorite, graphs } = req.body;

    const template = await prisma.template.create({
      data: {
        name,
        system,
        timeRange,
        resolution,
        isDefault,
        isFavorite,
        graphs: {
          create: graphs.map((graph, index) => ({
            ...graph,
            position: index
          }))
        }
      },
      include: {
        graphs: true
      }
    });

    res.status(201).json(template);
  } catch (error) {
    next(error);
  }
};

export const getTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const templates = await prisma.template.findMany({
      include: {
        graphs: true
      }
    });

    res.status(200).json(templates);
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
      include: {
        graphs: true
      }
    });

    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.status(200).json(template);
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
    const { name, system, timeRange, resolution, isDefault, isFavorite, graphs } = req.body;

    const template = await prisma.template.update({
      where: { id },
      data: {
        name,
        system,
        timeRange,
        resolution,
        isDefault,
        isFavorite,
        graphs: {
          deleteMany: {},
          create: graphs.map((graph, index) => ({
            ...graph,
            position: index
          }))
        }
      },
      include: {
        graphs: true
      }
    });

    res.status(200).json(template);
  } catch (error) {
    next(error);
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
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};