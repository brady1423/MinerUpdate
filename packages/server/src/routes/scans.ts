import { Router } from 'express';
import { z } from 'zod';
import type { Server as SocketServer } from 'socket.io';
import { startScan, getScanById, getCurrentMiners, getMinerByIp } from '../services/scanner.js';

const scanRequestSchema = z.object({
  ranges: z.array(z.string().min(1)).min(1),
});

export function createScanRouter(io: SocketServer): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const parsed = scanRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const scanId = await startScan(parsed.data.ranges, {
      onProgress: (progress) => {
        io.of('/scans').emit('scan:progress', progress);
      },
      onMinerFound: (miner) => {
        io.of('/scans').emit('scan:found', miner);
      },
      onComplete: (result) => {
        io.of('/scans').emit('scan:complete', result);
      },
    });

    res.status(202).json({ scanId });
  });

  router.get('/:id', (req, res) => {
    const scan = getScanById(req.params.id);
    if (!scan) {
      res.status(404).json({ error: 'Scan not found' });
      return;
    }
    res.json(scan);
  });

  return router;
}

export function createMinersRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json(getCurrentMiners());
  });

  router.get('/:ip', (req, res) => {
    const miner = getMinerByIp(req.params.ip);
    if (!miner) {
      res.status(404).json({ error: 'Miner not found' });
      return;
    }
    res.json(miner);
  });

  return router;
}
