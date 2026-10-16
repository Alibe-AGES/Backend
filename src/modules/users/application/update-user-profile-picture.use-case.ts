import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ObjectStorage } from '../../../shared/storage/object-storage';
import { UserImageRepository } from '../domain/user-image.repository';

export const MAX_USER_PROFILE_PICTURE_SIZE_IN_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES = {
  'image/jpeg': {
    extension: '.jpg',
    matches: (bytes: Uint8Array) =>
      bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  'image/png': {
    extension: '.png',
    matches: (bytes: Uint8Array) => {
      const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
      return signature.every((value, index) => bytes[index] === value);
    },
  },
  'image/webp': {
    extension: '.webp',
    matches: (bytes: Uint8Array) =>
      bytes.length >= 12 &&
      Buffer.from(bytes.subarray(0, 4)).toString('ascii') === 'RIFF' &&
      Buffer.from(bytes.subarray(8, 12)).toString('ascii') === 'WEBP',
  },
} as const;

type SupportedImageType = keyof typeof IMAGE_TYPES;

export interface UpdateUserProfilePictureInput {
  userId: string;
  contentType: string;
  bytes: Uint8Array;
}

export interface UpdateUserProfilePictureOutput {
  profilePic: string;
}

export class InvalidUserProfilePictureError extends Error {}
export class UserNotFoundForProfilePictureError extends Error {}

@Injectable()
export class UpdateUserProfilePictureUseCase {
  constructor(
    private readonly users: UserImageRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(input: UpdateUserProfilePictureInput): Promise<UpdateUserProfilePictureOutput> {
    this.validate(input.contentType, input.bytes);

    const imageType = IMAGE_TYPES[input.contentType as SupportedImageType];
    const imageKey = `users/${input.userId}/profile-pictures/${randomUUID()}${imageType.extension}`;
    const profilePic = `/users/${input.userId}/profile-picture`;

    await this.storage.save({
      key: imageKey,
      bytes: input.bytes,
      contentType: input.contentType,
    });

    try {
      const updated = await this.users.updateProfilePicture(input.userId, imageKey);

      if (!updated) {
        throw new UserNotFoundForProfilePictureError('Usuário não encontrado');
      }

      if (updated.previousImageKey && updated.previousImageKey !== imageKey) {
        await this.storage.delete(updated.previousImageKey).catch(() => null);
      }

      return { profilePic };
    } catch (error) {
      await this.storage.delete(imageKey).catch(() => null);
      throw error;
    }
  }

  private validate(contentType: string, bytes: Uint8Array): void {
    const imageType = IMAGE_TYPES[contentType as SupportedImageType];

    if (!imageType) {
      throw new InvalidUserProfilePictureError('A imagem deve ser JPEG, PNG ou WebP');
    }

    if (bytes.byteLength === 0) {
      throw new InvalidUserProfilePictureError('A imagem não pode estar vazia');
    }

    if (bytes.byteLength > MAX_USER_PROFILE_PICTURE_SIZE_IN_BYTES) {
      throw new InvalidUserProfilePictureError('A imagem deve ter no máximo 5 MB');
    }

    if (!imageType.matches(bytes)) {
      throw new InvalidUserProfilePictureError(
        'O conteúdo do arquivo não corresponde ao formato informado'
      );
    }
  }
}
