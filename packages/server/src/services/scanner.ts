import pLimit from 'p-limit';
import { v4 as uuidv4 } from 'uuid';
import type { Miner, ScanProgress, ScanResult } from '@minerupdate/shared';
import { parseRanges } from '../utils/ip-range.js';
import { probeMiner } from './antminer-client.js';

const CONCURRENCY = 50;

export type ScanEventCallback = {
  onProgress: (progress: ScanProgress) => void;
  onMinerFound: (miner: Miner) => void;
  onComplete: (result: ScanResult) => void;
};

interface ActiveScan {
  id: string;
  result: ScanResult;
  progress: ScanProgress;
}

// In-memory store — only one scan at a time, previous results cleared on new scan
let currentScan: ActiveScan | null = null;

export function getCurrentScan(): ActiveScan | null {
  return currentScan;
}

export function getScanById(scanId: string): ActiveScan | null {
  if (currentScan?.id === scanId) return currentScan;
  return null;
}

export function getCurrentMiners(): Miner[] {
  return currentScan?.result.miners ?? [];
}

export function getMinerByIp(ip: string): Miner | undefined {
  return currentScan?.result.miners.find((m) => m.ip === ip);
}

export async function startScan(
  ranges: string[],
  callbacks: ScanEventCallback,
): Promise<string> {
  const scanId = uuidv4();
  const ips = parseRanges(ranges);
  const startTime = Date.now();

  const scan: ActiveScan = {
    id: scanId,
    progress: {
      scanId,
      total: ips.length,
      scanned: 0,
      found: 0,
      currentIp: '',
      status: 'running',
    },
    result: {
      scanId,
      miners: [],
      totalScanned: 0,
      totalFound: 0,
      duration: 0,
    },
  };

  // Clear previous results
  currentScan = scan;

  const limit = pLimit(CONCURRENCY);

  const tasks = ips.map((ip) =>
    limit(async () => {
      // If a newer scan started, abort this one
      if (currentScan?.id !== scanId) return;

      scan.progress.currentIp = ip;

      try {
        const miner = await probeMiner(ip);
        if (miner) {
          scan.result.miners.push(miner);
          scan.progress.found++;
          scan.result.totalFound = scan.progress.found;
          callbacks.onMinerFound(miner);
        }
      } catch {
        // Individual probe failure — skip
      }

      scan.progress.scanned++;
      scan.result.totalScanned = scan.progress.scanned;
      callbacks.onProgress({ ...scan.progress });
    }),
  );

  // Run all probes
  try {
    await Promise.all(tasks);
    if (currentScan?.id === scanId) {
      scan.progress.status = 'completed';
      scan.result.duration = Date.now() - startTime;
      callbacks.onProgress({ ...scan.progress });
      callbacks.onComplete({ ...scan.result });
    }
  } catch {
    if (currentScan?.id === scanId) {
      scan.progress.status = 'failed';
      callbacks.onProgress({ ...scan.progress });
    }
  }

  return scanId;
}
