import { Example } from './example.entity';

export abstract class ExampleRepository {
  abstract get(): Promise<Example>;
}
