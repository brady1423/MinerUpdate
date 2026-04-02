/**
 * Parse IP range strings into arrays of individual IPs.
 * Supports: "192.168.1.1-192.168.1.255" (dash range) and "192.168.1.0/24" (CIDR)
 */

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
type IpOctets = [number, number, number, number];

function parseIpOctets(ip: string): IpOctets | null {
  if (!IP_REGEX.test(ip)) {
    return null;
  }

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => part < 0 || part > 255)) {
    return null;
  }

  return parts as IpOctets;
}

function ipToNumber(parts: IpOctets): number {
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

function expandIpRange(start: number, end: number): string[] {
  const ips: string[] = [];

  for (let current = start; current <= end; current++) {
    ips.push(numberToIp(current));
  }

  return ips;
}

export function isValidIp(ip: string): boolean {
  return parseIpOctets(ip) !== null;
}

export function parseDashRange(range: string): string[] {
  const [start, end] = range.split('-').map((s) => s.trim());
  const startParts = parseIpOctets(start);
  const endParts = parseIpOctets(end);

  if (!startParts || !endParts) {
    throw new Error(`Invalid IP range: ${range}`);
  }

  const startNum = ipToNumber(startParts);
  const endNum = ipToNumber(endParts);

  if (startNum > endNum) {
    throw new Error(`Start IP is greater than end IP: ${range}`);
  }

  return expandIpRange(startNum, endNum);
}

export function parseCidr(cidr: string): string[] {
  const [ip, prefixStr] = cidr.split('/');
  const ipParts = parseIpOctets(ip);

  if (!ipParts) {
    throw new Error(`Invalid CIDR notation: ${cidr}`);
  }

  const prefix = Number(prefixStr);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    throw new Error(`Invalid CIDR prefix: ${cidr}`);
  }

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const network = (ipToNumber(ipParts) & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;

  // For /31 and /32, include all addresses; otherwise skip network and broadcast
  const start = prefix >= 31 ? network : network + 1;
  const end = prefix >= 31 ? broadcast : broadcast - 1;

  return expandIpRange(start, end);
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
