import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'finance', label: 'Finance' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'timeline', label: 'Timeline' },
] as const;

/** The dashboard's notifications: what happened across your projects, each one click from where it happened */
export function NotificationsPanel() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all');
  const [showAll, setShowAll] = useState(false);
  const { notifications, unreadCount, isLoading, open, markAllRead, remove } = useNotifications(50);

  const filtered = notifications.filter((n) =>
    filter === 'all' ? true : filter === 'unread' ? !n.read : n.area === filter
  );
  const shown = showAll ? filtered : filtered.slice(0, 8);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-gray-500" />
            Notifications
            {unreadCount > 0 && (
              <span className="rounded-full bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white">{unreadCount} new</span>
            )}
          </CardTitle>
          <p className="mt-1 text-sm text-gray-500">What happened on your projects. Click one to go straight to it.</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="h-8 shrink-0">
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={
                filter === f.value
                  ? 'rounded-full bg-stone-950 px-3 py-1 text-xs font-medium text-white'
                  : 'rounded-full bg-black/[0.04] px-3 py-1 text-xs font-medium text-gray-600 hover:bg-black/[0.07]'
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
        ) : shown.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              {notifications.length === 0 ? 'No notifications yet' : 'Nothing here for this filter'}
            </p>
          </div>
        ) : (
          <div className="grid gap-1 lg:grid-cols-2">
            {shown.map((n) => (
              <NotificationItem key={n._id} notification={n} onOpen={open} onRemove={remove} />
            ))}
          </div>
        )}

        {filtered.length > 8 && (
          <div className="mt-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)} className="text-gray-600">
              {showAll ? 'Show less' : `Show all ${filtered.length}`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
