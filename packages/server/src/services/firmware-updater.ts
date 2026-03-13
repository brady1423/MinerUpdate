import pLimit from 'p-limit';
import { v4 as uuidv4 } from 'uuid';
import type {
  FirmwareUpdateProgress,
  FirmwareUpdateMinerProgress,
  FirmwareUpdateResult,
  FirmwareValidationResult,
  Miner,
} from '@minerupdate/shared';
import { uploadFirmware, probeMiner } from './antminer-client.js';

const FIRMWARE_CONCURRENCY = 5;
const VERIFY_INITIAL_DELAY_MS = 30_000; // Wait for miner to start rebooting
const VERIFY_POLL_INTERVAL_MS = 10_000; // Poll every 10s
const VERIFY_TIMEOUT_MS = 180_000;      // Give up after 3 minutes

export type FirmwareEventCallback = {
  onProgress: (progress: FirmwareUpdateProgress) => void;
  onMinerStatus: (status: FirmwareUpdateMinerProgress) => void;
  onComplete: (result: FirmwareUpdateResult) => void;
};

interface ActiveUpdate {
  id: string;
  progress: FirmwareUpdateProgress;
  minerStatuses: FirmwareUpdateMinerProgress[];
}

let currentUpdate: ActiveUpdate | null = null;

export function getCurrentUpdate(): ActiveUpdate | null {
  return currentUpdate;
}

export function getUpdateById(updateId: string): ActiveUpdate | null {
  if (currentUpdate?.id === updateId) return currentUpdate;
  return null;
}

/**
 * Try to extract a model identifier from the firmware filename.
 * Example: "Antminer-L9-merge-release-20250210032929 (2).bmu" → "L9"
 */
function parseModelFromFilename(filename: string): string | null {
  const base = filename.replace(/\.bmu$/i, '');
  const normalized = base.replace(/[-_]+/g, ' ');
  // Match model code (e.g. S19j, L9, T21, S21 Pro) stopping before noise words
  const match = normalized.match(/\b([STL]\d{1,2}\w*(?:\s+(?:Pro|Ultra|Hydro|SE|Nuo))?)\b/i);
  if (match) {
    return match[1].trim();
  }
  return null;
}

function modelsMatch(firmwareModel: string, minerModel: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[-_\s]+/g, '');
  const fw = normalize(firmwareModel);
  const mn = normalize(minerModel);
  return mn.includes(fw) || fw.includes(mn);
}

export function validateFirmwareForMiners(
  filename: string,
  miners: Miner[],
): FirmwareValidationResult {
  const detectedModel = parseModelFromFilename(filename);

  // If we can't detect a model, all miners are treated as compatible
  if (!detectedModel) {
    return {
      valid: true,
      detectedModel: null,
      compatibleMiners: miners.map((m) => m.ip),
      incompatibleMiners: [],
    };
  }

  const compatible: string[] = [];
  const incompatible: string[] = [];

  for (const miner of miners) {
    if (modelsMatch(detectedModel, miner.model)) {
      compatible.push(miner.ip);
    } else {
      incompatible.push(miner.ip);
    }
  }

  return {
    valid: compatible.length > 0,
    detectedModel,
    compatibleMiners: compatible,
    incompatibleMiners: incompatible,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyFirmwareUpdate(
  ip: string,
  originalVersion: string,
): Promise<{ success: boolean; newVersion?: string }> {
  console.log(`[firmware] ${ip}: Waiting ${VERIFY_INITIAL_DELAY_MS / 1000}s for miner to start rebooting...`);
  await delay(VERIFY_INITIAL_DELAY_MS);

  const deadline = Date.now() + VERIFY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const miner = await probeMiner(ip);
      if (miner) {
        if (miner.firmwareVersion !== originalVersion) {
          console.log(`[firmware] ${ip}: Firmware changed from "${originalVersion}" to "${miner.firmwareVersion}"`);
          return { success: true, newVersion: miner.firmwareVersion };
        }
        // Miner is back online but same version — could still be mid-reboot, keep polling
        console.log(`[firmware] ${ip}: Miner online but version unchanged (${miner.firmwareVersion}), retrying...`);
      }
    } catch {
      // Miner still rebooting / unreachable
      console.log(`[firmware] ${ip}: Miner not reachable yet, retrying...`);
    }
    await delay(VERIFY_POLL_INTERVAL_MS);
  }

  console.log(`[firmware] ${ip}: Verification timed out — firmware version unchanged`);
  return { success: false };
}

export function startFirmwareUpdate(
  miners: Miner[],
  firmwareBuffer: Buffer,
  filename: string,
  callbacks: FirmwareEventCallback,
): string {
  const updateId = uuidv4();
  const startTime = Date.now();

  const update: ActiveUpdate = {
    id: updateId,
    progress: {
      updateId,
      total: miners.length,
      completed: 0,
      succeeded: 0,
      failed: 0,
      status: 'running',
    },
    minerStatuses: miners.map((m) => ({ ip: m.ip, status: 'pending' })),
  };

  currentUpdate = update;

  // Run the update in the background — return updateId immediately
  const runUpdate = async () => {
    const limit = pLimit(FIRMWARE_CONCURRENCY);

    const tasks = miners.map((miner) =>
      limit(async () => {
        const ip = miner.ip;
        if (currentUpdate?.id !== updateId) return;

        // Update to uploading
        const minerStatus = update.minerStatuses.find((m) => m.ip === ip)!;
        minerStatus.status = 'uploading';
        callbacks.onMinerStatus({ ...minerStatus });

        try {
          const result = await uploadFirmware(ip, firmwareBuffer, filename);

          if (result.success) {
            minerStatus.status = 'rebooting';
            callbacks.onMinerStatus({ ...minerStatus });

            // Verify the firmware actually changed
            minerStatus.status = 'verifying';
            callbacks.onMinerStatus({ ...minerStatus });

            const verification = await verifyFirmwareUpdate(ip, miner.firmwareVersion);

            if (verification.success) {
              minerStatus.status = 'success';
              minerStatus.newVersion = verification.newVersion;
              update.progress.succeeded++;
            } else {
              minerStatus.status = 'failed';
              minerStatus.error = 'Firmware version unchanged after upload — update may not have applied';
              update.progress.failed++;
            }
            callbacks.onMinerStatus({ ...minerStatus });
          } else {
            minerStatus.status = 'failed';
            minerStatus.error = result.message;
            callbacks.onMinerStatus({ ...minerStatus });
            update.progress.failed++;
          }
        } catch (err) {
          minerStatus.status = 'failed';
          minerStatus.error = err instanceof Error ? err.message : 'Unknown error';
          callbacks.onMinerStatus({ ...minerStatus });
          update.progress.failed++;
        }

        update.progress.completed++;
        callbacks.onProgress({ ...update.progress });
      }),
    );

    try {
      await Promise.all(tasks);
      if (currentUpdate?.id === updateId) {
        update.progress.status = 'completed';
        callbacks.onProgress({ ...update.progress });
        callbacks.onComplete({
          updateId,
          total: miners.length,
          succeeded: update.progress.succeeded,
          failed: update.progress.failed,
          minerResults: [...update.minerStatuses],
          duration: Date.now() - startTime,
        });
      }
    } catch {
      if (currentUpdate?.id === updateId) {
        update.progress.status = 'failed';
        callbacks.onProgress({ ...update.progress });
      }
    }
  };

  runUpdate().catch((err) => {
    console.error(`[firmware] Update ${updateId} crashed:`, err);
    if (currentUpdate?.id === updateId) {
      update.progress.status = 'failed';
      callbacks.onProgress({ ...update.progress });
    }
  });

  return updateId;
}
