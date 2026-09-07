import { Group } from './group.entity';

export interface CreateGroupData {
  id: string;
  name: string;
  profilePic: string | null;
  createdAt: Date;
  creatorId: string;
}

export interface GroupProfilePictureAccess {
  imageKey: string | null;
  userIsMember: boolean;
}

export abstract class GroupRepository {
  abstract create(data: CreateGroupData): Promise<Group>;

  abstract findById(id: string): Promise<Group | null>;

  abstract findByUserId(userId: string): Promise<Group[]>;

  abstract findProfilePictureAccess(
    groupId: string,
    userId: string
  ): Promise<GroupProfilePictureAccess | null>;
}
