import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  CalendarRepository,
  type FindGroupCalendarDataInput,
  type GroupCalendarData,
} from '../domain/calendar.repository';

@Injectable()
export class PrismaCalendarRepository extends CalendarRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findGroupCalendarData(
    input: FindGroupCalendarDataInput
  ): Promise<GroupCalendarData | null> {
    const group = await this.prisma.group.findUnique({
      where: { id: input.groupId },
      select: {
        users: {
          select: { userId: true },
        },
        events: {
          where: {
            timeslot: {
              gte: input.periodStart,
              lt: input.periodEnd,
            },
          },
          orderBy: { timeslot: 'asc' },
          select: {
            id: true,
            timeslot: true,
            status: true,
            proposals: {
              orderBy: { createdAt: 'asc' },
              select: { id: true },
            },
          },
        },
        availabilities: {
          where: {
            date: {
              gte: input.periodStart,
              lt: input.periodEnd,
            },
          },
          orderBy: { date: 'asc' },
          select: {
            userId: true,
            date: true,
          },
        },
      },
    });

    if (!group) {
      return null;
    }

    return {
      userIsMember: group.users.some(({ userId }) => userId === input.userId),
      memberIds: group.users.map(({ userId }) => userId),
      events: group.events.flatMap((event) =>
        event.timeslot
          ? [
              {
                id: event.id,
                timeslot: event.timeslot,
                status: event.status,
                proposalIds: event.proposals.map(({ id }) => id),
              },
            ]
          : []
      ),
      availabilities: group.availabilities.map((availability) => ({
        userId: availability.userId,
        date: availability.date,
      })),
    };
  }
}
