import { Injectable } from '@nestjs/common';
import { Example } from '../domain/example.entity';
import { ExampleRepository } from '../domain/example.repository';

@Injectable()
export class InMemoryExampleRepository extends ExampleRepository {
  get(): Promise<Example> {
    return Promise.resolve(
      new Example({ message: 'Example module is working' }),
    );
  }
}
