import { Example } from '../../src/modules/example/domain/example.entity';
import {
  ExampleRepository,
  type CreateExampleData,
} from '../../src/modules/example/domain/example.repository';

export class InMemoryExampleRepository extends ExampleRepository {
  private readonly examples = new Map<string, Example>();

  create(data: CreateExampleData): Promise<Example> {
    const example = new Example({
      ...data,
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
    });

    this.examples.set(example.id, example);
    return Promise.resolve(example);
  }

  findById(id: string): Promise<Example | null> {
    return Promise.resolve(this.examples.get(id) ?? null);
  }

  set(example: Example): void {
    this.examples.set(example.id, example);
  }
}
