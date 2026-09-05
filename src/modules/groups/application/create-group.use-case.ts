import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ObjectStorage } from '../../../shared/storage/object-storage';
import { Group } from '../domain/group.entity';
import { GroupRepository } from '../domain/group.repository';
import { GroupListItemResponseDto } from '../http/dto/group-list-item-response.dto';

export interface CreateGroupInput {
  name: string;
  image?: {
    originalName: string;
    contentType: string;
    bytes: Uint8Array;
  };
}

export class InvalidGroupError extends Error {}

@Injectable()
export class CreateGroupUseCase {
  constructor(
    private readonly groups: GroupRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(input: CreateGroupInput): Promise<Group> {
    const name = input.name?.trim() ?? '';

    if (!name || name.length > 500) {
      throw new InvalidGroupError('Nome deve conter entre 1 e 500 caracteres');
    }

    const id = randomUUID();
    let extension = null;
    let profilePic = null;

    if (input.image) {
      if (!input.image.contentType.startsWith('image/')) {
        throw new InvalidGroupError('Somente imagens são aceitas');
      }

      extension = this.safeExtension(input.image.originalName);
      profilePic = `groups/${id}/image${extension}`;
    }

    if (profilePic) {
      await this.storage.save({
        key: profilePic,
        bytes: input.image.bytes,
        contentType: input.image.contentType,
      });
    }

    try {
      const createdAt = new Date();
      return await this.groups.create({ id, name, profilePic, createdAt });
    } catch (error) {
      await this.storage.delete(profilePic).catch(() => null);
      throw error;
    }
  }

  private safeExtension(originalName: string): string {
    const extension = extname(originalName).toLowerCase();
    return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : '';
  }
}
