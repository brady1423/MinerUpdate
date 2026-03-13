import { useState } from 'react';
import IpAutocomplete from './IpAutocomplete';

interface AddRangeFormProps {
  onSave: (data: { name: string; range: string }) => void;
  isSaving: boolean;
}

export default function AddRangeForm({ onSave, isSaving }: AddRangeFormProps) {
  const [name, setName] = useState('');
  const [range, setRange] = useState('');

  function handleSubmit() {
    if (!name || !range) return;
    onSave({ name, range });
    setName('');
    setRange('');
  }

  return (
    <div className="px-4 py-3 border-b border-gray-800/60 space-y-2">
      <input
        type="text"
        placeholder="Label (e.g. Building A)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-amber-700"
      />
      <IpAutocomplete
        value={range}
        onChange={setRange}
        placeholder="Range (e.g. 192.168.1.1-192.168.1.255)"
        className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-amber-700"
      />
      <button
        onClick={handleSubmit}
        disabled={!name || !range || isSaving}
        className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-gray-950 font-mono text-xs font-bold py-1.5 rounded transition-colors uppercase tracking-wider"
      >
        Save Range
      </button>
    </div>
  );
}
