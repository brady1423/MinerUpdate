export interface Miner {
  ip: string;
  model: string;
  hostname: string;
  firmwareVersion: string;
  poolUrl: string;
  workerName: string;
  hashrate: number;
  status: 'online' | 'offline' | 'error';
  lastSeen: string;
  subnet: string;
}

export interface SavedRange {
  id: number;
  name: string;
  range: string;
  createdAt: string;
}

export interface ScanRequest {
  ranges: string[];
}

export interface ScanProgress {
  scanId: string;
  total: number;
  scanned: number;
  found: number;
  currentIp: string;
  status: 'running' | 'completed' | 'failed';
}

export interface ScanResult {
  scanId: string;
  miners: Miner[];
  totalScanned: number;
  totalFound: number;
  duration: number;
}

// Firmware update types
export type FirmwareUpdateMinerStatus = 'pending' | 'uploading' | 'success' | 'failed' | 'rebooting' | 'verifying';

export interface FirmwareUpdateRequest {
  minerIps: string[];
  firmwareFilename: string;
}

export interface FirmwareUpdateMinerProgress {
  ip: string;
  status: FirmwareUpdateMinerStatus;
  error?: string;
  newVersion?: string;
}

export interface FirmwareUpdateProgress {
  updateId: string;
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  status: 'running' | 'completed' | 'failed';
}

export interface FirmwareUpdateResult {
  updateId: string;
  total: number;
  succeeded: number;
  failed: number;
  minerResults: FirmwareUpdateMinerProgress[];
  duration: number;
}

export interface FirmwareValidationResult {
  valid: boolean;
  detectedModel: string | null;
  compatibleMiners: string[];
  incompatibleMiners: string[];
}
