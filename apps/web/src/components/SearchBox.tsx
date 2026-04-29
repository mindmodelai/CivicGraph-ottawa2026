'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { PersonSummary } from '@/lib/types';
import { formatCAD } from '@/lib/format';
import { search } from '@/lib/api';

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PersonSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const data = await search(q);
      setResults(data.results);
      setOpen(data.results.length > 0);
      setActiveIndex(-1);
    } catch {
      setResults([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(value), 300);
  };

  const select = (id: string) => {
    setOpen(false);
    setQuery('');
    router.push(`/person/${id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) select(results[activeIndex].id);
        break;
      case 'Escape':
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="relative w-full max-w-md">
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        placeholder="Search a director's name…"
        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
        aria-label="Search directors"
        aria-expanded={open}
        aria-controls="search-results"
        aria-activedescendant={activeIndex >= 0 ? `sr-${activeIndex}` : undefined}
        role="combobox"
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      )}
      {open && (
        <ul
          id="search-results"
          role="listbox"
          className="absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-80 overflow-y-auto"
        >
          {results.map((p, i) => (
            <li
              key={p.id}
              id={`sr-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={() => select(p.id)}
              className={`px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                i === activeIndex ? 'bg-indigo-50 text-indigo-900' : 'hover:bg-gray-50'
              }`}
            >
              <span className="font-medium">{p.name}</span>
              {p.province && <span className="ml-2 text-xs text-gray-400">{p.province}</span>}
              <span className="float-right text-xs text-gray-400 tabular-nums">
                {p.boards} boards · {formatCAD(p.totalFunding)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
