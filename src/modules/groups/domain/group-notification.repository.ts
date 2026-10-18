export type GroupNotificationType = 'match' | 'createdEvent';

export interface GroupNotificationItem {
  id: string;
  type: GroupNotificationType;
  message: string;
  createdAt: Date;
  eventId: string | null;
}

// Mensagens persistidas podem conter `${user:<uuid>}`. O adaptador resolve esses marcadores antes
// de devolver os itens para a aplicação.

export interface PaginatedGroupNotifications {
  items: GroupNotificationItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export abstract class GroupNotificationRepository {
  abstract findUnreadPage(
    groupId: string,
    userId: string,
    page: number,
    limit: number
  ): Promise<PaginatedGroupNotifications>;

  abstract markAllAsRead(groupId: string, userId: string, readAt: Date): Promise<void>;

  /** Retorna false quando a notificação não pertence ao grupo informado. */
  abstract markAsRead(
    groupId: string,
    notificationId: string,
    userId: string,
    readAt: Date
  ): Promise<boolean>;
}
