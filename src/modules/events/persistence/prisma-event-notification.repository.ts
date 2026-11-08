import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  type AttendanceReminderCandidate,
  EventNotificationRepository,
  type PushNotificationRecipient,
} from '../domain/event-notification.repository';

@Injectable()
export class PrismaEventNotificationRepository extends EventNotificationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findGroupRecipients(
    groupId: string,
    excludedUserId?: string
  ): Promise<PushNotificationRecipient[]> {
    const memberships = await this.prisma.userGroup.findMany({
      where: {
        groupId,
        ...(excludedUserId ? { userId: { not: excludedUserId } } : {}),
        user: { expoPushToken: { not: null } },
      },
      select: {
        userId: true,
        user: { select: { expoPushToken: true } },
      },
    });

    return memberships.flatMap(({ userId, user }) =>
      user.expoPushToken ? [{ userId, pushToken: user.expoPushToken }] : []
    );
  }

  async findAttendanceReminderCandidates(
    start: Date,
    end: Date
  ): Promise<AttendanceReminderCandidate[]> {
    const events = await this.prisma.event.findMany({
      where: {
        status: 'pending',
        timeslot: { gte: start, lt: end },
      },
      select: {
        id: true,
        name: true,
        groupId: true,
        proposals: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            responses: {
              select: { userId: true, answer: true },
            },
          },
        },
        group: {
          select: {
            users: {
              where: { user: { expoPushToken: { not: null } } },
              select: {
                userId: true,
                user: { select: { expoPushToken: true } },
              },
            },
          },
        },
      },
    });

    return events.map((event) => {
      // 1. Coleta os IDs de quem já respondeu (ignorando 'pending')
      const proposalResponses = event.proposals[0]?.responses ?? [];
      const answeredUserIds = new Set(
        proposalResponses
          .filter((response) => response.answer !== 'pending')
          .map((response) => response.userId)
      );

      // Quem ainda não respondeu, ou deixou a resposta pendente, recebe o lembrete.
      const recipients = event.group.users
        .filter(({ userId, user }) => {
          const hasAnswered = answeredUserIds.has(userId);
          const hasPushToken = Boolean(user?.expoPushToken);
          return !hasAnswered && hasPushToken;
        })
        .map(({ userId, user }) => ({
          userId,
          pushToken: user.expoPushToken,
        }));

      return {
        eventId: event.id,
        eventName: event.name?.trim() || 'Encontro do grupo',
        groupId: event.groupId,
        recipients,
      };
    });
  }
}
