import { formatDistanceToNow } from 'date-fns';
import { Clock, DollarSign, FileText, FolderKanban, Layers, Package, Users, X, type LucideIcon } from 'lucide-react';
import type { AppNotification } from '@/lib/notifications-api';
import { cn } from '@/lib/utils';

// Icon for each project area
const AREA_ICONS: Record<string, LucideIcon> = {
  finance: DollarSign,
  procurement: Package,
  inventory: Layers,
  timeline: Clock,
  documents: FileText,
  team: Users,
  project: FolderKanban,
};

export const timeAgo = (iso: string) => {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
};

interface NotificationItemProps {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
  onRemove?: (id: string) => void;
  compact?: boolean;
}

/** One notification: what happened, who did it, on which project, and when; click to open it */
export function NotificationItem({ notification: n, onOpen, onRemove, compact }: NotificationItemProps) {
  const Icon = AREA_ICONS[n.area] ?? FolderKanban;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(n)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(n);
        }
      }}
      className={cn(
        'group relative flex cursor-pointer items-start gap-3 rounded-xl px-3 transition-colors hover:bg-orange-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400',
        compact ? 'py-2.5' : 'py-3',
        !n.read && 'bg-orange-50/40'
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          n.read ? 'bg-black/[0.04] text-gray-500' : 'bg-stone-950 text-orange-400'
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className={cn('flex-1 text-sm leading-snug', n.read ? 'text-gray-700' : 'font-semibold text-gray-900')}>
            {n.title}
          </p>
          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" aria-label="Unread" />}
        </div>
        <p className="mt-0.5 truncate text-xs text-gray-600">{n.message}</p>
        <p className="mt-0.5 truncate text-xs text-gray-400">
          {n.projectName ? `${n.projectName} · ` : ''}
          {timeAgo(n.createdAt)}
        </p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(n._id);
          }}
          className="absolute right-2 top-2 hidden rounded-md p-1 text-gray-400 hover:bg-black/[0.05] hover:text-gray-700 group-hover:block"
          aria-label="Remove notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
