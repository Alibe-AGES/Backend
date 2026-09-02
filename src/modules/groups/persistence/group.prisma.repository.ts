import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { GroupRepository } from '../domain/group.repository';
import { Group } from '../domain/group.entity';

@Injectable()
export class PrismaGroupRepository implements GroupRepository {
  constructor(protected readonly prisma: PrismaService) {}

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
