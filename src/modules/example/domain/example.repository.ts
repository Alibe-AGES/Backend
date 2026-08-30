import { Example } from './example.entity';

export interface CreateExampleData {
  id: string;
  description: string;
  imageKey: string;
}

export abstract class ExampleRepository {
  abstract create(data: CreateExampleData): Promise<Example>;

  abstract findById(id: string): Promise<Example | null>;
}
