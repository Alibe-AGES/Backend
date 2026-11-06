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
  ownerId?: string | null;
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

export interface GroupAvailabilitiesByDate {
  date: string;
  users: Array<{
    id: string;
    name: string;
    profilePic: string | null;
    availableAllDay: boolean;
    intervals: Array<[string, string]>;
  }>;
}

export interface UpdateGroupData {
  name?: string;
  profilePic?: string | null;
}

export interface GroupManagementState {
  ownerId: string | null;
  profilePic: string | null;
}

export class GroupManagementError extends Error {
  constructor(
    readonly reason: 'not-found' | 'forbidden',
    message: string
  ) {
    super(message);
  }
}

export abstract class GroupRepository {
  abstract findManagementState(groupId: string): Promise<GroupManagementState | null>;

  abstract updateOwned(
    groupId: string,
    ownerId: string,
    data: UpdateGroupData
  ): Promise<{
    group: Group;
    previousImageKey: string | null;
  }>;

  // Without actingOwnerId, removes the user's own membership (the leave flow).
  abstract removeMember(groupId: string, userId: string, actingOwnerId?: string): Promise<boolean>;

  abstract create(data: CreateGroupData): Promise<Group>;

  abstract findById(id: string): Promise<Group | null>;

  abstract findDetailsById(id: string): Promise<GroupDetails | null>;

  abstract findByUserId(userId: string): Promise<Group[]>;

  abstract findMembership(groupId: string, userId: string): Promise<boolean | null>;

  abstract createInviteLink(data: CreateGroupInviteLinkData): Promise<GroupInviteLink>;

  abstract findLatestInviteLinkByGroupId(groupId: string): Promise<GroupInviteLink | null>;

  abstract findInviteLinkByToken(token: string): Promise<GroupInviteLink | null>;

  abstract addMember(groupId: string, userId: string): Promise<void>;

  abstract findProfilePictureAccess(
    groupId: string,
    userId: string
  ): Promise<GroupProfilePictureAccess | null>;

  abstract findAvailabilitiesByDate(
    groupId: string,
    date: string,
    userId: string
  ): Promise<GroupAvailabilitiesByDate | null>;
}
