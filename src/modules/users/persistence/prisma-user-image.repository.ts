import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  UserImageRepository,
  type UserProfilePictureAccess,
} from '../domain/user-image.repository';

@Injectable()
export class PrismaUserImageRepository extends UserImageRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findProfilePictureAccess(
    targetUserId: string,
    requesterUserId: string
  ): Promise<UserProfilePictureAccess | null> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        profilePic: true,
        groups: {
          where: {
            group: {
              users: {
                some: { userId: requesterUserId },
              },
            },
          },
          select: { groupId: true },
          take: 1,
        },
      },
    });

    if (!targetUser) {
      return null;
    }

    return {
      imageKey: targetUser.profilePic,
      requesterCanAccess: targetUserId === requesterUserId || targetUser.groups.length === 1,
    };
  }
}
