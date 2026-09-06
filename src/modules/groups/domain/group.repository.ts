import { Group } from './group.entity';

<<<<<<< HEAD
export interface CreateGroupData {
  id: string;
  name: string;
  profilePic: string | null;
  createdAt: Date;
}

export abstract class GroupRepository {
  abstract create(data: CreateGroupData): Promise<Group>;

  abstract findById(id: string): Promise<Group | null>;
=======
export abstract class GroupRepository {
  abstract findByUserId(userId: string): Promise<Group[]>;
>>>>>>> develop
}
