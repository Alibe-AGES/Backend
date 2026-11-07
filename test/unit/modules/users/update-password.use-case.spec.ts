import {
  InvalidCurrentPasswordError,
  UpdatePasswordUseCase,
} from '../../../../src/modules/users/application/update-password.use-case';
import { UserProfileRepository } from '../../../../src/modules/users/domain/user-profile.repository';

describe('UpdatePasswordUseCase', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const verifyPassword = jest.fn();
  const updatePassword = jest.fn();
  const useCase = new UpdatePasswordUseCase({
    verifyPassword,
    updatePassword,
  } as unknown as UserProfileRepository);

  beforeEach(() => {
    verifyPassword.mockReset();
    updatePassword.mockReset();
    updatePassword.mockResolvedValue(undefined);
  });

  it('updates the password when the current password is correct', async () => {
    verifyPassword.mockResolvedValue(true);

    await useCase.execute({ userId, password: 'senha-segura', newPassword: 'nova-senha-segura' });

    expect(verifyPassword).toHaveBeenCalledWith(userId, 'senha-segura');
    expect(updatePassword).toHaveBeenCalledWith(userId, 'nova-senha-segura');
  });

  it('rejects an incorrect current password without updating it', async () => {
    verifyPassword.mockResolvedValue(false);

    await expect(
      useCase.execute({ userId, password: 'senha-errada', newPassword: 'nova-senha-segura' })
    ).rejects.toBeInstanceOf(InvalidCurrentPasswordError);

    expect(updatePassword).not.toHaveBeenCalled();
  });
});
