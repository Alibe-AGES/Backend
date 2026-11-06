import { RemoveGroupMemberUseCase } from '../../../../src/modules/groups/application/remove-group-member.use-case';
import {
  GroupManagementError,
  GroupRepository,
} from '../../../../src/modules/groups/domain/group.repository';

describe('RemoveGroupMemberUseCase', () => {
  const removeMember = jest.fn();
  const useCase = new RemoveGroupMemberUseCase({ removeMember } as unknown as GroupRepository);
  beforeEach(() => removeMember.mockReset());

  it('passes the authenticated owner separately from the target participant', async () => {
    removeMember.mockResolvedValue(true);
    await expect(useCase.execute('group', 'target', 'owner')).resolves.toBeUndefined();
    expect(removeMember).toHaveBeenCalledWith('group', 'target', 'owner');
  });

  it('reports a missing participant', async () => {
    removeMember.mockResolvedValue(false);
    await expect(useCase.execute('group', 'target', 'owner')).rejects.toMatchObject({
      reason: 'not-found',
    });
  });

  it('preserves the authorization error from the transactional repository', async () => {
    removeMember.mockRejectedValue(new GroupManagementError('forbidden', 'Only owner'));
    await expect(useCase.execute('group', 'target', 'other')).rejects.toMatchObject({
      reason: 'forbidden',
    });
  });
});
