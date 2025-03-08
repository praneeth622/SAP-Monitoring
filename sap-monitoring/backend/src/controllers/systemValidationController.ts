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

    // Check if required fields are present
    if (!systemSource || !username || !password) {
      res.status(400).json({ error: 'System source, username, and password are required' });
      return;
    }

    // Check if system exists in dummy table
    const dummySystem = await prisma.systemsDummy.findFirst({
      where: {
        systemUrl: systemSource,
        userID: username,
        password: password,
      },
    });

    if (!dummySystem) {
      res.status(404).json({ error: 'System not found in dummy records' });
      return;
    }

    // If dummySystem.systemName is null, we need to handle that case
    if (!dummySystem.systemName) {
      res.status(400).json({ error: 'System name is missing in dummy records' });
      return;
    }

    // Create new system entry with proper type handling
    const newSystem = await prisma.systems.create({
      data: {
        systemId: dummySystem.systemId,
        client: dummySystem.client,
        systemName: systemName || dummySystem.systemName,
        systemUrl: dummySystem.systemUrl,
        systemType: dummySystem.systemType,
        pollingStatus: dummySystem.pollingStatus,
        connectionStatus: dummySystem.connectionStatus,
        description: description || dummySystem.description || '',
        createdBy: username,
      },
    });

    res.status(201).json(newSystem);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
};
