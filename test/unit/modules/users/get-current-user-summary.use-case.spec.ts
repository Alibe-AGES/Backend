import {
  CurrentUserNotFoundError,
  GetCurrentUserSummaryUseCase,
} from '../../../../src/modules/users/application/get-current-user-summary.use-case';
import { UserProfileRepository } from '../../../../src/modules/users/domain/user-profile.repository';

describe('GetCurrentUserSummaryUseCase', () => {
  it('returns the summary for the authenticated user', async () => {
    const summary = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Ana Beatriz Silva',
      email: 'ana.silva@example.com',
      createdAt: new Date('2026-09-01T12:00:00.000Z'),
      image: null,
      completedEvents: 8,
      eventsInDecision: 2,
    };
    const users = {
      findCurrentUserSummary: jest.fn().mockResolvedValue(summary),
    } as unknown as UserProfileRepository;
    const useCase = new GetCurrentUserSummaryUseCase(users);

    await expect(useCase.execute(summary.id)).resolves.toEqual(summary);
    expect(users.findCurrentUserSummary).toHaveBeenCalledWith(summary.id, expect.any(Date));
  });

  it('reports when the authenticated user no longer exists', async () => {
    const users = {
      findCurrentUserSummary: jest.fn().mockResolvedValue(null),
    } as unknown as UserProfileRepository;
    const useCase = new GetCurrentUserSummaryUseCase(users);

    await expect(useCase.execute('11111111-1111-4111-8111-111111111111')).rejects.toBeInstanceOf(
      CurrentUserNotFoundError
    );
  });
});
