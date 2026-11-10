import { Injectable } from '@nestjs/common';
import { GroupRepository } from '../domain/group.repository';

export class GroupMembershipNotFoundError extends Error {}

@Injectable()
export class LeaveGroupUseCase {
  constructor(private readonly groups: GroupRepository) {}

  async execute(groupId: string, userId: string): Promise<void> {
    if (!(await this.groups.removeMember(groupId, userId))) {
      throw new GroupMembershipNotFoundError('Usuário não pertence ao grupo ou grupo não existe');
    }
  }
}
