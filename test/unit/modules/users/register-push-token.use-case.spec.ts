import { RegisterPushTokenUseCase } from '../../../../src/modules/users/application/register-push-token.use-case';
import { UserProfileRepository } from '../../../../src/modules/users/domain/user-profile.repository';

describe('RegisterPushTokenUseCase', () => {
  it('registers the token for the authenticated user', async () => {
    const updateExpoPushToken = jest.fn().mockResolvedValue(undefined);
    const repository = { updateExpoPushToken } as unknown as UserProfileRepository;
    const useCase = new RegisterPushTokenUseCase(repository);

    await useCase.execute({
      userId: '11111111-1111-4111-8111-111111111111',
      token: 'ExpoPushToken[test-token]',
    });

    expect(updateExpoPushToken).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'ExpoPushToken[test-token]'
    );
  });
});
