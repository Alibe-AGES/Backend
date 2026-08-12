import { Injectable } from '@nestjs/common';
import { ExampleRepository } from '../domain/example.repository';

export interface GetExampleOutput {
  message: string;
}

@Injectable()
export class GetExampleUseCase {
  constructor(private readonly examples: ExampleRepository) {}

  async execute(): Promise<GetExampleOutput> {
    const example = await this.examples.get();

    return { message: example.message };
  }
}
