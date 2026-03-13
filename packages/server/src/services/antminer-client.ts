import DigestFetch from 'digest-fetch';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import os from 'os';
import type { Miner } from '@minerupdate/shared';

const TIMEOUT_MS = 5000;
const FIRMWARE_TIMEOUT_MS = 180_000;
const USERNAME = 'root';
const PASSWORD = 'root';

function createClient(): DigestFetch {
  return new DigestFetch(USERNAME, PASSWORD);
}

// --- BMU container parsing ---
// .bmu files are multi-model firmware containers. The miner's web UI JavaScript
// extracts the correct firmware image for the target hardware before uploading.
// Without extraction, the CGI rejects the raw container with U001 error.

const BMU_MAGIC = 0xABABABAB;

interface BmuHeader {
  magic: number;
  itemCount: number;
  itemSize: number;
  dataOffset: number;
}

interface BmuItem {
  name: string;
  ctrlBoardModel: string;
  minerModel: string;
  dataOffset: number;
  dataSize: number;
}

function parseBmuHeader(buf: Buffer): BmuHeader | null {
  if (buf.length < 36) return null;
  const magic = buf.readUInt32LE(0);
  if (magic !== BMU_MAGIC) return null;
  return {
    magic,
    itemCount: buf.readUInt32LE(12),
    itemSize: buf.readUInt32LE(16),
    dataOffset: buf.readUInt32LE(20),
  };
}

function parseBmuItems(buf: Buffer, hdr: BmuHeader): BmuItem[] {
  const items: BmuItem[] = [];
  for (let i = 0; i < hdr.itemCount; i++) {
    const base = 36 + i * hdr.itemSize;
    if (base + 172 > buf.length) break;
    const nameLen = buf[base];
    const ctrlBoardModelLen = buf[base + 2];
    const minerModelLen = buf[base + 3];
    items.push({
      name: buf.subarray(base + 4, base + 4 + nameLen).toString('utf8'),
      ctrlBoardModel: buf.subarray(base + 100, base + 100 + ctrlBoardModelLen).toString('utf8'),
      minerModel: buf.subarray(base + 132, base + 132 + minerModelLen).toString('utf8'),
      dataOffset: buf.readUInt32LE(base + 164),
      dataSize: buf.readUInt32LE(base + 168),
    });
  }
  return items;
}

interface MinerTypeResponse {
  miner_type?: string;
  subtype?: string;
  fw_version?: string;
  product_type?: string;
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

// Known error indicators in Antminer upgrade.cgi HTML responses
const UPGRADE_ERROR_PATTERNS = [
  /upgrade failed/i,
  /file is too large/i,
  /invalid firmware/i,
  /no file uploaded/i,
  /upload error/i,
  /firmware error/i,
];

const UPGRADE_SUCCESS_PATTERNS = [
  /upgrade is in progress/i,
  /upgrading/i,
  /rebooting/i,
  /will reboot/i,
];

export async function uploadFirmware(
  ip: string,
  firmwareBuffer: Buffer,
  filename: string,
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`[firmware] ${ip}: Starting firmware upload (${(firmwareBuffer.length / 1024 / 1024).toFixed(1)} MB)`);

    // Check if firmware is a BMU multi-model container and extract the correct image
    let uploadBuffer = firmwareBuffer;
    const bmuHeader = parseBmuHeader(firmwareBuffer);
    if (bmuHeader) {
      console.log(`[firmware] ${ip}: BMU container detected — ${bmuHeader.itemCount} firmware images`);
      const items = parseBmuItems(firmwareBuffer, bmuHeader);
      for (const item of items) {
        console.log(`[firmware] ${ip}:   - ${item.ctrlBoardModel} / ${item.minerModel} (${(item.dataSize / 1024 / 1024).toFixed(1)} MB)`);
      }

      // Query the miner for its hardware subtype to find the matching firmware
      const minerType = await fetchJson<MinerTypeResponse>(ip, 'miner_type.cgi');
      if (minerType?.subtype) {
        const match = items.find((item) => item.ctrlBoardModel === minerType.subtype);
        if (match) {
          console.log(`[firmware] ${ip}: Extracting firmware for subtype "${minerType.subtype}" (${(match.dataSize / 1024 / 1024).toFixed(1)} MB)`);
          uploadBuffer = firmwareBuffer.subarray(match.dataOffset, match.dataOffset + match.dataSize);
        } else {
          console.warn(`[firmware] ${ip}: No matching BMU item for subtype "${minerType.subtype}", uploading raw file`);
        }
      } else {
        console.warn(`[firmware] ${ip}: Could not determine miner subtype, uploading raw BMU file`);
      }
    }

    // Write firmware to temp file (curl needs a file path)
    const tmpDir = path.join(os.tmpdir(), 'minerupdate-fw');
    await mkdir(tmpDir, { recursive: true });
    const safeFilename = `fw-${crypto.randomBytes(4).toString('hex')}.bin`;
    const tmpFile = path.join(tmpDir, safeFilename);
    await writeFile(tmpFile, uploadBuffer);

    const uploadUrl = `http://${ip}/cgi-bin/upgrade.cgi`;

    try {
      console.log(`[firmware] ${ip}: Uploading ${(uploadBuffer.length / 1024 / 1024).toFixed(1)} MB via curl...`);

      const responseBody = await new Promise<string>((resolve, reject) => {
        execFile('curl', [
          '-s', '-S',
          '--digest',
          '-u', `${USERNAME}:${PASSWORD}`,
          '-H', 'Expect:',
          '-F', `firmware=@${tmpFile};filename=${filename}`,
          '--max-time', String(Math.ceil(FIRMWARE_TIMEOUT_MS / 1000)),
          '-w', '\n%{http_code}',
          uploadUrl,
        ], { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`curl failed: ${stderr || error.message}`));
          } else {
            if (stderr) console.warn(`[firmware] ${ip}: curl stderr: ${stderr}`);
            resolve(stdout);
          }
        });
      });

      // Parse response: body lines + HTTP status code on last line (from -w flag)
      const lines = responseBody.trimEnd().split('\n');
      const statusLine = lines.pop() || '';
      const statusCode = parseInt(statusLine, 10);
      const body = lines.join('\n');

      console.log(`[firmware] ${ip}: Response status ${statusCode}`);
      console.log(`[firmware] ${ip}: Response body (first 500 chars): ${body.slice(0, 500)}`);

      if (statusCode === 401) {
        return { success: false, message: 'Authentication failed (401) — check miner credentials' };
      }

      if (statusCode < 200 || statusCode >= 300) {
        return { success: false, message: `HTTP ${statusCode}` };
      }

      // Parse response body — Antminer returns 200 even on failure
      try {
        const json = JSON.parse(body);
        if (json.stats === 'error' || json.status === 'error' || json.error) {
          const code = json.code ? ` (code: ${json.code})` : '';
          const msg = json.msg || json.message || json.error || 'Unknown error';
          console.log(`[firmware] ${ip}: Upload failed — JSON error response${code}: ${msg}`);
          return { success: false, message: `Miner rejected firmware${code}: ${msg}` };
        }
        if (json.stats === 'success' || json.status === 'success') {
          console.log(`[firmware] ${ip}: Upload confirmed via JSON response`);
          return { success: true, message: 'Firmware upload accepted' };
        }
      } catch {
        // Not JSON — fall through to HTML pattern matching
      }

      const hasSuccess = UPGRADE_SUCCESS_PATTERNS.some((p) => p.test(body));
      if (hasSuccess) {
        console.log(`[firmware] ${ip}: Upload confirmed — miner is upgrading`);
        return { success: true, message: 'Firmware upload accepted, miner is upgrading' };
      }

      const hasError = UPGRADE_ERROR_PATTERNS.some((p) => p.test(body));
      if (hasError) {
        console.log(`[firmware] ${ip}: Upload failed — error detected in response body`);
        return { success: false, message: `Miner rejected firmware: ${body.slice(0, 200)}` };
      }

      console.log(`[firmware] ${ip}: No recognized pattern in response, assuming success`);
      return { success: true, message: 'Firmware upload accepted (unrecognized response)' };
    } finally {
      await unlink(tmpFile).catch(() => {});
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[firmware] ${ip}: Upload error — ${message}`);
    return { success: false, message };
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
