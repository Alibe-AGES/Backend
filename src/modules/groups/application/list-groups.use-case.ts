import { Injectable } from '@nestjs/common';
import { Group } from '../domain/group.entity';
import { GroupRepository } from '../domain/group.repository';

@Injectable()
export class ListGroupsUseCase {
  constructor(private readonly groups: GroupRepository) {}

  async execute(userId: string): Promise<Group[]> {
    return this.groups.findByUserId(userId);
  }
}
