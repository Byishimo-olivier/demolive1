import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search, UserPlus } from 'lucide-react';
import type { Person } from '@/lib/stock-location-api';
import { humanizeLabel, cn } from '@/lib/utils';

/** Someone on the team, or a person invited by email who has not joined yet */
export interface ResponsibleValue {
  userId?: string;
  name: string;
}

interface Props {
  people: Person[];
  value: ResponsibleValue | null;
  onChange: (value: ResponsibleValue) => void;
  // Offered when the search finds nobody: invite them to the project
  onInvite?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

/** Choose a person from the project team or the company; when nobody matches, offer an invitation */
export function PersonPicker({ people, value, onChange, onInvite, placeholder = 'Choose a person', className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 0);
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const q = query.trim().toLowerCase();
  const found = people.filter((p) => !q || p.name.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q));
  const groups = (['Project', 'Company'] as const)
    .map((group) => ({ group, items: found.filter((p) => p.group === group) }))
    .filter((g) => g.items.length > 0);

  const choose = (person: Person) => {
    onChange({ userId: person.userId, name: person.name });
    setOpen(false);
  };

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-white px-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <span className={cn('truncate', !value && 'text-muted-foreground')}>
          {value ? `${value.name}${value.userId ? '' : ' (invited)'}` : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg"
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        >
          <div className="flex items-center gap-2 border-b border-gray-100 px-3">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {groups.map(({ group, items }) => (
              <div key={group}>
                <p className="px-3 pb-1 pt-2 text-xs font-medium text-gray-500">{group === 'Project' ? 'Project team' : 'Company'}</p>
                {items.map((person) => (
                  <button
                    key={person.userId}
                    type="button"
                    onClick={() => choose(person)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm text-gray-800 hover:bg-gray-100"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{person.name}</span>
                      <span className="block truncate text-xs text-gray-500">
                        {[person.role && humanizeLabel(person.role), person.email].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {value?.userId === person.userId && <Check className="h-4 w-4 flex-shrink-0 text-gray-900" />}
                  </button>
                ))}
              </div>
            ))}
            {groups.length === 0 && !onInvite && <p className="px-3 py-3 text-sm text-gray-500">Nobody found</p>}
            {onInvite && q && found.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onInvite(query.trim());
                }}
                className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-100"
              >
                <UserPlus className="h-4 w-4" />
                Invite “{query.trim()}” to the project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
