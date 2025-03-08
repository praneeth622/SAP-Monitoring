import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSystemStats = async (req: Request, res: Response) => {
  try {
    // Get total systems count
    const totalSystems = await prisma.systems.count();

    // Get systems count by polling status (Active, Inactive)
    const pollingStatusCounts = await prisma.systems.groupBy({
      by: ['pollingStatus'],
      _count: {
        pollingStatus: true
      },
      where: {
        pollingStatus: {
          in: ['Active', 'Inactive']
        }
      }
    });

    // Get count of disconnected systems (where connectionStatus is not 'Connected')
    const disconnectedSystems = await prisma.systems.count({
      where: {
        NOT: {
          connectionStatus: 'Connected'
        }
      }
    });

    // Format the response according to actual data structure
    const stats = {
      totalSystems,
      pollingStatusBreakdown: pollingStatusCounts.map(status => ({
        status: status.pollingStatus,
        count: status._count.pollingStatus
      })),
      systemStatus: {
        connected: totalSystems - disconnectedSystems,
        disconnected: disconnectedSystems
      }
    };

    res.status(200).json({
      success: true,
      data: stats,
      message: 'System statistics retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: 'Failed to retrieve system statistics'
    });
  } finally {
    await prisma.$disconnect();
  }
};
