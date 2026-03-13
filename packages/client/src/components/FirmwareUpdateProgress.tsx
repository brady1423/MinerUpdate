import type { FirmwareUpdateProgress as ProgressType, FirmwareUpdateMinerProgress } from '@minerupdate/shared';

interface Props {
  progress: ProgressType | null;
  minerStatuses: Map<string, FirmwareUpdateMinerProgress>;
  isComplete: boolean;
  onClose: () => void;
}

const statusConfig: Record<string, { label: string; color: string; dot: string; animate?: boolean }> = {
  pending: { label: 'Pending', color: 'text-gray-500', dot: 'bg-gray-500' },
  uploading: { label: 'Uploading', color: 'text-amber-500', dot: 'bg-amber-500', animate: true },
  rebooting: { label: 'Rebooting', color: 'text-blue-400', dot: 'bg-blue-400', animate: true },
  verifying: { label: 'Verifying', color: 'text-purple-400', dot: 'bg-purple-400', animate: true },
  success: { label: 'Success', color: 'text-green-500', dot: 'bg-green-500' },
  failed: { label: 'Failed', color: 'text-red-500', dot: 'bg-red-500' },
};

export default function FirmwareUpdateProgress({ progress, minerStatuses, isComplete, onClose }: Props) {
  const progressPct = progress ? Math.round((progress.completed / progress.total) * 100) : 0;
  const statuses = Array.from(minerStatuses.values());

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-gray-400">
            {isComplete ? 'Update Complete' : 'Updating Firmware...'}
          </span>
          <span className="text-gray-500 tabular-nums">{progressPct}%</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progressPct}%`,
              background: isComplete
                ? progress?.failed === 0
                  ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                  : 'linear-gradient(90deg, #d97706, #f59e0b)'
                : 'linear-gradient(90deg, #d97706, #f59e0b)',
            }}
          />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 text-xs font-mono">
          <div className="bg-gray-950/60 rounded px-2 py-1.5 text-center">
            <div className="text-gray-500 text-[10px] uppercase">Total</div>
            <div className="text-gray-200 tabular-nums">{progress?.total ?? 0}</div>
          </div>
          <div className="bg-gray-950/60 rounded px-2 py-1.5 text-center">
            <div className="text-gray-500 text-[10px] uppercase">Done</div>
            <div className="text-gray-200 tabular-nums">{progress?.completed ?? 0}</div>
          </div>
          <div className="bg-gray-950/60 rounded px-2 py-1.5 text-center">
            <div className="text-gray-500 text-[10px] uppercase">OK</div>
            <div className="text-green-500 tabular-nums">{progress?.succeeded ?? 0}</div>
          </div>
          <div className="bg-gray-950/60 rounded px-2 py-1.5 text-center">
            <div className="text-gray-500 text-[10px] uppercase">Fail</div>
            <div className="text-red-500 tabular-nums">{progress?.failed ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Per-miner status table */}
      <div className="max-h-64 overflow-y-auto border border-gray-800/60 rounded">
        <table className="w-full text-xs font-mono">
          <thead className="sticky top-0 bg-gray-900">
            <tr className="border-b border-gray-800/60 text-[10px] text-gray-500 uppercase tracking-widest">
              <th className="px-3 py-2 text-left">IP Address</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">New Version</th>
              <th className="px-3 py-2 text-left">Error</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((ms) => {
              const cfg = statusConfig[ms.status] ?? statusConfig.pending;
              return (
                <tr key={ms.ip} className="border-b border-gray-800/20">
                  <td className="px-3 py-2 text-amber-500/90 whitespace-nowrap">{ms.ip}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 ${cfg.color}`}>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${cfg.animate ? 'animate-pulse' : ''}`}
                      />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-green-400/80 truncate max-w-[150px]">
                    {ms.newVersion ?? ''}
                  </td>
                  <td className="px-3 py-2 text-red-400/80 truncate max-w-[200px]">
                    {ms.error ?? ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Close button — only after complete */}
      {isComplete && (
        <button
          onClick={onClose}
          className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 font-mono text-sm font-bold py-2.5 rounded transition-colors uppercase tracking-wider"
        >
          Close
        </button>
      )}
    </div>
  );
}
