import { format } from 'date-fns';
import { History } from 'lucide-react';

export interface HistoryEntry {
  action: string;
  byName?: string;
  at: string;
  comment?: string;
}

/** Who did what, and when, on a request or purchase order */
export function DecisionHistory({ entries }: { entries?: HistoryEntry[] }) {
  if (!entries || entries.length === 0) return null;
  return (
    <div>
      <h4 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
        <History className="h-4 w-4 text-gray-500" />
        History
      </h4>
      <ol className="relative space-y-4 border-l border-gray-200 pl-5">
        {[...entries].reverse().map((entry, index) => (
          <li key={`${entry.at}-${index}`} className="relative">
            <span className="absolute -left-[1.55rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-gray-400 ring-1 ring-gray-200" />
            <p className="text-sm font-medium text-gray-900">{entry.action}</p>
            <p className="text-xs text-gray-500">
              {entry.byName ? `${entry.byName} · ` : ''}
              {format(new Date(entry.at), 'MMM d, yyyy · HH:mm')}
            </p>
            {entry.comment && <p className="mt-1 text-sm text-gray-600">“{entry.comment}”</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
