import {
  ExampleNotFoundError,
  GetExampleUseCase,
} from '../../../../src/modules/example/application/get-example.use-case';
import { Example } from '../../../../src/modules/example/domain/example.entity';
import { InMemoryExampleRepository } from '../../../helpers/in-memory-example.repository';

describe('GetExampleUseCase', () => {
  it('returns the example provided by the repository', async () => {
    const examples = new InMemoryExampleRepository();
    const example = new Example({
      id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'Example image',
      imageKey: 'examples/550e8400-e29b-41d4-a716-446655440000/image.png',
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
    });
    examples.set(example);
    const useCase = new GetExampleUseCase(examples);

    await expect(useCase.execute(example.id)).resolves.toEqual(example);
  });

  it('reports an example that does not exist', async () => {
    const useCase = new GetExampleUseCase(new InMemoryExampleRepository());

    await expect(useCase.execute('550e8400-e29b-41d4-a716-446655440000')).rejects.toBeInstanceOf(
      ExampleNotFoundError
    );
  });
});
