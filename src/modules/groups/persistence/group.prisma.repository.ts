import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  CreateGroupData,
  CreateGroupInviteLinkData,
  GroupProfilePictureAccess,
  GroupDetails,
  GroupRepository,
} from '../domain/group.repository';
import { Group } from '../domain/group.entity';
import { GroupInviteLink } from '../domain/group-invite-link.entity';

@Injectable()
export class PrismaGroupRepository implements GroupRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async create(data: CreateGroupData): Promise<Group> {
    const group = await this.prisma.group.create({
      data: {
        id: data.id,
        name: data.name,
        profilePic: data.profilePic,
        createdAt: data.createdAt,
        users: {
          create: {
            userId: data.creatorId,
          },
        },
      },
    });

    return group;
  }

  async findById(id: string): Promise<Group | null> {
    const group = await this.prisma.group.findUnique({ where: { id } });
    return group;
  }

  async findDetailsById(id: string): Promise<GroupDetails | null> {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                profilePic: true,
              },
            },
          },
        },
        events: {
          where: { timeslot: { gte: new Date() } },
          orderBy: { timeslot: 'asc' },
          take: 1,
          select: {
            id: true,
            name: true,
            timeslot: true,
            status: true,
          },
        },
      },
    });

    if (!group) {
      return null;
    }

    const [nextEvent] = group.events;

    return {
      id: group.id,
      name: group.name,
      profilePic: group.profilePic,
      createdAt: group.createdAt,
      participants: group.users.map(({ user }) => user),
      nextEvent: nextEvent
        ? {
            id: nextEvent.id,
            name: nextEvent.name,
            timeslot: nextEvent.timeslot as Date,
            status: nextEvent.status,
          }
        : null,
    };
  }

  async findByUserId(userId: string): Promise<Group[]> {
    const groups = await this.prisma.group.findMany({
      where: {
        users: {
          some: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return groups.map((group) => new Group(group));
  }

  async createInviteLink(data: CreateGroupInviteLinkData): Promise<GroupInviteLink> {
    const inviteLink = await this.prisma.inviteLink.create({
      data: {
        id: data.id,
        token: data.token,
        validity: data.validity,
        createdAt: data.createdAt,
        groupId: data.groupId,
      },
    });

    return new GroupInviteLink(inviteLink);
  }

  async findLatestInviteLinkByGroupId(groupId: string): Promise<GroupInviteLink | null> {
    const inviteLink = await this.prisma.inviteLink.findFirst({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
    });

    return inviteLink ? new GroupInviteLink(inviteLink) : null;
  }

  async findProfilePictureAccess(
    groupId: string,
    userId: string
  ): Promise<GroupProfilePictureAccess | null> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        profilePic: true,
        users: {
          where: { userId },
          select: { userId: true },
          take: 1,
        },
      },
    });

    return group ? { imageKey: group.profilePic, userIsMember: group.users.length === 1 } : null;
  }
}
