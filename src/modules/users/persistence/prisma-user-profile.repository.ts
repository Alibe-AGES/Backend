import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { UserProfileRepository } from '../domain/user-profile.repository';

@Injectable()
export class PrismaUserProfileRepository extends UserProfileRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findCurrentUserSummary(userId: string, now: Date) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        profilePic: true,
      },
    });

    if (!user) {
      return null;
    }

    const memberEventFilter = {
      group: { users: { some: { userId } } },
    };

    const [completedEvents, eventsInDecision] = await Promise.all([
      this.prisma.event.count({
        where: {
          ...memberEventFilter,
          status: 'confirmed',
          timeslot: { lt: now },
        },
      }),
      this.prisma.event.count({
        where: {
          ...memberEventFilter,
          status: 'pending',
          proposals: {
            some: {},
            none: { responses: { some: { userId } } },
          },
        },
      }),
    ]);

    return { ...user, completedEvents, eventsInDecision };
  }
}
