import { Injectable } from '@nestjs/common';
import { ObjectStorage, type StoredObject } from '../../../shared/storage/object-storage';
import { GroupRepository } from '../domain/group.repository';

export class GroupNotFoundError extends Error {}

export class GroupImageAccessDeniedError extends Error {}

export class GroupProfilePictureNotFoundError extends Error {}

@Injectable()
export class GetGroupProfilePictureUseCase {
  constructor(
    private readonly groups: GroupRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(groupId: string, userId: string): Promise<StoredObject> {
    const access = await this.groups.findProfilePictureAccess(groupId, userId);

    if (!access) {
      throw new GroupNotFoundError('Group not found');
    }

    if (!access.userIsMember) {
      throw new GroupImageAccessDeniedError('User does not belong to this group');
    }

    if (!access.imageKey) {
      throw new GroupProfilePictureNotFoundError('Group profile picture not found');
    }

    const image = await this.storage.findByKey(access.imageKey);

    if (!image) {
      throw new GroupProfilePictureNotFoundError('Group profile picture not found');
    }

    return image;
  }
}
