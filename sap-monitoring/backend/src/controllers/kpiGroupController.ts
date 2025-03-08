import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getKpiGroups = async (req: Request, res: Response) => {
  try {
    const groups = await prisma.kpiGroup.findMany();
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch KPI groups' });
  }
};

export const createKpiGroup = async (req: Request, res: Response) => {
  const { area_id, ID, group_name, description } = req.body;
  try {
    const newGroup = await prisma.kpiGroup.create({
      data: {
        area_id,
        ID,
        group_name,
        description,
      },
    });
    res.status(201).json(newGroup);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create KPI group' });
  }
};
