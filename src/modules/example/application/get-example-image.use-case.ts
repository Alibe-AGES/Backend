import { Injectable } from '@nestjs/common';
import { ObjectStorage, type StoredObject } from '../../../shared/storage/object-storage';
import { ExampleRepository } from '../domain/example.repository';

export class ExampleImageNotFoundError extends Error {}

@Injectable()
export class GetExampleImageUseCase {
  constructor(
    private readonly examples: ExampleRepository,
    private readonly storage: ObjectStorage
  ) {}

  async execute(exampleId: string): Promise<StoredObject> {
    const example = await this.examples.findById(exampleId);

    if (!example) {
      throw new ExampleImageNotFoundError('Example image not found');
    }

    const image = await this.storage.findByKey(example.imageKey);

    if (!image) {
      throw new ExampleImageNotFoundError('Example image not found');
    }

    return image;
  }
}
