import {
  UpdateUserProfileUseCase,
  UserNotFoundForProfileUpdateError,
} from '../../../../src/modules/users/application/update-user-profile.use-case';
import { UserProfileRepository } from '../../../../src/modules/users/domain/user-profile.repository';

describe('UpdateUserProfileUseCase', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  it('updates the name of the authenticated user', async () => {
    const users = {
      updateName: jest.fn().mockResolvedValue({ name: 'Ana Silva' }),
    } as unknown as UserProfileRepository;
    const useCase = new UpdateUserProfileUseCase(users);

    await expect(useCase.execute({ userId, name: 'Ana Silva' })).resolves.toEqual({
      name: 'Ana Silva',
    });
    expect(users.updateName).toHaveBeenCalledWith(userId, 'Ana Silva');
  });

  it('reports when the authenticated user no longer exists', async () => {
    const users = {
      updateName: jest.fn().mockResolvedValue(null),
    } as unknown as UserProfileRepository;
    const useCase = new UpdateUserProfileUseCase(users);

    await expect(useCase.execute({ userId, name: 'Ana Silva' })).rejects.toBeInstanceOf(
      UserNotFoundForProfileUpdateError
    );
  });
});
