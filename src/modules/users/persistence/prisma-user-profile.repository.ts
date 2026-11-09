import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { UserProfileRepository, type UpdatedUserProfile } from '../domain/user-profile.repository';

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

  async updateExpoPushToken(userId: string, token: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.updateMany({
        where: {
          expoPushToken: token,
          id: { not: userId },
        },
        data: { expoPushToken: null },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { expoPushToken: token },
      }),
    ]);
  }

  async findExpoPushToken(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { expoPushToken: true },
    });

    return user?.expoPushToken ?? null;
  }

  async updateName(userId: string, name: string): Promise<UpdatedUserProfile | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return null;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { name: true },
    });
  }
}
