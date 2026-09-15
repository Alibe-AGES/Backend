import { Group } from '../../src/modules/groups/domain/group.entity';
import { GroupInviteLink } from '../../src/modules/groups/domain/group-invite-link.entity';
import {
  GroupRepository,
  type CreateGroupData,
  type CreateGroupInviteLinkData,
  type GroupProfilePictureAccess,
  type GroupDetails,
} from '../../src/modules/groups/domain/group.repository';

export class InMemoryGroupRepository extends GroupRepository {
  private readonly groups = new Map<string, Group>();
  private readonly inviteLinks: GroupInviteLink[] = [];
  private readonly members = new Set<string>();

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

  findMembership(groupId: string, userId: string): Promise<boolean | null> {
    if (!this.groups.has(groupId)) {
      return Promise.resolve(null);
    }

    return Promise.resolve(this.members.has(`${groupId}:${userId}`));
  }

  createInviteLink(data: CreateGroupInviteLinkData): Promise<GroupInviteLink> {
    const inviteLink = new GroupInviteLink(data);
    this.inviteLinks.push(inviteLink);
    return Promise.resolve(inviteLink);
  }

  findLatestInviteLinkByGroupId(groupId: string): Promise<GroupInviteLink | null> {
    const latest = this.inviteLinks
      .filter((inviteLink) => inviteLink.groupId === groupId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    return Promise.resolve(latest ?? null);
  }

  findInviteLinkByToken(token: string): Promise<GroupInviteLink | null> {
    const inviteLink = this.inviteLinks.find((link) => link.token === token);

    return Promise.resolve(inviteLink ?? null);
  }

  addMember(groupId: string, userId: string): Promise<void> {
    this.members.add(`${groupId}:${userId}`);
    return Promise.resolve();
  }

  findProfilePictureAccess(groupId: string): Promise<GroupProfilePictureAccess | null> {
    const group = this.groups.get(groupId);

    return Promise.resolve(group ? { imageKey: group.profilePic, userIsMember: true } : null);
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
