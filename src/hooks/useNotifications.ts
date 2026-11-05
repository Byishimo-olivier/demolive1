import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { notificationsApi, type AppNotification, type NotificationList } from '@/lib/notifications-api';

// How often new notifications are fetched while the app is open
const REFRESH_MS = 30_000;

/**
 * The signed-in user's notifications for the active company, refreshed every 30 seconds.
 * Shared by the bell and the dashboard panel (same query, so both stay in step).
 */
export function useNotifications(limit = 30) {
  const { user, activeProfile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const queryKey = ['notifications', activeProfile?.id ?? 'none', limit];

  const query = useQuery({
    queryKey,
    queryFn: () => notificationsApi.list(limit),
    enabled: !!user && !!activeProfile,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
  });

  // Update every cached list at once (bell and panel may use different limits)
  const patchAll = (update: (list: NotificationList) => NotificationList) => {
    queryClient.setQueriesData<NotificationList>({ queryKey: ['notifications'] }, (old) => (old ? update(old) : old));
  };
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const markRead = useMutation({
    mutationFn: notificationsApi.markRead,
    onMutate: (id: string) =>
      patchAll((list) => {
        const wasUnread = list.items.some((n) => n._id === id && !n.read);
        return {
          items: list.items.map((n) => (n._id === id ? { ...n, read: true } : n)),
          unreadCount: Math.max(0, list.unreadCount - (wasUnread ? 1 : 0)),
        };
      }),
    onError: refresh,
  });

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onMutate: () => patchAll((list) => ({ items: list.items.map((n) => ({ ...n, read: true })), unreadCount: 0 })),
    onError: refresh,
  });

  const remove = useMutation({
    mutationFn: notificationsApi.remove,
    onMutate: (id: string) =>
      patchAll((list) => {
        const target = list.items.find((n) => n._id === id);
        return {
          items: list.items.filter((n) => n._id !== id),
          unreadCount: Math.max(0, list.unreadCount - (target && !target.read ? 1 : 0)),
        };
      }),
    onError: refresh,
  });

  /** Go straight to where it happened, and mark it read */
  const open = (notification: AppNotification) => {
    if (!notification.read) markRead.mutate(notification._id);
    if (notification.link) navigate(notification.link);
  };

  return {
    notifications: query.data?.items ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    isLoading: query.isLoading,
    open,
    markAllRead: () => markAllRead.mutate(),
    remove: (id: string) => remove.mutate(id),
  };
}
