import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import type { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import {
  CreateGroupData,
  CreateGroupInviteLinkData,
  GroupAvailabilitiesByDate,
  GroupProfilePictureAccess,
  GroupDetails,
  GroupRepository,
  GroupManagementError,
  GroupManagementState,
  UpdateGroupData,
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
        ownerId: data.creatorId,
        users: {
          create: {
            userId: data.creatorId,
          },
        },
      },
    });

    return new Group(group);
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
      ownerId: group.ownerId,
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

  async findMembership(groupId: string, userId: string): Promise<boolean | null> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        users: {
          where: { userId },
          select: { userId: true },
          take: 1,
        },
      },
    });

    return group ? group.users.length > 0 : null;
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

  async findInviteLinkByToken(token: string): Promise<GroupInviteLink | null> {
    const inviteLink = await this.prisma.inviteLink.findUnique({ where: { token } });

    return inviteLink ? new GroupInviteLink(inviteLink) : null;
  }

  async addMember(groupId: string, userId: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const group = await this.lockGroup(transaction, groupId);
      if (!group) throw new GroupManagementError('not-found', 'Grupo não encontrado');
      await transaction.userGroup.upsert({
        where: { userId_groupId: { userId, groupId } },
        update: {},
        create: { userId, groupId },
      });
      if (!group.ownerId) {
        await transaction.group.update({ where: { id: groupId }, data: { ownerId: userId } });
      }
    });
  }

  async findManagementState(groupId: string): Promise<GroupManagementState | null> {
    return this.prisma.group.findUnique({
      where: { id: groupId },
      select: { ownerId: true, profilePic: true },
    });
  }

  async updateOwned(groupId: string, ownerId: string, data: UpdateGroupData) {
    return this.prisma.$transaction(async (transaction) => {
      const current = await this.lockGroup(transaction, groupId);
      this.requireOwner(current, ownerId);
      const updated = await transaction.group.update({ where: { id: groupId }, data });
      return { group: new Group(updated), previousImageKey: current.profilePic };
    });
  }

  async removeMember(groupId: string, userId: string, actingOwnerId?: string): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const current = await this.lockGroup(transaction, groupId);
      if (actingOwnerId !== undefined) this.requireOwner(current, actingOwnerId);
      if (!current) return false;
      const { count } = await transaction.userGroup.deleteMany({ where: { groupId, userId } });
      if (!count) return false;
      if (current.ownerId === userId) {
        const members = await transaction.userGroup.findMany({
          where: { groupId },
          select: { userId: true },
        });
        const ownerId = members.length ? members[randomInt(members.length)].userId : null;
        await transaction.group.update({ where: { id: groupId }, data: { ownerId } });
      }
      return true;
    });
  }

  private async lockGroup(transaction: Prisma.TransactionClient, groupId: string) {
    const [group] = await transaction.$queryRaw<GroupManagementState[]>`
      SELECT "owner_id" AS "ownerId", "profile_pic" AS "profilePic"
      FROM "group" WHERE "id" = ${groupId}::uuid FOR UPDATE
    `;
    return group ?? null;
  }

  private requireOwner(
    group: GroupManagementState | null,
    ownerId: string
  ): asserts group is GroupManagementState {
    if (!group) throw new GroupManagementError('not-found', 'Grupo não encontrado');
    if (group.ownerId !== ownerId) {
      throw new GroupManagementError(
        'forbidden',
        'Somente o owner pode editar o grupo ou remover membros'
      );
    }
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

  async findAvailabilitiesByDate(
    groupId: string,
    date: string,
    userId: string
  ): Promise<GroupAvailabilitiesByDate | null> {
    const group = await this.prisma.group.findUnique({
      where: {
        id: groupId,
        users: {
          some: {
            userId,
          },
        },
      },
      select: {
        users: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                profilePic: true,
                availabilities: {
                  where: {
                    groupId: groupId,
                    date: new Date(`${date}T00:00:00.000Z`),
                  },
                  select: {
                    timeslotStart: true,
                    timeslotEnd: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!group) return null;

    return {
      date,
      users: group.users.map(({ user }) => {
        const availableAllDay = user.availabilities.some(
          ({ timeslotStart, timeslotEnd }) => !timeslotStart && !timeslotEnd
        );

        const intervals = user.availabilities.flatMap(({ timeslotStart, timeslotEnd }) =>
          timeslotStart && timeslotEnd
            ? [
                [
                  timeslotStart.toISOString().substring(11, 16),
                  timeslotEnd.toISOString().substring(11, 16),
                ] as [string, string],
              ]
            : []
        );

        return {
          id: user.id,
          name: user.name,
          profilePic: user.profilePic,
          availableAllDay,
          intervals,
        };
      }),
    };
  }
}
