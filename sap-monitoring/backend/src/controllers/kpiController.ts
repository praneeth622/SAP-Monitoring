import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getKpis = async (req: Request, res: Response) => {
  try {
    const kpis = await prisma.kpi.findMany();
    res.json(kpis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch KPIs' });
  }
};

export const createKpi = async (req: Request, res: Response) => {
  const { group_id, area_id, ID, kpi_name, unit, description } = req.body;
  try {
    const newKpi = await prisma.kpi.create({
      data: {
        group_id,
        area_id,
        ID,
        kpi_name,
        unit,
        description,
      },
    });
    res.status(201).json(newKpi);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create KPI' });
  }
};
