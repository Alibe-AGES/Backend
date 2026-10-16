import {
  ExampleImageNotFoundError,
  GetExampleImageUseCase,
} from '../../../../src/modules/example/application/get-example-image.use-case';
import { Example } from '../../../../src/modules/example/domain/example.entity';
import { InMemoryExampleRepository } from '../../../helpers/in-memory-example.repository';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

const example = new Example({
  id: '550e8400-e29b-41d4-a716-446655440000',
  description: 'Example image',
  imageKey: 'examples/550e8400-e29b-41d4-a716-446655440000/image.png',
  createdAt: new Date('2026-08-30T00:00:00.000Z'),
});

describe('GetExampleImageUseCase', () => {
  it('returns an existing example image', async () => {
    const examples = new InMemoryExampleRepository();
    const storage = new InMemoryObjectStorage();
    const image = { bytes: Uint8Array.from([1]), contentType: 'image/png' };
    examples.set(example);
    await storage.save({ key: example.imageKey, ...image });
    const useCase = new GetExampleImageUseCase(examples, storage);

    await expect(useCase.execute(example.id)).resolves.toEqual(image);
  });

  it('reports an example that does not exist', async () => {
    const useCase = new GetExampleImageUseCase(
      new InMemoryExampleRepository(),
      new InMemoryObjectStorage()
    );

    await expect(useCase.execute(example.id)).rejects.toBeInstanceOf(ExampleImageNotFoundError);
  });

  it('reports an example image that does not exist', async () => {
    const examples = new InMemoryExampleRepository();
    examples.set(example);
    const useCase = new GetExampleImageUseCase(examples, new InMemoryObjectStorage());

    await expect(useCase.execute(example.id)).rejects.toBeInstanceOf(ExampleImageNotFoundError);
  });
});
