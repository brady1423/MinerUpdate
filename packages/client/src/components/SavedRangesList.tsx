import { useState } from 'react';
import type { SavedRange } from '@minerupdate/shared';
import SavedRangeItem from './SavedRangeItem';
import AddRangeForm from './AddRangeForm';

interface SavedRangesListProps {
  ranges: SavedRange[];
  checkedIds: Set<number>;
  onToggleRange: (id: number) => void;
  onToggleAll: () => void;
  onAddRange: (data: { name: string; range: string }) => void;
  onUpdateRange: (id: number, data: { name?: string; range?: string }) => void;
  onDeleteRange: (id: number) => void;
  isAdding: boolean;
  allChecked: boolean;
}

export default function SavedRangesList({
  ranges,
  checkedIds,
  onToggleRange,
  onToggleAll,
  onAddRange,
  onUpdateRange,
  onDeleteRange,
  isAdding,
  allChecked,
}: SavedRangesListProps) {
  const [showAddRange, setShowAddRange] = useState(false);

  return (
    <section className="border border-gray-800/80 rounded-lg bg-gray-900/40">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60">
        <h2 className="text-xs font-mono font-semibold text-gray-400 uppercase tracking-widest">
          Saved Ranges
        </h2>
        <div className="flex gap-2">
          {ranges.length > 0 && (
            <button
              onClick={onToggleAll}
              className="text-[10px] font-mono text-amber-600 hover:text-amber-400 transition-colors uppercase tracking-wider"
            >
              {allChecked ? 'Deselect All' : 'Select All'}
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
        <AddRangeForm
          onSave={(data) => {
            onAddRange(data);
            setShowAddRange(false);
          }}
          isSaving={isAdding}
        />
      )}

      <div className="max-h-[280px] overflow-y-auto">
        {ranges.length === 0 ? (
          <p className="px-4 py-6 text-xs font-mono text-gray-600 text-center">
            No saved ranges yet
          </p>
        ) : (
          ranges.map((range) => (
            <SavedRangeItem
              key={range.id}
              range={range}
              checked={checkedIds.has(range.id)}
              onToggle={() => onToggleRange(range.id)}
              onUpdate={(data) => onUpdateRange(range.id, data)}
              onDelete={() => onDeleteRange(range.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}
