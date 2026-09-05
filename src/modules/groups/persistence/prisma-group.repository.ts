import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Group } from '../domain/group.entity';
import { GroupRepository, type CreateGroupData } from '../domain/group.repository';

@Injectable()
export class PrismaGroupRepository extends GroupRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: CreateGroupData): Promise<Group> {
    const group = await this.prisma.group.create({ data });
    return this.toDomain(group);
  }

  async findById(id: string): Promise<Group | null> {
    const group = await this.prisma.group.findUnique({ where: { id } });
    return group ? this.toDomain(group) : null;
  }

  private toDomain(data: { id: string; name: string; imageKey?: string; createdAt: Date }): Group {
    return new Group(data);
  }
}
