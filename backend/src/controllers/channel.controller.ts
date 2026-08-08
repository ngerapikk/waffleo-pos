import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getChannels = async (req: Request, res: Response) => {
  try {
    const channels = await prisma.channel.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    res.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
