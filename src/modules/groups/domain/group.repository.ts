import { Group } from './group.entity';

export abstract class GroupRepository {
  abstract findByUserId(userId: string): Promise<Group[]>;
}
