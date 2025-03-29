import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { SystemValidationRequest } from '../types/system';

const prisma = new PrismaClient();

export const validateAndCreateSystem = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { systemName, description, systemSource, username, password } = req.body as SystemValidationRequest;

    // Validation checks
    if (!systemSource || !username || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Validation Error',
        message: 'System source, username, and password are required' 
      });
    }

    // Check connection (mock for now)
    const isConnectionValid = true; // Replace with actual connection check

    if (!isConnectionValid) {
      return res.status(400).json({
        success: false,
        error: 'Connection Error',
        message: 'Unable to establish connection with the system'
      });
    }

    // Create new system
    const newSystem = await prisma.systems.create({
      data: {
        systemId: `sys-${Date.now()}`,
        client: 'Client A', // This should come from actual system
        systemName: systemName || 'New System',
        systemUrl: systemSource,
        systemType: 'Standard', // This should be determined based on system
        pollingStatus: 'Active',
        connectionStatus: 'Connected',
        description: description || '',
        createdBy: username
      }
    });

    res.status(201).json({
      success: true,
      data: newSystem,
      message: 'System validated and created successfully'
    });
  } catch (error) {
    console.error('System validation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to validate and create system'
    });
  } finally {
    await prisma.$disconnect();
  }
};
