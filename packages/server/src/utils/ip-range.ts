/**
 * Parse IP range strings into arrays of individual IPs.
 * Supports: "10.69.2.1-10.69.2.255" (dash range) and "10.69.2.0/24" (CIDR)
 */

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function numberToIp(num: number): string {
  return [
    (num >>> 24) & 255,
    (num >>> 16) & 255,
    (num >>> 8) & 255,
    num & 255,
  ].join('.');
}

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;

export function isValidIp(ip: string): boolean {
  if (!IP_REGEX.test(ip)) return false;
  return ip.split('.').every((p) => {
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

export function parseDashRange(range: string): string[] {
  const [start, end] = range.split('-').map((s) => s.trim());
  if (!isValidIp(start) || !isValidIp(end)) {
    throw new Error(`Invalid IP range: ${range}`);
  }
  const startNum = ipToNumber(start);
  const endNum = ipToNumber(end);
  if (startNum > endNum) {
    throw new Error(`Start IP is greater than end IP: ${range}`);
  }
  const ips: string[] = [];
  for (let i = startNum; i <= endNum; i++) {
    ips.push(numberToIp(i));
  }
  return ips;
}

export function parseCidr(cidr: string): string[] {
  const [ip, prefixStr] = cidr.split('/');
  if (!isValidIp(ip)) {
    throw new Error(`Invalid CIDR notation: ${cidr}`);
  }
  const prefix = Number(prefixStr);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(`Invalid CIDR prefix: ${cidr}`);
  }
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = (ipToNumber(ip) & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  const ips: string[] = [];
  // For /31 and /32, include all addresses; otherwise skip network and broadcast
  const start = prefix >= 31 ? network : network + 1;
  const end = prefix >= 31 ? broadcast : broadcast - 1;
  for (let i = start; i <= end; i++) {
    ips.push(numberToIp(i));
  }
  return ips;
}

export function parseRange(range: string): string[] {
  const trimmed = range.trim();
  if (trimmed.includes('/')) {
    return parseCidr(trimmed);
  }
  if (trimmed.includes('-')) {
    return parseDashRange(trimmed);
  }
  // Single IP
  if (isValidIp(trimmed)) {
    return [trimmed];
  }
  throw new Error(`Unrecognized IP range format: ${range}`);
}

export function parseRanges(ranges: string[]): string[] {
  const allIps: string[] = [];
  for (const range of ranges) {
    allIps.push(...parseRange(range));
  }
  // Deduplicate
  return [...new Set(allIps)];
}
