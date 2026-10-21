import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  GroupNotificationRepository,
  type PaginatedGroupNotifications,
} from '../domain/group-notification.repository';
import {
  groupNotificationUserIds,
  resolveGroupNotificationUsers,
} from '../domain/group-notification-message';

@Injectable()
export class PrismaGroupNotificationRepository extends GroupNotificationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findUnreadPage(
    groupId: string,
    userId: string,
    page: number,
    limit: number
  ): Promise<PaginatedGroupNotifications> {
    const where = {
      groupId,
      reads: { none: { userId } },
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.groupNotification.count({ where }),
      this.prisma.groupNotification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          message: true,
          createdAt: true,
          eventId: true,
          locationId: true,
        },
      }),
    ]);
    const referencedUserIds = [
      ...new Set(items.flatMap(({ message }) => groupNotificationUserIds(message))),
    ];
    const users =
      referencedUserIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: referencedUserIds } },
            select: { id: true, name: true },
          });
    const userNames = new Map(users.map(({ id, name }) => [id.toLowerCase(), name]));

    return {
      items: items.map((notification) => ({
        ...notification,
        message: resolveGroupNotificationUsers(notification.message, userNames),
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAllAsRead(groupId: string, userId: string, readAt: Date): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const unreadNotifications = await transaction.groupNotification.findMany({
        where: {
          groupId,
          reads: { none: { userId } },
        },
        select: { id: true },
      });

      if (unreadNotifications.length === 0) {
        return;
      }

      await transaction.groupNotificationRead.createMany({
        data: unreadNotifications.map(({ id }) => ({
          notificationId: id,
          userId,
          readAt,
        })),
        skipDuplicates: true,
      });
    });
  }

  async markAsRead(
    groupId: string,
    notificationId: string,
    userId: string,
    readAt: Date
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const notification = await transaction.groupNotification.findFirst({
        where: { id: notificationId, groupId },
        select: { id: true },
      });

      if (!notification) {
        return false;
      }

      await transaction.groupNotificationRead.upsert({
        where: {
          notificationId_userId: { notificationId, userId },
        },
        create: { notificationId, userId, readAt },
        update: { readAt },
      });

      return true;
    });
  }
}
