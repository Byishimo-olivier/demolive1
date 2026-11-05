import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/useNotifications';
import type { AppNotification } from '@/lib/notifications-api';
import { NotificationItem } from './NotificationItem';

/** The bell in the top bar: unread count, and the latest notifications one click away */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, isLoading, open: openNotification, markAllRead, remove } = useNotifications();

  const handleOpen = (n: AppNotification) => {
    setOpen(false);
    openNotification(n);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-xl text-gray-600 hover:bg-black/[0.05] hover:text-gray-900"
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white shadow-glow-orange">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(24rem,calc(100vw-1.5rem))] p-0">
        <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            <p className="text-xs text-gray-500">{unreadCount ? `${unreadCount} unread` : "You're all caught up"}</p>
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="h-8 text-xs text-gray-600">
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto p-1.5">
          {isLoading ? (
            <p className="py-8 text-center text-sm text-gray-500">Loading…</p>
          ) : notifications.length === 0 ? (
            <div className="py-10 text-center">
              <Bell className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">No notifications yet</p>
              <p className="text-xs text-gray-400">Work done on your projects will show up here</p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationItem key={n._id} notification={n} onOpen={handleOpen} onRemove={remove} compact />
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
