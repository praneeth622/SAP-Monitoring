import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getSystems = async (req: Request, res: Response) => {
  try {
    const systems = await prisma.system.findMany();
    res.json(systems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch systems' });
  }
};

export const createSystem = async (req: Request, res: Response) => {
  const { system_id, client, system_name, system_url, system_type, polling_status, connection_status, description } = req.body;
  try {
    const newSystem = await prisma.system.create({
      data: {
        system_id,
        client,
        system_name,
        system_url,
        system_type,
        polling_status,
        connection_status,
        description,
      },
    });
    res.status(201).json(newSystem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create system' });
  }
};
