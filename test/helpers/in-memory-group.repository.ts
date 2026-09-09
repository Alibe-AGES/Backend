import { Group } from '../../src/modules/groups/domain/group.entity';
import {
  GroupRepository,
  type CreateGroupData,
  type GroupDetails,
} from '../../src/modules/groups/domain/group.repository';

export class InMemoryGroupRepository extends GroupRepository {
  private readonly groups = new Map<string, Group>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  findByUserId(_userId: string): Promise<Group[]> {
    throw new Error('Method not implemented.');
  }

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

  findDetailsById(id: string): Promise<GroupDetails | null> {
    const group = this.groups.get(id);

    if (!group) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      id: group.id,
      name: group.name,
      profilePic: group.profilePic,
      createdAt: group.createdAt,
      participants: [],
      nextEvent: null,
    });
  }
}
