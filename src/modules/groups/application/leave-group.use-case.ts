import { Injectable } from '@nestjs/common';
import { GroupManagementError, GroupRepository } from '../domain/group.repository';

@Injectable()
export class LeaveGroupUseCase {
  constructor(private readonly groups: GroupRepository) {}

  /** Remove a participação do próprio usuário; se ele era o owner, o repository sorteia outro. */
  async execute(groupId: string, userId: string): Promise<void> {
    if (!(await this.groups.removeMember(groupId, userId))) {
      throw new GroupManagementError('not-found', 'Usuário não participa deste grupo');
    }
  }
}
