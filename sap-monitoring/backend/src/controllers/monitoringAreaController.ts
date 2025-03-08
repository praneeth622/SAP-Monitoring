import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getMonitoringAreas = async (req: Request, res: Response) => {
  try {
    const areas = await prisma.monitoringArea.findMany();
    res.json(areas);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monitoring areas' });
  }
};

export const createMonitoringArea = async (req: Request, res: Response) => {
  const { ID, area_name, description } = req.body;
  try {
    const newArea = await prisma.monitoringArea.create({
      data: {
        ID,
        area_name,
        description,
      },
    });
    res.status(201).json(newArea);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create monitoring area' });
  }
};
