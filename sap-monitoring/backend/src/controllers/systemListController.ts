import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSystemList = async (req: Request, res: Response) => {
  try {
    const systems = await prisma.systems.findMany({
      select: {
        id: true,
        systemName: true,
        systemType: true,
        pollingStatus: true,
        connectionStatus: true,
      },
      orderBy: {
        systemName: 'asc',
      },
    });

    const formattedSystems = systems.map(system => ({
      ...system,
      isActive: system.pollingStatus === 'Active',
      connectionStatus: system.connectionStatus === 'Connected' ? 'Yes' : 'No'
    }));

    res.status(200).json({
      success: true,
      data: formattedSystems,
      message: 'Systems retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching systems:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve systems'
    });
  } finally {
    await prisma.$disconnect();
  }
};
