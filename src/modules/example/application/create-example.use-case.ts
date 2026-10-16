import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Injectable } from '@nestjs/common';
import { ObjectStorage } from '../../../shared/storage/object-storage';
import { Example } from '../domain/example.entity';
import { ExampleRepository } from '../domain/example.repository';

export interface CreateExampleInput {
  description?: string;
  image: {
    originalName: string;
    contentType: string;
    bytes: Uint8Array;
  };
}

export class InvalidExampleError extends Error {}

@Injectable()
export class CreateExampleUseCase {
  constructor(
    private readonly examples: ExampleRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(input: CreateExampleInput): Promise<Example> {
    const description = input.description?.trim() ?? '';

    if (!description || description.length > 500) {
      throw new InvalidExampleError('Description must contain between 1 and 500 characters');
    }

    if (!input.image.contentType.startsWith('image/')) {
      throw new InvalidExampleError('Only image files are accepted');
    }

    const id = randomUUID();
    const extension = this.safeExtension(input.image.originalName);
    const imageKey = `examples/${id}/image${extension}`;

    await this.storage.save({
      key: imageKey,
      bytes: input.image.bytes,
      contentType: input.image.contentType,
    });

    try {
      return await this.examples.create({ id, description, imageKey });
    } catch (error) {
      await this.storage.delete(imageKey).catch(() => undefined);
      throw error;
    }
  }

  private safeExtension(originalName: string): string {
    const extension = extname(originalName).toLowerCase();
    return /^\.[a-z0-9]{1,10}$/.test(extension) ? extension : '';
  }
}
