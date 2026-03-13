import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import type { Server as SocketServer } from 'socket.io';
import {
  startFirmwareUpdate,
  getUpdateById,
  validateFirmwareForMiners,
} from '../services/firmware-updater.js';
import { getCurrentMiners } from '../services/scanner.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB
});

const minerIpsSchema = z.array(z.string().min(1)).min(1);

export function createFirmwareRouter(io: SocketServer): Router {
  const router = Router();

  // POST /api/firmware/validate — upload firmware + minerIps, returns validation result
  router.post('/validate', upload.single('firmware'), (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No firmware file provided' });
      return;
    }

    let minerIps: string[];
    try {
      minerIps = minerIpsSchema.parse(JSON.parse(req.body.minerIps));
    } catch {
      res.status(400).json({ error: 'Invalid minerIps: must be a JSON array of IP strings' });
      return;
    }

    const allMiners = getCurrentMiners();
    const selectedMiners = allMiners.filter((m) => minerIps.includes(m.ip));

    const result = validateFirmwareForMiners(req.file.originalname, selectedMiners);
    res.json(result);
  });

  // POST /api/firmware/update — upload firmware + minerIps, starts update
  router.post('/update', upload.single('firmware'), async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: 'No firmware file provided' });
      return;
    }

    let minerIps: string[];
    try {
      minerIps = minerIpsSchema.parse(JSON.parse(req.body.minerIps));
    } catch {
      res.status(400).json({ error: 'Invalid minerIps: must be a JSON array of IP strings' });
      return;
    }

    const firmwareBuffer = req.file.buffer;
    const filename = req.file.originalname;

    const allMiners = getCurrentMiners();
    const selectedMiners = allMiners.filter((m) => minerIps.includes(m.ip));

    const updateId = startFirmwareUpdate(selectedMiners, firmwareBuffer, filename, {
      onProgress: (progress) => {
        io.of('/firmware').emit('firmware:progress', progress);
      },
      onMinerStatus: (status) => {
        io.of('/firmware').emit('firmware:miner-status', status);
      },
      onComplete: (result) => {
        io.of('/firmware').emit('firmware:complete', result);
      },
    });

    res.status(202).json({ updateId });
  });

  // GET /api/firmware/update/:id — get update status
  router.get('/update/:id', (req, res) => {
    const update = getUpdateById(req.params.id);
    if (!update) {
      res.status(404).json({ error: 'Update not found' });
      return;
    }
    res.json(update);
  });

  return router;
}
