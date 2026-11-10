import {
  GroupMembershipNotFoundError,
  LeaveGroupUseCase,
} from '../../../../src/modules/groups/application/leave-group.use-case';
import { InMemoryGroupRepository } from '../../../helpers/in-memory-group.repository';

describe('LeaveGroupUseCase', () => {
  it('removes only the requested membership and rejects a repeated exit', async () => {
    const groups = new InMemoryGroupRepository();
    const useCase = new LeaveGroupUseCase(groups);
    await groups.addMember('group', 'user');
    await groups.addMember('group', 'other');
    await groups.addMember('other-group', 'user');
    await expect(useCase.execute('group', 'user')).resolves.toBeUndefined();
    await expect(useCase.execute('group', 'user')).rejects.toBeInstanceOf(
      GroupMembershipNotFoundError
    );
    await expect(useCase.execute('group', 'other')).resolves.toBeUndefined();
    await expect(useCase.execute('other-group', 'user')).resolves.toBeUndefined();
  });

  it('rejects a missing membership', async () => {
    const useCase = new LeaveGroupUseCase(new InMemoryGroupRepository());
    await expect(useCase.execute('missing', 'user')).rejects.toBeInstanceOf(
      GroupMembershipNotFoundError
    );
  });
});
