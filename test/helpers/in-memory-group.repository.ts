import { Group } from '../../src/modules/groups/domain/group.entity';
import {
  GroupRepository,
  type CreateGroupData,
  type GroupProfilePictureAccess,
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

  findProfilePictureAccess(groupId: string): Promise<GroupProfilePictureAccess | null> {
    const group = this.groups.get(groupId);

    return Promise.resolve(group ? { imageKey: group.profilePic, userIsMember: true } : null);
  }
}
