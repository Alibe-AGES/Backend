import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ObjectStorage } from '../../../shared/storage/object-storage';
import { Group } from '../domain/group.entity';
import { GroupRepository } from '../domain/group.repository';

export interface CreateGroupInput {
  name: string;
  image?: {
    originalName: string;
    contentType: string;
    bytes: Uint8Array;
  };
  creatorId: string;
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
      const creatorId = input.creatorId;
      const createdAt = new Date();
      return await this.groups.create({ id, name, profilePic, createdAt, creatorId });
    } catch (error) {
      if (profilePic) {
        await this.storage.delete(profilePic).catch(() => null);
      }

      throw error;
    }
  }

  private safeExtension(originalName: string): string {
    const extension = extname(originalName).toLowerCase();

    const allowedExtensions = new Set(['.jpg', '.png', '.webp', '.jpeg', '.svg']);

    if (!allowedExtensions.has(extension)) {
      throw new InvalidGroupError('Extensão inválida para imagem');
    }

    return extension;
  }
}
