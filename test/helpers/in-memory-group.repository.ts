import { Group } from '../../src/modules/groups/domain/group.entity';
import {
  GroupRepository,
  type CreateGroupData,
} from '../../src/modules/groups/domain/group.repository';

export class InMemoryGroupRepository extends GroupRepository {
  private readonly groups = new Map<string, Group>();

  create(data: CreateGroupData): Promise<Group> {
    const group = new Group({
      ...data,
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
    });

    this.groups.set(group.id, group);
    return Promise.resolve(group);
  }

  findById(id: string): Promise<Group | null> {
    return Promise.resolve(this.groups.get(id) ?? null);
  }
}
