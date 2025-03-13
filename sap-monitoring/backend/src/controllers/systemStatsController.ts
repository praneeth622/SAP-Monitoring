import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSystemStats = async (req: Request, res: Response) => {
  const client = prisma;
  try {
    // Get total systems count with null check
    const totalSystems = await client.systems.count() || 0;

    // Get systems count by polling status with error handling
    const pollingStatusCounts = await client.systems.groupBy({
      by: ['pollingStatus'],
      _count: {
        pollingStatus: true
      },
      where: {
        pollingStatus: {
          in: ['Active', 'Inactive']
        }
      }
    }).catch(() => []);

    // Get count of disconnected systems with null check
    const disconnectedSystems = await client.systems.count({
      where: {
        NOT: {
          connectionStatus: 'Connected'
        }
      }
    }) || 0;

    // Format the response with safe defaults
    const stats = {
      totalSystems,
      pollingStatusBreakdown: (pollingStatusCounts || []).map(status => ({
        status: status.pollingStatus,
        count: status._count.pollingStatus
      })),
      systemStatus: {
        connected: Math.max(0, totalSystems - disconnectedSystems),
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
      message: error instanceof Error ? error.message : 'Failed to retrieve system statistics'
    });
  } finally {
    await client.$disconnect();
  }
};
