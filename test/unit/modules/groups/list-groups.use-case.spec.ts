import { ListGroupsUseCase } from '../../../../src/modules/groups/application/list-groups.use-case';
import { Group } from '../../../../src/modules/groups/domain/group.entity';
import { GroupRepository } from '../../../../src/modules/groups/domain/group.repository';

describe('ListGroupsUseCase', () => {
  it('returns the groups found for the user', async () => {
    const groups = [
      new Group({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        name: 'Turma da Faculdade',
        profilePic: null,
        createdAt: new Date('2026-07-12'),
      }),
    ];
    const findByUserId = jest.fn().mockResolvedValue(groups);
    const repository = { findByUserId } as unknown as GroupRepository;
    const useCase = new ListGroupsUseCase(repository);

    await expect(useCase.execute('11111111-1111-4111-8111-111111111111')).resolves.toEqual(groups);
    expect(findByUserId).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
  });

  it('returns an empty list when the user has no groups', async () => {
    const repository = {
      findByUserId: jest.fn().mockResolvedValue([]),
    } as unknown as GroupRepository;
    const useCase = new ListGroupsUseCase(repository);

    await expect(useCase.execute('11111111-1111-4111-8111-111111111111')).resolves.toEqual([]);
  });

  it('propagates repository errors', async () => {
    const repositoryError = new Error('Database error');
    const repository = {
      findByUserId: jest.fn().mockRejectedValue(repositoryError),
    } as unknown as GroupRepository;
    const useCase = new ListGroupsUseCase(repository);

    await expect(useCase.execute('11111111-1111-4111-8111-111111111111')).rejects.toBe(
      repositoryError
    );
  });
});
