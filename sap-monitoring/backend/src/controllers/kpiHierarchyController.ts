import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getKpiHierarchy = async (req: Request, res: Response) => {
  try {
    const data = await prisma.kpiHierarchy.findMany({
      select: {
        sid: true,
        monitoringArea: true,
        kpiGroup: true,
        kpiName: true,
        kpiDescription: true,
      },
    });

    // Transform data into hierarchical structure
    const hierarchy = data.reduce((acc: any, item) => {
      // Initialize monitoring area if not exists
      if (!acc[item.monitoringArea]) {
        acc[item.monitoringArea] = { groups: {} };
      }
      
      // Initialize KPI group if not exists
      if (!acc[item.monitoringArea].groups[item.kpiGroup]) {
        acc[item.monitoringArea].groups[item.kpiGroup] = { kpis: [] };
      }
      
      // Add KPI to group
      acc[item.monitoringArea].groups[item.kpiGroup].kpis.push({
        name: item.kpiName,
        description: item.kpiDescription
      });
      
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: hierarchy
    });
  } catch (error) {
    console.error('Error fetching KPI hierarchy:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  } finally {
    await prisma.$disconnect();
  }
};
