import { Injectable } from '@nestjs/common';
import { ObjectStorage, type StoredObject } from '../../../shared/storage/object-storage';
import { GroupRepository } from '../domain/group.repository';

export class GroupImageNotFoundError extends Error {}

@Injectable()
export class GetGroupImageUseCase {
  constructor(
    private readonly groups: GroupRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(groupId: string): Promise<StoredObject> {
    const group = await this.groups.findById(groupId);

    if (!group?.profilePic) {
      throw new GroupImageNotFoundError('Group image not found');
    }

    const image = await this.storage.findByKey(group.profilePic);

    if (!image) {
      throw new GroupImageNotFoundError('Group image not found');
    }

    return image;
  }
}
