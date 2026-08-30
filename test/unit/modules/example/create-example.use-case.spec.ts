import {
  CreateExampleUseCase,
  InvalidExampleError,
} from '../../../../src/modules/example/application/create-example.use-case';
import { ExampleRepository } from '../../../../src/modules/example/domain/example.repository';
import { InMemoryExampleRepository } from '../../../helpers/in-memory-example.repository';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

describe('CreateExampleUseCase', () => {
  it('saves the image and persists its key with the description', async () => {
    const examples = new InMemoryExampleRepository();
    const storage = new InMemoryObjectStorage();
    const useCase = new CreateExampleUseCase(examples, storage);
    const bytes = Uint8Array.from([1, 2, 3]);

    const result = await useCase.execute({
      description: '  Example image  ',
      image: {
        originalName: 'photo.PNG',
        contentType: 'image/png',
        bytes,
      },
    });

    expect(result.description).toBe('Example image');
    expect(result.imageKey).toMatch(new RegExp(`^examples/${result.id}/image\\.png$`));
    await expect(storage.findByKey(result.imageKey)).resolves.toEqual({
      bytes,
      contentType: 'image/png',
    });
    await expect(examples.findById(result.id)).resolves.toEqual(result);
  });

  it('rejects an empty or oversized description', async () => {
    const useCase = new CreateExampleUseCase(
      new InMemoryExampleRepository(),
      new InMemoryObjectStorage()
    );
    const image = {
      originalName: 'photo.png',
      contentType: 'image/png',
      bytes: Uint8Array.from([1]),
    };

    await expect(useCase.execute({ description: '   ', image })).rejects.toBeInstanceOf(
      InvalidExampleError
    );
    await expect(useCase.execute({ description: 'a'.repeat(501), image })).rejects.toBeInstanceOf(
      InvalidExampleError
    );
  });

  it('rejects a file that is not an image', async () => {
    const useCase = new CreateExampleUseCase(
      new InMemoryExampleRepository(),
      new InMemoryObjectStorage()
    );

    await expect(
      useCase.execute({
        description: 'Document',
        image: {
          originalName: 'document.txt',
          contentType: 'text/plain',
          bytes: Uint8Array.from([1]),
        },
      })
    ).rejects.toBeInstanceOf(InvalidExampleError);
  });

  it('removes the uploaded object when database persistence fails', async () => {
    const storage = new InMemoryObjectStorage();
    const error = new Error('Database unavailable');
    const examples = {
      create: jest.fn().mockRejectedValue(error),
      findById: jest.fn(),
    } as unknown as ExampleRepository;
    const useCase = new CreateExampleUseCase(examples, storage);

    await expect(
      useCase.execute({
        description: 'Example',
        image: {
          originalName: 'photo.png',
          contentType: 'image/png',
          bytes: Uint8Array.from([1]),
        },
      })
    ).rejects.toBe(error);

    const imageKey = examples.create as jest.Mock;
    expect(imageKey).toHaveBeenCalledTimes(1);
    expect(storage.has(imageKey.mock.calls[0][0].imageKey)).toBe(false);
  });
});
