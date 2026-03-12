import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const createRangeSchema = z.object({
  name: z.string().min(1).max(100),
  range: z.string().min(1).max(200),
});

router.get('/', async (_req, res) => {
  const ranges = await prisma.savedRange.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(ranges);
});

router.post('/', async (req, res) => {
  const parsed = createRangeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const range = await prisma.savedRange.create({ data: parsed.data });
  res.status(201).json(range);
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid ID' });
    return;
  }
  await prisma.savedRange.delete({ where: { id } });
  res.status(204).end();
});

export default router;
