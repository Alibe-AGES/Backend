import { Injectable } from '@nestjs/common';
import { ObjectStorage, type StoredObject } from '../../../shared/storage/object-storage';
import { UserImageRepository } from '../domain/user-image.repository';

export class UserNotFoundError extends Error {}

export class UserImageAccessDeniedError extends Error {}

export class UserProfilePictureNotFoundError extends Error {}

@Injectable()
export class GetUserProfilePictureUseCase {
  constructor(
    private readonly users: UserImageRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(targetUserId: string, requesterUserId: string): Promise<StoredObject> {
    const access = await this.users.findProfilePictureAccess(targetUserId, requesterUserId);

    if (!access) {
      throw new UserNotFoundError('User not found');
    }

    if (!access.requesterCanAccess) {
      throw new UserImageAccessDeniedError('User cannot access this profile picture');
    }

    if (!access.imageKey) {
      throw new UserProfilePictureNotFoundError('User profile picture not found');
    }

    const image = await this.storage.findByKey(access.imageKey);

    if (!image) {
      throw new UserProfilePictureNotFoundError('User profile picture not found');
    }

    return image;
  }
}
