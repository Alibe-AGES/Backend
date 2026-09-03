import { Group } from './group.entity';

export interface CreateGroupData {
  id: string;
  name: string;
  profilePic: string | undefined;
  createdAt: Date;
}

export abstract class GroupRepository {
  abstract create(data: CreateGroupData): Promise<Group>;

  abstract findById(id: string): Promise<Group | null>;
}
