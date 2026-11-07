import { Injectable } from '@nestjs/common';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import type { createAuth } from '../../auth/auth.config';
import { UserProfileRepository } from '../domain/user-profile.repository';

@Injectable()
export class PrismaUserProfileRepository extends UserProfileRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService<ReturnType<typeof createAuth>>
  ) {
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

  async verifyPassword(userId: string, password: string): Promise<boolean> {
    const context = await this.auth.instance.$context;
    const account = await context.internalAdapter.findCredentialAccount(userId);

    if (!account?.password) {
      return false;
    }

    return context.password.verify({ password, hash: account.password });
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const context = await this.auth.instance.$context;
    const passwordHash = await context.password.hash(newPassword);

    await context.internalAdapter.updatePassword(userId, passwordHash);
  }
}
