import { Injectable } from '@nestjs/common';
import { Example } from '../domain/example.entity';
import { ExampleRepository } from '../domain/example.repository';

export class ExampleNotFoundError extends Error {}

@Injectable()
export class GetExampleUseCase {
  constructor(private readonly examples: ExampleRepository) {}

  async execute(id: string): Promise<Example> {
    const example = await this.examples.findById(id);

    if (!example) {
      throw new ExampleNotFoundError('Example not found');
    }

    return example;
  }
}
