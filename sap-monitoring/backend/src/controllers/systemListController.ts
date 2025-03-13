import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSystemList = async (req: Request, res: Response) => {
  try {
    const systems = await prisma.systems.findMany({
      select: {
        id: true,
        systemId: true,
        systemName: true,
        systemType: true,
        pollingStatus: true,
        connectionStatus: true,
      },
      orderBy: {
        systemName: 'asc',
      },
    });

    const formattedSystems = systems.map((system, index) => ({
      ...system,
      no: index + 1,
      isActive: system.pollingStatus === 'Active',
      status: {
        polling: system.pollingStatus,
        connection: system.connectionStatus
      }
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

export const deleteSystem = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    await prisma.systems.delete({
      where: { id: parseInt(id) }
    });

    res.status(200).json({
      success: true,
      message: 'System deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting system:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete system'
    });
  } finally {
    await prisma.$disconnect();
  }
};
