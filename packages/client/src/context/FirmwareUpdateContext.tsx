import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  FirmwareUpdateProgress,
  FirmwareUpdateMinerProgress,
  FirmwareUpdateResult,
} from '@minerupdate/shared';

const SOCKET_URL = 'http://localhost:3001/firmware';

interface FirmwareUpdateContextValue {
  progress: FirmwareUpdateProgress | null;
  minerStatuses: Map<string, FirmwareUpdateMinerProgress>;
  result: FirmwareUpdateResult | null;
  isComplete: boolean;
  resetFirmwareUpdate: () => void;
}

const FirmwareUpdateContext = createContext<FirmwareUpdateContextValue | null>(null);

export function FirmwareUpdateProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [progress, setProgress] = useState<FirmwareUpdateProgress | null>(null);
  const [minerStatuses, setMinerStatuses] = useState<Map<string, FirmwareUpdateMinerProgress>>(new Map());
  const [result, setResult] = useState<FirmwareUpdateResult | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('firmware:progress', (data: FirmwareUpdateProgress) => {
      setProgress(data);
      if (data.status === 'completed' || data.status === 'failed') {
        setIsComplete(true);
      }
    });

    socket.on('firmware:miner-status', (status: FirmwareUpdateMinerProgress) => {
      setMinerStatuses((prev) => {
        const next = new Map(prev);
        next.set(status.ip, status);
        return next;
      });
    });

    socket.on('firmware:complete', (data: FirmwareUpdateResult) => {
      setResult(data);
      setIsComplete(true);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const resetFirmwareUpdate = useCallback(() => {
    setProgress(null);
    setMinerStatuses(new Map());
    setResult(null);
    setIsComplete(false);
  }, []);

  return (
    <FirmwareUpdateContext.Provider value={{ progress, minerStatuses, result, isComplete, resetFirmwareUpdate }}>
      {children}
    </FirmwareUpdateContext.Provider>
  );
}

export function useFirmwareUpdateContext() {
  const ctx = useContext(FirmwareUpdateContext);
  if (!ctx) {
    throw new Error('useFirmwareUpdateContext must be used within a FirmwareUpdateProvider');
  }
  return ctx;
}
