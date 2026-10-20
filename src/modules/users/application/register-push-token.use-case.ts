import { Injectable } from '@nestjs/common';
import { UserProfileRepository } from '../domain/user-profile.repository';

export interface RegisterPushTokenInput {
  userId: string;
  token: string;
}

@Injectable()
export class RegisterPushTokenUseCase {
  constructor(private readonly users: UserProfileRepository) {}

  async execute(input: RegisterPushTokenInput): Promise<void> {
    await this.users.updateExpoPushToken(input.userId, input.token);
  }
}
