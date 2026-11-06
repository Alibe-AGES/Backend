import { Injectable } from '@nestjs/common';
import { GroupManagementError, GroupRepository } from '../domain/group.repository';

@Injectable()
export class RemoveGroupMemberUseCase {
  constructor(private readonly groups: GroupRepository) {}

  async execute(groupId: string, userId: string, ownerId: string): Promise<void> {
    if (!(await this.groups.removeMember(groupId, userId, ownerId))) {
      throw new GroupManagementError('not-found', 'Participante não encontrado no grupo');
    }
  }
}
