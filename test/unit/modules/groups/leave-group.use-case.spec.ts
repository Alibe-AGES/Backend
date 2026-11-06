import { LeaveGroupUseCase } from '../../../../src/modules/groups/application/leave-group.use-case';
import { GroupManagementError } from '../../../../src/modules/groups/domain/group.repository';
import { InMemoryGroupRepository } from '../../../helpers/in-memory-group.repository';

function createGroup(groups: InMemoryGroupRepository, id: string) {
  return groups.create({
    id,
    name: id,
    profilePic: null,
    createdAt: new Date(),
    creatorId: 'owner',
  });
}

describe('LeaveGroupUseCase', () => {
  it('removes only the requested membership and rejects a repeated exit', async () => {
    const groups = new InMemoryGroupRepository();
    const useCase = new LeaveGroupUseCase(groups);
    const group = await createGroup(groups, 'Amigos');
    const other = await createGroup(groups, 'Outro');
    await groups.addMember(group.id, 'user');
    await groups.addMember(other.id, 'user');

    await expect(useCase.execute(group.id, 'user')).resolves.toBeUndefined();

    await expect(groups.findMembership(group.id, 'user')).resolves.toBe(false);
    await expect(groups.findMembership(other.id, 'user')).resolves.toBe(true);
    await expect(useCase.execute(group.id, 'user')).rejects.toMatchObject({ reason: 'not-found' });
  });

  it('hands the group to a remaining member when the owner leaves', async () => {
    const groups = new InMemoryGroupRepository();
    const useCase = new LeaveGroupUseCase(groups);
    const group = await createGroup(groups, 'Amigos');
    await groups.addMember(group.id, 'member');

    await useCase.execute(group.id, 'owner');

    await expect(groups.findManagementState(group.id)).resolves.toMatchObject({
      ownerId: 'member',
    });
  });

  it('keeps an empty group without owner when the last member leaves', async () => {
    const groups = new InMemoryGroupRepository();
    const useCase = new LeaveGroupUseCase(groups);
    const group = await createGroup(groups, 'Amigos');

    await useCase.execute(group.id, 'owner');

    await expect(groups.findManagementState(group.id)).resolves.toMatchObject({ ownerId: null });
  });

  it('does not require ownership to leave', async () => {
    const removeMember = jest.fn().mockResolvedValue(true);
    const useCase = new LeaveGroupUseCase({ removeMember } as never);

    await useCase.execute('group', 'member');

    expect(removeMember).toHaveBeenCalledWith('group', 'member');
  });

  it('reports a missing group or membership as not found', async () => {
    const useCase = new LeaveGroupUseCase(new InMemoryGroupRepository());

    await expect(useCase.execute('missing', 'user')).rejects.toBeInstanceOf(GroupManagementError);
  });
});
