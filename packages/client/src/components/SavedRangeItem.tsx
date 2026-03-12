import { useState, useRef, useEffect } from 'react';
import type { SavedRange } from '@minerupdate/shared';

interface SavedRangeItemProps {
  range: SavedRange;
  checked: boolean;
  onToggle: () => void;
  onUpdate: (data: { name?: string; range?: string }) => void;
  onDelete: () => void;
}

export default function SavedRangeItem({ range, checked, onToggle, onUpdate, onDelete }: SavedRangeItemProps) {
  const [editField, setEditField] = useState<'name' | 'range' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editField && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editField]);

  // Close delete popover on click outside or Escape
  useEffect(() => {
    if (!showDeleteConfirm) return;
    function handleClickOutside(e: MouseEvent) {
      if (deleteRef.current && !deleteRef.current.contains(e.target as Node)) {
        setShowDeleteConfirm(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowDeleteConfirm(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showDeleteConfirm]);

  function startEdit(field: 'name' | 'range') {
    setEditField(field);
    setEditValue(range[field]);
  }

  function saveEdit() {
    if (!editField) return;
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== range[editField]) {
      onUpdate({ [editField]: trimmed });
    }
    setEditField(null);
  }

  function cancelEdit() {
    setEditField(null);
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800/30 hover:bg-gray-800/30 transition-colors group">
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="shrink-0 w-3.5 h-3.5 rounded border-gray-600 bg-gray-950 text-amber-500 focus:ring-amber-500/30 focus:ring-offset-0 cursor-pointer accent-amber-500"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editField === 'name' ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleEditKeyDown}
            className="w-full bg-gray-950 border border-amber-700 rounded px-2 py-0.5 text-sm font-mono text-gray-200 focus:outline-none"
          />
        ) : (
          <div
            onClick={() => startEdit('name')}
            className="text-sm font-mono text-gray-300 group-hover:text-amber-400 transition-colors cursor-text truncate"
            title="Click to edit"
          >
            {range.name}
          </div>
        )}

        {editField === 'range' ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleEditKeyDown}
            className="w-full bg-gray-950 border border-amber-700 rounded px-2 py-0.5 text-[11px] font-mono text-gray-200 focus:outline-none mt-0.5"
          />
        ) : (
          <div
            onClick={() => startEdit('range')}
            className="text-[11px] font-mono text-gray-600 cursor-text truncate"
            title="Click to edit"
          >
            {range.range}
          </div>
        )}
      </div>

      {/* Delete button with confirmation */}
      <div ref={deleteRef} className="relative shrink-0">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500 transition-all text-xs"
          title="Delete"
        >
          &#10005;
        </button>

        {showDeleteConfirm && (
          <div className="absolute right-0 top-full mt-1 z-30 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 w-48">
            <p className="text-xs font-mono text-gray-300 mb-2">Delete this range?</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onDelete();
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold py-1 rounded transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-mono py-1 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
