import { useState } from 'react';
import type { FirmwareValidationResult } from '@minerupdate/shared';
import { validateFirmware, startFirmwareUpdate } from '../lib/api';
import { useFirmwareUpdate } from '../hooks/useFirmwareUpdate';
import FirmwareUpdateProgress from './FirmwareUpdateProgress';

type Step = 'select' | 'validating' | 'validation' | 'confirm' | 'progress';

interface Props {
  selectedMiners: string[];
  onClose: () => void;
}

export default function FirmwareUpdateDialog({ selectedMiners, onClose }: Props) {
  const { progress, minerStatuses, isComplete, resetFirmwareUpdate } = useFirmwareUpdate();

  const [step, setStep] = useState<Step>('select');
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<FirmwareValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleValidate() {
    if (!file) return;
    setError(null);
    setStep('validating');

    try {
      const result = await validateFirmware(file, selectedMiners);
      setValidation(result);
      setStep('validation');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
      setStep('select');
    }
  }

  async function handleStartUpdate() {
    if (!file) return;
    setError(null);
    resetFirmwareUpdate();

    const ipsToUpdate = validation?.compatibleMiners ?? selectedMiners;

    try {
      await startFirmwareUpdate(file, ipsToUpdate);
      setStep('progress');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start update');
      setStep('confirm');
    }
  }

  function handleClose() {
    resetFirmwareUpdate();
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setValidation(null);
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={step !== 'progress' ? handleClose : undefined}
      />

      {/* Dialog */}
      <div className="relative bg-gray-900 border border-gray-800/80 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60">
          <h2 className="text-sm font-mono font-semibold text-amber-500 uppercase tracking-widest">
            Firmware Update
          </h2>
          {step !== 'progress' && (
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-300 text-lg leading-none"
            >
              &times;
            </button>
          )}
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Error display */}
          {error && (
            <div className="bg-red-900/30 border border-red-800/50 rounded px-3 py-2 text-xs font-mono text-red-400">
              {error}
            </div>
          )}

          {/* Step 1: File Select */}
          {step === 'select' && (
            <div className="space-y-4">
              <p className="text-xs font-mono text-gray-400">
                Select a firmware file (.bmu) to push to {selectedMiners.length} miner{selectedMiners.length !== 1 ? 's' : ''}.
              </p>
              <div>
                <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1.5">
                  Firmware File
                </label>
                <input
                  type="file"
                  accept=".bmu"
                  onChange={handleFileChange}
                  className="w-full text-xs font-mono text-gray-300 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-mono file:font-bold file:bg-gray-800 file:text-gray-300 file:cursor-pointer hover:file:bg-gray-700 file:transition-colors"
                />
              </div>
              {file && (
                <div className="text-xs font-mono text-gray-500">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
                </div>
              )}
              <button
                onClick={handleValidate}
                disabled={!file}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-gray-800 disabled:text-gray-500 text-gray-950 font-mono text-sm font-bold py-2.5 rounded transition-colors uppercase tracking-wider"
              >
                Validate
              </button>
            </div>
          )}

          {/* Validating spinner */}
          {step === 'validating' && (
            <div className="flex items-center justify-center py-8">
              <div className="text-xs font-mono text-gray-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Validating firmware compatibility...
              </div>
            </div>
          )}

          {/* Step 2: Validation Results */}
          {step === 'validation' && validation && (
            <div className="space-y-4">
              {validation.detectedModel && (
                <div className="text-xs font-mono">
                  <span className="text-gray-500">Detected model: </span>
                  <span className="text-amber-500">{validation.detectedModel}</span>
                </div>
              )}
              {!validation.detectedModel && (
                <div className="bg-amber-900/20 border border-amber-800/40 rounded px-3 py-2 text-xs font-mono text-amber-400">
                  Could not detect model from filename. All miners will be treated as compatible.
                </div>
              )}

              {validation.compatibleMiners.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono text-green-500 uppercase tracking-widest mb-1">
                    Compatible ({validation.compatibleMiners.length})
                  </div>
                  <div className="bg-gray-950/60 rounded px-3 py-2 max-h-24 overflow-y-auto">
                    <div className="text-xs font-mono text-gray-300 space-y-0.5">
                      {validation.compatibleMiners.map((ip) => (
                        <div key={ip}>{ip}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {validation.incompatibleMiners.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono text-red-500 uppercase tracking-widest mb-1">
                    Incompatible ({validation.incompatibleMiners.length})
                  </div>
                  <div className="bg-gray-950/60 rounded px-3 py-2 max-h-24 overflow-y-auto">
                    <div className="text-xs font-mono text-gray-500 space-y-0.5">
                      {validation.incompatibleMiners.map((ip) => (
                        <div key={ip}>{ip}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {validation.compatibleMiners.length === 0 ? (
                <div className="space-y-3">
                  <div className="bg-red-900/30 border border-red-800/50 rounded px-3 py-2 text-xs font-mono text-red-400">
                    No compatible miners found for this firmware file.
                  </div>
                  <button
                    onClick={() => { setStep('select'); setValidation(null); }}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-gray-200 font-mono text-sm font-bold py-2.5 rounded transition-colors uppercase tracking-wider"
                  >
                    Back
                  </button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => { setStep('select'); setValidation(null); }}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-200 font-mono text-sm font-bold py-2.5 rounded transition-colors uppercase tracking-wider"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep('confirm')}
                    className="flex-1 bg-amber-600 hover:bg-amber-500 text-gray-950 font-mono text-sm font-bold py-2.5 rounded transition-colors uppercase tracking-wider"
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="bg-amber-900/20 border border-amber-800/40 rounded px-3 py-3 space-y-2">
                <div className="text-xs font-mono text-amber-400 font-bold uppercase">Warning</div>
                <p className="text-xs font-mono text-amber-400/80">
                  You are about to push firmware to {validation?.compatibleMiners.length ?? selectedMiners.length} miner{(validation?.compatibleMiners.length ?? selectedMiners.length) !== 1 ? 's' : ''}.
                  Miners will reboot during the update process. This action cannot be undone.
                </p>
              </div>

              <div className="text-xs font-mono text-gray-400 space-y-1">
                <div><span className="text-gray-500">File:</span> {file?.name}</div>
                <div><span className="text-gray-500">Targets:</span> {validation?.compatibleMiners.length ?? selectedMiners.length} miners</div>
                {validation?.detectedModel && (
                  <div><span className="text-gray-500">Model:</span> {validation.detectedModel}</div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('validation')}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-200 font-mono text-sm font-bold py-2.5 rounded transition-colors uppercase tracking-wider"
                >
                  Back
                </button>
                <button
                  onClick={handleStartUpdate}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-mono text-sm font-bold py-2.5 rounded transition-colors uppercase tracking-wider"
                >
                  Start Update
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Progress */}
          {step === 'progress' && (
            <FirmwareUpdateProgress
              progress={progress}
              minerStatuses={minerStatuses}
              isComplete={isComplete}
              onClose={handleClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
