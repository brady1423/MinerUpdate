import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ScanProgress, Miner, ScanResult } from '@minerupdate/shared';

const SOCKET_URL = 'http://localhost:3001/scans';

interface ScanContextValue {
  progress: ScanProgress | null;
  miners: Miner[];
  isComplete: boolean;
  resetScan: () => void;
}

const ScanContext = createContext<ScanContextValue | null>(null);

export function ScanProvider({ children }: { children: ReactNode }) {
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

  return (
    <ScanContext.Provider value={{ progress, miners, isComplete, resetScan }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScanContext() {
  const ctx = useContext(ScanContext);
  if (!ctx) {
    throw new Error('useScanContext must be used within a ScanProvider');
  }
  return ctx;
}
