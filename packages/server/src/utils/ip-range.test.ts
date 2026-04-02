import test from 'node:test';
import assert from 'node:assert/strict';

import { isValidIp, parseCidr, parseDashRange, parseRange, parseRanges } from './ip-range.js';

test('isValidIp accepts valid IPv4 addresses and rejects out-of-range octets', () => {
  assert.equal(isValidIp('192.168.1.1'), true);
  assert.equal(isValidIp('0.0.0.0'), true);
  assert.equal(isValidIp('255.255.255.255'), true);
  assert.equal(isValidIp('256.0.0.1'), false);
  assert.equal(isValidIp('192.168.1'), false);
});

test('parseDashRange expands inclusive ranges and rejects reversed ranges', () => {
  assert.deepEqual(parseDashRange('192.168.1.1 - 192.168.1.3'), [
    '192.168.1.1',
    '192.168.1.2',
    '192.168.1.3',
  ]);
  assert.throws(() => parseDashRange('192.168.1.3-192.168.1.1'), /Start IP is greater/);
});

test('parseCidr excludes network and broadcast for ordinary subnets', () => {
  assert.deepEqual(parseCidr('192.168.1.0/30'), [
    '192.168.1.1',
    '192.168.1.2',
  ]);
});

test('parseCidr includes all addresses for /31 and /32', () => {
  assert.deepEqual(parseCidr('192.168.1.0/31'), [
    '192.168.1.0',
    '192.168.1.1',
  ]);
  assert.deepEqual(parseCidr('192.168.1.5/32'), ['192.168.1.5']);
});

test('parseCidr rejects invalid addresses and prefixes', () => {
  assert.throws(() => parseCidr('999.168.1.0/24'), /Invalid CIDR notation/);
  assert.throws(() => parseCidr('192.168.1.0/33'), /Invalid CIDR prefix/);
});

test('parseRange detects single IPs, CIDR, and dash ranges', () => {
  assert.deepEqual(parseRange('192.168.1.8'), ['192.168.1.8']);
  assert.deepEqual(parseRange('192.168.1.8/32'), ['192.168.1.8']);
  assert.deepEqual(parseRange('192.168.1.8 - 192.168.1.9'), ['192.168.1.8', '192.168.1.9']);
  assert.throws(() => parseRange('not-a-range'), /Invalid IP range/);
});

test('parseRanges deduplicates overlapping ranges', () => {
  assert.deepEqual(parseRanges([
    '192.168.1.1-192.168.1.3',
    '192.168.1.2',
    '192.168.1.0/30',
  ]), [
    '192.168.1.1',
    '192.168.1.2',
    '192.168.1.3',
  ]);
});
