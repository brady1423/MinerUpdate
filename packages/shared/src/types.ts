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
