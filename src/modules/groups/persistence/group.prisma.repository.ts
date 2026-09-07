import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateGroupData, GroupRepository } from '../domain/group.repository';
import { Group } from '../domain/group.entity';

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
}
