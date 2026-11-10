import { Injectable } from '@nestjs/common';
import { UserProfileRepository, type UpdatedUserProfile } from '../domain/user-profile.repository';

export class UserNotFoundForProfileUpdateError extends Error {}

export interface UpdateUserProfileInput {
  userId: string;
  name: string;
}

@Injectable()
export class UpdateUserProfileUseCase {
  constructor(private readonly users: UserProfileRepository) {}

  async execute(input: UpdateUserProfileInput): Promise<UpdatedUserProfile> {
    const updated = await this.users.updateName(input.userId, input.name);

    if (!updated) {
      throw new UserNotFoundForProfileUpdateError('Usuário não encontrado');
    }

    return updated;
  }
}
