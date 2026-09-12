import { Group } from './group.entity';
import { GroupInviteLink } from './group-invite-link.entity';

export interface CreateGroupData {
  id: string;
  name: string;
  profilePic: string | null;
  createdAt: Date;
  creatorId: string;
}

export interface GroupDetails {
  id: string;
  name: string;
  profilePic: string | null;
  createdAt: Date;
  participants: Array<{
    id: string;
    name: string | null;
    profilePic: string | null;
  }>;
  nextEvent: {
    id: string;
    name: string | null;
    timeslot: Date;
    status: 'pending' | 'confirmed' | 'declined';
  } | null;
}

export interface CreateGroupInviteLinkData {
  id: string;
  token: string;
  validity: Date;
  createdAt: Date;
  groupId: string;
}

export interface GroupProfilePictureAccess {
  imageKey: string | null;
  userIsMember: boolean;
}

export abstract class GroupRepository {
  abstract create(data: CreateGroupData): Promise<Group>;

  abstract findById(id: string): Promise<Group | null>;

  abstract findDetailsById(id: string): Promise<GroupDetails | null>;

  abstract findByUserId(userId: string): Promise<Group[]>;

  abstract createInviteLink(data: CreateGroupInviteLinkData): Promise<GroupInviteLink>;

  abstract findLatestInviteLinkByGroupId(groupId: string): Promise<GroupInviteLink | null>;

  abstract findProfilePictureAccess(
    groupId: string,
    userId: string
  ): Promise<GroupProfilePictureAccess | null>;
}
