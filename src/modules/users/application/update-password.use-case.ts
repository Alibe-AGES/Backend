import { Injectable } from '@nestjs/common';
import { UserProfileRepository } from '../domain/user-profile.repository';

export class InvalidCurrentPasswordError extends Error {}

export interface UpdatePasswordInput {
  userId: string;
  password: string;
  newPassword: string;
}

@Injectable()
export class UpdatePasswordUseCase {
  constructor(private readonly users: UserProfileRepository) {}

  async execute(input: UpdatePasswordInput): Promise<void> {
    const isCurrentPassword = await this.users.verifyPassword(input.userId, input.password);

    if (!isCurrentPassword) {
      throw new InvalidCurrentPasswordError('Senha atual incorreta');
    }

    await this.users.updatePassword(input.userId, input.newPassword);
  }
}
