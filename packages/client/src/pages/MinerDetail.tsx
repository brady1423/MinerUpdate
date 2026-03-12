import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMiner } from '../lib/api';

export default function MinerDetail() {
  const { ip } = useParams<{ ip: string }>();
  const navigate = useNavigate();

  const { data: miner, isLoading, error } = useQuery({
    queryKey: ['miner', ip],
    queryFn: () => getMiner(ip!),
    enabled: !!ip,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-sm font-mono text-gray-500 animate-pulse">Loading miner data...</div>
      </div>
    );
  }

  if (error || !miner) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-gray-700 text-4xl font-mono">404</div>
          <p className="text-sm font-mono text-gray-500">
            Miner not found. Run a scan first to discover miners.
          </p>
          <button
            onClick={() => navigate('/')}
            className="text-xs font-mono text-amber-600 hover:text-amber-400 transition-colors uppercase tracking-wider"
          >
            Back to Scanner
          </button>
        </div>
      </div>
    );
  }

  const fields: { label: string; value: string; accent?: boolean; mono?: boolean }[] = [
    { label: 'IP Address', value: miner.ip, accent: true, mono: true },
    { label: 'Model', value: miner.model },
    { label: 'Hostname', value: miner.hostname || '—', mono: true },
    { label: 'Firmware Version', value: miner.firmwareVersion },
    { label: 'Pool URL', value: miner.poolUrl || '—', mono: true },
    { label: 'Worker Name', value: miner.workerName || '—', mono: true },
    {
      label: 'Hashrate',
      value:
        miner.hashrate > 0
          ? miner.hashrate >= 1000
            ? `${(miner.hashrate / 1000).toFixed(1)} TH/s`
            : `${miner.hashrate.toFixed(1)} GH/s`
          : 'N/A',
    },
    { label: 'Subnet', value: miner.subnet, mono: true },
    { label: 'Last Seen', value: new Date(miner.lastSeen).toLocaleString() },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Grid pattern background */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(251,191,36,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.3) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-amber-900/30 bg-gray-950/80 backdrop-blur-sm">
          <div className="max-w-[1000px] mx-auto px-6 py-4 flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-xs font-mono text-gray-500 hover:text-amber-500 transition-colors uppercase tracking-wider"
            >
              &larr; Back
            </button>
            <div className="w-px h-4 bg-gray-800" />
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              <h1 className="text-lg font-mono font-bold tracking-wider text-amber-500 uppercase">
                MinerUpdate
              </h1>
            </div>
          </div>
        </header>

        <div className="max-w-[1000px] mx-auto px-6 py-8 space-y-6">
          {/* Miner Identity */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-mono font-bold text-gray-100 tabular-nums">
                {miner.ip}
              </h2>
              <p className="text-sm font-mono text-gray-500 mt-1">
                {miner.model} &middot;{' '}
                <span
                  className={`inline-flex items-center gap-1.5 ${
                    miner.status === 'online'
                      ? 'text-green-500'
                      : miner.status === 'error'
                        ? 'text-red-500'
                        : 'text-gray-600'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      miner.status === 'online'
                        ? 'bg-green-500'
                        : miner.status === 'error'
                          ? 'bg-red-500'
                          : 'bg-gray-600'
                    }`}
                  />
                  {miner.status}
                </span>
              </p>
            </div>
            <a
              href={`http://${miner.ip}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-mono text-gray-300 hover:text-amber-400 transition-colors uppercase tracking-wider"
            >
              Open Web UI &rarr;
            </a>
          </div>

          {/* Info Grid */}
          <div className="border border-gray-800/80 rounded-lg bg-gray-900/40 overflow-hidden">
            {fields.map((field, i) => (
              <div
                key={field.label}
                className={`flex items-center justify-between px-5 py-3.5 ${
                  i < fields.length - 1 ? 'border-b border-gray-800/40' : ''
                } hover:bg-gray-800/20 transition-colors`}
              >
                <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                  {field.label}
                </span>
                <span
                  className={`text-sm ${field.mono ? 'font-mono' : ''} ${
                    field.accent ? 'text-amber-500' : 'text-gray-200'
                  }`}
                >
                  {field.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
