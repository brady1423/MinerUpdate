import DigestFetch from 'digest-fetch';
import type { Miner } from '@minerupdate/shared';

const TIMEOUT_MS = 5000;
const USERNAME = 'root';
const PASSWORD = 'root';

function createClient(): DigestFetch {
  return new DigestFetch(USERNAME, PASSWORD);
}

interface SystemInfoResponse {
  minertype?: string;
  firmware_type?: string;
  system_filesystem_version?: string;
  hostname?: string;
  [key: string]: unknown;
}

interface PoolInfo {
  url?: string;
  user?: string;
  [key: string]: unknown;
}

interface MinerConfResponse {
  pools?: PoolInfo[];
  [key: string]: unknown;
}

interface StatsResponse {
  STATS?: Array<{
    rate_5s?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

async function fetchWithTimeout(client: DigestFetch, url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await client.fetch(url, { signal: controller.signal });
    return response as Response;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson<T>(ip: string, endpoint: string): Promise<T | null> {
  try {
    const client = createClient();
    const response = await fetchWithTimeout(client, `http://${ip}/cgi-bin/${endpoint}`);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function probeMiner(ip: string): Promise<Miner | null> {
  const [systemInfo, minerConf, stats] = await Promise.all([
    fetchJson<SystemInfoResponse>(ip, 'get_system_info.cgi'),
    fetchJson<MinerConfResponse>(ip, 'get_miner_conf.cgi'),
    fetchJson<StatsResponse>(ip, 'stats.cgi'),
  ]);

  if (!systemInfo) return null;

  const pool = minerConf?.pools?.find((p) => p.url);
  const hashrate = stats?.STATS?.[0]?.rate_5s ?? 0;
  const subnet = ip.split('.').slice(0, 3).join('.') + '.0/24';

  return {
    ip,
    model: systemInfo.minertype || 'Unknown',
    hostname: systemInfo.hostname || '',
    firmwareVersion: systemInfo.system_filesystem_version || 'Unknown',
    poolUrl: pool?.url || '',
    workerName: pool?.user || '',
    hashrate,
    status: 'online',
    lastSeen: new Date().toISOString(),
    subnet,
  };
}
