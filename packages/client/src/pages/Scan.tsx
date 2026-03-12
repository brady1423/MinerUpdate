import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { Miner, SavedRange } from '@minerupdate/shared';
import { getRanges, createRange, deleteRange, startScan } from '../lib/api';
import { useScanSocket } from '../hooks/useScanSocket';

type SortKey = keyof Pick<Miner, 'ip' | 'model' | 'firmwareVersion' | 'poolUrl' | 'workerName' | 'hashrate' | 'status'>;
type SortDir = 'asc' | 'desc';

export default function Scan() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { progress, miners, isComplete, resetScan } = useScanSocket();

  const [rangeInput, setRangeInput] = useState('');
  const [newRangeName, setNewRangeName] = useState('');
  const [newRangeValue, setNewRangeValue] = useState('');
  const [showAddRange, setShowAddRange] = useState(false);
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('ip');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { data: savedRanges = [] } = useQuery({
    queryKey: ['ranges'],
    queryFn: getRanges,
  });

  const addRangeMutation = useMutation({
    mutationFn: createRange,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranges'] });
      setNewRangeName('');
      setNewRangeValue('');
      setShowAddRange(false);
    },
  });

  const deleteRangeMutation = useMutation({
    mutationFn: deleteRange,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ranges'] }),
  });

  const scanMutation = useMutation({
    mutationFn: startScan,
  });

  function handleStartScan() {
    const ranges = rangeInput
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (ranges.length === 0) return;
    resetScan();
    scanMutation.mutate(ranges);
  }

  function handleRangeClick(range: SavedRange) {
    setRangeInput((prev) => {
      const lines = prev.split('\n').filter((l) => l.trim());
      if (lines.includes(range.range)) return prev;
      return [...lines, range.range].join('\n');
    });
  }

  function handleSelectAll() {
    const allRanges = savedRanges.map((r: SavedRange) => r.range);
    setRangeInput(allRanges.join('\n'));
  }

  const isScanning = progress?.status === 'running';
  const progressPct = progress ? Math.round((progress.scanned / progress.total) * 100) : 0;

  const filteredMiners = useMemo(() => {
    let list = [...miners];
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(
        (m) =>
          m.ip.includes(q) ||
          m.model.toLowerCase().includes(q) ||
          m.firmwareVersion.toLowerCase().includes(q) ||
          m.workerName.toLowerCase().includes(q) ||
          m.poolUrl.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return list;
  }, [miners, filter, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  };

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
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              <h1 className="text-base sm:text-lg font-mono font-bold tracking-wider text-amber-500 uppercase">
                MinerUpdate
              </h1>
              <span className="text-[10px] font-mono text-gray-600 border border-gray-800 px-1.5 py-0.5 rounded hidden sm:inline">
                v1.0
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
              {miners.length > 0 && (
                <span className="text-amber-500/80">{miners.length} miners discovered</span>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-[1600px] mx-auto px-3 sm:px-6 py-4 sm:py-6">
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 sm:gap-6">
            {/* Left sidebar — Ranges + Scan Controls */}
            <div className="space-y-4">
              {/* Saved Ranges */}
              <section className="border border-gray-800/80 rounded-lg bg-gray-900/40">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60">
                  <h2 className="text-xs font-mono font-semibold text-gray-400 uppercase tracking-widest">
                    Saved Ranges
                  </h2>
                  <div className="flex gap-2">
                    {savedRanges.length > 0 && (
                      <button
                        onClick={handleSelectAll}
                        className="text-[10px] font-mono text-amber-600 hover:text-amber-400 transition-colors uppercase tracking-wider"
                      >
                        Select All
                      </button>
                    )}
                    <button
                      onClick={() => setShowAddRange(!showAddRange)}
                      className="text-[10px] font-mono text-amber-600 hover:text-amber-400 transition-colors uppercase tracking-wider"
                    >
                      {showAddRange ? 'Cancel' : '+ Add'}
                    </button>
                  </div>
                </div>

                {showAddRange && (
                  <div className="px-4 py-3 border-b border-gray-800/60 space-y-2">
                    <input
                      type="text"
                      placeholder="Label (e.g. Building A)"
                      value={newRangeName}
                      onChange={(e) => setNewRangeName(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-amber-700"
                    />
                    <input
                      type="text"
                      placeholder="Range (e.g. 10.69.2.1-10.69.2.255)"
                      value={newRangeValue}
                      onChange={(e) => setNewRangeValue(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-amber-700"
                    />
                    <button
                      onClick={() =>
                        newRangeName &&
                        newRangeValue &&
                        addRangeMutation.mutate({ name: newRangeName, range: newRangeValue })
                      }
                      disabled={!newRangeName || !newRangeValue}
                      className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-mono text-xs font-bold py-1.5 rounded transition-colors uppercase tracking-wider"
                    >
                      Save Range
                    </button>
                  </div>
                )}

                <div className="max-h-[280px] overflow-y-auto">
                  {savedRanges.length === 0 ? (
                    <p className="px-4 py-6 text-xs font-mono text-gray-600 text-center">
                      No saved ranges yet
                    </p>
                  ) : (
                    savedRanges.map((range: SavedRange) => (
                      <div
                        key={range.id}
                        className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/30 hover:bg-gray-800/30 transition-colors group cursor-pointer"
                        onClick={() => handleRangeClick(range)}
                      >
                        <div>
                          <div className="text-sm font-mono text-gray-300 group-hover:text-amber-400 transition-colors">
                            {range.name}
                          </div>
                          <div className="text-[11px] font-mono text-gray-600">{range.range}</div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRangeMutation.mutate(range.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500 transition-all text-xs"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Scan Input */}
              <section className="border border-gray-800/80 rounded-lg bg-gray-900/40">
                <div className="px-4 py-3 border-b border-gray-800/60">
                  <h2 className="text-xs font-mono font-semibold text-gray-400 uppercase tracking-widest">
                    Scan Targets
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  <textarea
                    value={rangeInput}
                    onChange={(e) => setRangeInput(e.target.value)}
                    placeholder={"10.69.2.1-10.69.2.255\n10.69.3.0/24\n..."}
                    rows={6}
                    className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-amber-700 resize-none"
                  />
                  <button
                    onClick={handleStartScan}
                    disabled={isScanning || !rangeInput.trim()}
                    className="w-full relative overflow-hidden bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 disabled:text-gray-500 text-gray-950 font-mono text-sm font-bold py-2.5 rounded transition-colors uppercase tracking-wider"
                  >
                    {isScanning ? 'Scanning...' : 'Start Scan'}
                  </button>
                </div>
              </section>

              {/* Progress */}
              {progress && (
                <section className="border border-gray-800/80 rounded-lg bg-gray-900/40">
                  <div className="px-4 py-3 border-b border-gray-800/60">
                    <h2 className="text-xs font-mono font-semibold text-gray-400 uppercase tracking-widest">
                      Scan Progress
                    </h2>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Progress bar */}
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300 ease-out"
                        style={{
                          width: `${progressPct}%`,
                          background:
                            isComplete
                              ? 'linear-gradient(90deg, #16a34a, #22c55e)'
                              : 'linear-gradient(90deg, #d97706, #f59e0b)',
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-gray-950/60 rounded px-3 py-2">
                        <div className="text-gray-500 text-[10px] uppercase">Scanned</div>
                        <div className="text-gray-200 text-lg tabular-nums">
                          {progress.scanned}
                          <span className="text-gray-600 text-xs">/{progress.total}</span>
                        </div>
                      </div>
                      <div className="bg-gray-950/60 rounded px-3 py-2">
                        <div className="text-gray-500 text-[10px] uppercase">Found</div>
                        <div className="text-amber-500 text-lg tabular-nums">{progress.found}</div>
                      </div>
                    </div>

                    {isScanning && progress.currentIp && (
                      <div className="text-[10px] font-mono text-gray-500 truncate">
                        Probing {progress.currentIp}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          isScanning
                            ? 'bg-amber-500 animate-pulse'
                            : isComplete
                              ? 'bg-green-500'
                              : 'bg-gray-600'
                        }`}
                      />
                      <span className="text-[10px] font-mono text-gray-500 uppercase">
                        {progress.status}
                      </span>
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Main content — Results Table */}
            <section className="border border-gray-800/80 rounded-lg bg-gray-900/40 flex flex-col min-h-[400px] sm:min-h-[600px]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-3 border-b border-gray-800/60">
                <h2 className="text-xs font-mono font-semibold text-gray-400 uppercase tracking-widest">
                  Discovered Miners
                </h2>
                {miners.length > 0 && (
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="bg-gray-950 border border-gray-700 rounded px-3 py-1 text-xs font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-amber-700 w-full sm:w-48"
                  />
                )}
              </div>

              {miners.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="text-gray-700 text-4xl font-mono">{'{ }'}</div>
                    <p className="text-xs font-mono text-gray-600">
                      {isScanning ? 'Waiting for results...' : 'No miners discovered yet'}
                    </p>
                    {!isScanning && !progress && (
                      <p className="text-[10px] font-mono text-gray-700">
                        Add IP ranges and start a scan
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Mobile card view */}
                  <div className="md:hidden flex-1 overflow-y-auto divide-y divide-gray-800/30">
                    {filteredMiners.map((miner) => (
                      <div
                        key={miner.ip}
                        onClick={() => navigate(`/miners/${miner.ip}`)}
                        className="px-4 py-3 hover:bg-amber-500/5 cursor-pointer transition-colors active:bg-amber-500/10"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-mono text-amber-500">{miner.ip}</span>
                          <span
                            className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider ${
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
                        </div>
                        <div className="text-xs font-mono text-gray-300">{miner.model}</div>
                        <div className="text-[11px] font-mono text-gray-500 mt-1 truncate">
                          {miner.firmwareVersion}
                        </div>
                        <div className="flex items-center justify-between mt-1.5 text-[11px] font-mono text-gray-600">
                          <span className="truncate max-w-[60%]">{miner.workerName || '—'}</span>
                          <span className="tabular-nums">
                            {miner.hashrate > 0
                              ? miner.hashrate >= 1000
                                ? `${(miner.hashrate / 1000).toFixed(1)} TH/s`
                                : `${miner.hashrate.toFixed(1)} GH/s`
                              : '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table view */}
                  <div className="hidden md:block overflow-x-auto flex-1">
                    <table className="w-full text-sm font-mono">
                      <thead>
                        <tr className="border-b border-gray-800/60 text-[10px] text-gray-500 uppercase tracking-widest">
                          <th onClick={() => handleSort('ip')} className="px-3 py-2.5 text-left cursor-pointer hover:text-amber-500 transition-colors whitespace-nowrap select-none">IP Address{sortIndicator('ip')}</th>
                          <th onClick={() => handleSort('model')} className="px-3 py-2.5 text-left cursor-pointer hover:text-amber-500 transition-colors whitespace-nowrap select-none">Model{sortIndicator('model')}</th>
                          <th onClick={() => handleSort('firmwareVersion')} className="px-3 py-2.5 text-left cursor-pointer hover:text-amber-500 transition-colors whitespace-nowrap select-none">Firmware{sortIndicator('firmwareVersion')}</th>
                          <th onClick={() => handleSort('poolUrl')} className="px-3 py-2.5 text-left cursor-pointer hover:text-amber-500 transition-colors whitespace-nowrap select-none table-cell">Pool{sortIndicator('poolUrl')}</th>
                          <th onClick={() => handleSort('workerName')} className="px-3 py-2.5 text-left cursor-pointer hover:text-amber-500 transition-colors whitespace-nowrap select-none table-cell">Worker{sortIndicator('workerName')}</th>
                          <th onClick={() => handleSort('hashrate')} className="px-3 py-2.5 text-left cursor-pointer hover:text-amber-500 transition-colors whitespace-nowrap select-none">Hashrate{sortIndicator('hashrate')}</th>
                          <th onClick={() => handleSort('status')} className="px-3 py-2.5 text-left cursor-pointer hover:text-amber-500 transition-colors whitespace-nowrap select-none">Status{sortIndicator('status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMiners.map((miner) => (
                          <tr
                            key={miner.ip}
                            onClick={() => navigate(`/miners/${miner.ip}`)}
                            className="border-b border-gray-800/20 hover:bg-amber-500/5 cursor-pointer transition-colors group"
                          >
                            <td className="px-3 py-2.5 text-amber-500/90 group-hover:text-amber-400 whitespace-nowrap">
                              {miner.ip}
                            </td>
                            <td className="px-3 py-2.5 text-gray-300 whitespace-nowrap">
                              {miner.model}
                            </td>
                            <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">
                              {miner.firmwareVersion}
                            </td>
                            <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap max-w-[200px] truncate table-cell">
                              {miner.poolUrl}
                            </td>
                            <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap max-w-[160px] truncate table-cell">
                              {miner.workerName}
                            </td>
                            <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap tabular-nums">
                              {miner.hashrate > 0
                                ? miner.hashrate >= 1000
                                  ? `${(miner.hashrate / 1000).toFixed(1)} TH/s`
                                  : `${miner.hashrate.toFixed(1)} GH/s`
                                : '—'}
                            </td>
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider ${
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
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {filteredMiners.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-800/40 text-[10px] font-mono text-gray-600">
                  Showing {filteredMiners.length} of {miners.length} miners
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
