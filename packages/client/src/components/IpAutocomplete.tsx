import { useState, useRef, useEffect, useCallback } from 'react';

interface IpAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function getSuggestions(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // Match partial or full IP: 1-4 octets
  const parts = trimmed.split('.');
  if (parts.length < 3 || parts.length > 4) return [];

  // Validate each existing part is a valid octet
  for (const p of parts) {
    if (p === '') continue; // trailing dot
    const n = Number(p);
    if (isNaN(n) || n < 0 || n > 255 || p !== String(n)) return [];
  }

  const suggestions: string[] = [];

  if (parts.length === 3) {
    // e.g. "192.168.1" — suggest full /24
    const prefix = parts.slice(0, 3).join('.');
    suggestions.push(`${prefix}.0-${prefix}.255`);
    suggestions.push(`${prefix}.0/24`);
  } else if (parts.length === 4 && parts[3] !== '') {
    const prefix = parts.slice(0, 3).join('.');
    const lastOctet = Number(parts[3]);
    // Full /24 range
    suggestions.push(`${prefix}.0-${prefix}.255`);
    suggestions.push(`${prefix}.0/24`);
    // From this IP to end of subnet
    if (lastOctet > 0 && lastOctet < 255) {
      suggestions.push(`${prefix}.${lastOctet}-${prefix}.255`);
    }
  }

  return suggestions;
}

export default function IpAutocomplete({ value, onChange, placeholder, className }: IpAutocompleteProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = getSuggestions(value);

  const handleSelect = useCallback((suggestion: string) => {
    onChange(suggestion);
    setShowDropdown(false);
    setActiveIndex(-1);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
          setActiveIndex(-1);
        }}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              className={`w-full text-left px-3 py-1.5 text-sm font-mono transition-colors ${
                i === activeIndex
                  ? 'bg-amber-600/20 text-amber-400'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
