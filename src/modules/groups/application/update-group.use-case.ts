import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ObjectStorage } from '../../../shared/storage/object-storage';
import { safeExtension } from '../../../shared/utils';
import { GroupManagementError, GroupRepository, UpdateGroupData } from '../domain/group.repository';
import { InvalidGroupError } from './create-group.use-case';

export interface UpdateGroupInput {
  groupId: string;
  userId: string;
  name?: string;
  removeProfilePicture?: boolean;
  image?: { originalName: string; contentType: string; bytes: Uint8Array };
}

@Injectable()
export class UpdateGroupUseCase {
  constructor(
    private readonly groups: GroupRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(input: UpdateGroupInput) {
    const current = await this.groups.findManagementState(input.groupId);
    if (!current) throw new GroupManagementError('not-found', 'Grupo não encontrado');
    if (current.ownerId !== input.userId) {
      throw new GroupManagementError('forbidden', 'Somente o owner pode editar o grupo');
    }
    const data: UpdateGroupData = {};
    if (input.name !== undefined) {
      data.name = input.name.trim();
      if (data.name.length < 2 || data.name.length > 100) {
        throw new InvalidGroupError('Nome deve conter entre 2 e 100 caracteres');
      }
    }
    if (input.removeProfilePicture && input.image) {
      throw new InvalidGroupError('Envie uma imagem ou solicite sua remoção');
    }
    if (input.removeProfilePicture) data.profilePic = null;
    let imageKey: string | undefined;
    if (input.image) {
      const extension = safeExtension(input.image.originalName);
      if (
        !input.image.contentType.startsWith('image/') ||
        !extension ||
        !input.image.bytes.byteLength ||
        input.image.bytes.byteLength > 5 * 1024 * 1024
      ) {
        throw new InvalidGroupError('Imagem inválida ou maior que 5 MB');
      }
      imageKey = `groups/${input.groupId}/${randomUUID()}${extension}`;
      data.profilePic = imageKey;
    }
    if (!Object.keys(data).length)
      throw new InvalidGroupError('Informe um nome, imagem ou remoção da imagem');
    if (imageKey) {
      await this.storage.save({
        key: imageKey,
        bytes: input.image.bytes,
        contentType: input.image.contentType,
      });
    }
    try {
      const { group, previousImageKey } = await this.groups.updateOwned(
        input.groupId,
        input.userId,
        data
      );
      if (data.profilePic !== undefined && previousImageKey && previousImageKey !== imageKey) {
        await this.storage.delete(previousImageKey).catch(() => null);
      }
      return group;
    } catch (error) {
      if (imageKey) await this.storage.delete(imageKey).catch(() => null);
      throw error;
    }
  }
}
