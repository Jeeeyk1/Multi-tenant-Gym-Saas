'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '../cn';
import { Icon } from './Icon';

export interface CommandItem {
  id: string;
  label: string;
  /** Section heading, e.g. "Pages" or "Actions". */
  group: string;
  /** An icon from `ionicons/icons`. */
  icon?: string;
  /** Extra words to match, e.g. "people" for Members. */
  keywords?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
  placeholder?: string;
}

/**
 * ⌘K search: type to filter, arrows to move, Enter to run, Esc to close. Built on the native
 * <dialog>, so focus stays inside and returns to where it was.
 */
export function CommandPalette({ open, onClose, items, placeholder = 'Search pages and actions' }: CommandPaletteProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      setQuery('');
      setActive(0);
      el.showModal();
      inputRef.current?.focus();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => `${i.label} ${i.keywords ?? ''} ${i.group}`.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => setActive(0), [query]);

  function run(item: CommandItem | undefined) {
    if (!item) return;
    onClose();
    item.onSelect();
  }

  // Keep group order as given, items in their original order within a group.
  const groups = results.reduce<Record<string, CommandItem[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});
  let index = -1;

  return (
    <dialog
      ref={ref}
      aria-label="Search"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={cn(
        'mt-[12vh] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-xl border border-border bg-surface p-0 text-foreground shadow-1',
        'backdrop:bg-scrim/50 backdrop:backdrop-blur-[2px]',
        open && 'animate-pop-in backdrop:animate-fade-in',
      )}
    >
      <div className="flex items-center gap-3 border-b border-border px-4">
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-icon-muted" aria-hidden>
          <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === 'Enter') {
              e.preventDefault();
              run(results[active]);
            }
          }}
          placeholder={placeholder}
          aria-label={placeholder}
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
          className="h-12 flex-1 bg-transparent text-body outline-none placeholder:text-muted"
        />
        <kbd className="rounded-sm border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted">Esc</kbd>
      </div>
      <ul id={listId} role="listbox" className="max-h-80 overflow-y-auto p-2">
        {results.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-muted">No results for &ldquo;{query}&rdquo;</li>
        ) : (
          Object.entries(groups).map(([group, groupItems]) => (
            <li key={group} role="presentation">
              <p className="px-3 pb-1 pt-2 text-eyebrow uppercase text-muted">{group}</p>
              <ul role="presentation">
                {groupItems.map((item) => {
                  index += 1;
                  const i = index;
                  const selected = i === active;
                  return (
                    <li
                      key={item.id}
                      id={`${listId}-${item.id}`}
                      role="option"
                      aria-selected={selected}
                      onMouseMove={() => setActive(i)}
                      onClick={() => run(item)}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm',
                        selected ? 'bg-nav-active text-nav-active-foreground' : 'text-foreground',
                      )}
                    >
                      {item.icon ? <Icon icon={item.icon} size={16} className={selected ? '' : 'text-icon-muted'} /> : null}
                      {item.label}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))
        )}
      </ul>
    </dialog>
  );
}
