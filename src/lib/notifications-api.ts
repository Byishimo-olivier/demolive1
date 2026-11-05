import { api } from './axios';

/** Something that happened on a project, for the people concerned (the bell and the dashboard) */
export interface AppNotification {
  _id: string;
  actorName?: string;
  projectId?: string;
  projectName?: string;
  resource: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  // finance, procurement, inventory, timeline, documents, team, project
  area: string;
  title: string;
  message: string;
  // Where it happened in the app, e.g. /projects/:id?tab=finance
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationList {
  items: AppNotification[];
  unreadCount: number;
}

interface Envelope<T> {
  data: T;
}

export const notificationsApi = {
  list: async (limit = 20): Promise<NotificationList> => {
    const response = await api.get<Envelope<NotificationList>>(`/notifications?limit=${limit}`);
    return response.data.data;
  },
  markRead: async (id: string) => {
    await api.patch(`/notifications/${id}/read`);
  },
  markAllRead: async () => {
    await api.patch('/notifications/read-all');
  },
  remove: async (id: string) => {
    await api.delete(`/notifications/${id}`);
  },
};
