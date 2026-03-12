import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ScanProgress, Miner, ScanResult } from '@minerupdate/shared';

const SOCKET_URL = 'http://localhost:3001/scans';

export function useScanSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [miners, setMiners] = useState<Miner[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('scan:progress', (data: ScanProgress) => {
      setProgress(data);
      if (data.status === 'completed' || data.status === 'failed') {
        setIsComplete(true);
      }
    });

    socket.on('scan:found', (miner: Miner) => {
      setMiners((prev) => [...prev, miner]);
    });

    socket.on('scan:complete', (_result: ScanResult) => {
      setIsComplete(true);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const resetScan = useCallback(() => {
    setMiners([]);
    setProgress(null);
    setIsComplete(false);
  }, []);

  return { progress, miners, isComplete, resetScan };
}
