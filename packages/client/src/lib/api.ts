import type { SavedRange, Miner } from '@minerupdate/shared';

const BASE = 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Saved ranges
export const getRanges = () => request<SavedRange[]>('/api/ranges');
export const createRange = (data: { name: string; range: string }) =>
  request<SavedRange>('/api/ranges', { method: 'POST', body: JSON.stringify(data) });
export const deleteRange = (id: number) =>
  request<void>(`/api/ranges/${id}`, { method: 'DELETE' });

// Scans
export const startScan = (ranges: string[]) =>
  request<{ scanId: string }>('/api/scans', { method: 'POST', body: JSON.stringify({ ranges }) });

// Miners
export const getMiners = () => request<Miner[]>('/api/miners');
export const getMiner = (ip: string) => request<Miner>(`/api/miners/${ip}`);
