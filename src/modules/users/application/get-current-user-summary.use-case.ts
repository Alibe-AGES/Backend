import { Injectable } from '@nestjs/common';
import { UserProfileRepository } from '../domain/user-profile.repository';

export class CurrentUserNotFoundError extends Error {}

@Injectable()
export class GetCurrentUserSummaryUseCase {
  constructor(private readonly users: UserProfileRepository) {}

  async execute(userId: string) {
    const summary = await this.users.findCurrentUserSummary(userId, new Date());

    if (!summary) {
      throw new CurrentUserNotFoundError('Authenticated user not found');
    }

    return summary;
  }
}
