import {
  CreateGroupUseCase,
  InvalidGroupError,
} from '../../../../src/modules/groups/application/create-group.use-case';
import { GroupRepository } from '../../../../src/modules/groups/domain/group.repository';
import { InMemoryGroupRepository } from '../../../helpers/in-memory-group.repository';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

describe('CreateGroupUseCase', () => {
  it('saves the image and persists its key with the name', async () => {
    const groups = new InMemoryGroupRepository();
    const storage = new InMemoryObjectStorage();
    const useCase = new CreateGroupUseCase(groups, storage);
    const bytes = Uint8Array.from([1, 2, 3]);

    const result = await useCase.execute({
      name: 'Group of friends with image',
      image: {
        originalName: 'photo.PNG',
        contentType: 'image/png',
        bytes,
      },
    });

    expect(result.name).toBe('Group of friends with image');
    expect(result.profilePic).toMatch(new RegExp(`^groups/${result.id}/image\\.png$`));

    await expect(storage.findByKey(result.profilePic)).resolves.toEqual({
      bytes,
      contentType: 'image/png',
    });
    await expect(groups.findById(result.id)).resolves.toEqual(result);
  });

  it('saves the group without image', async () => {
    const groups = new InMemoryGroupRepository();
    const storage = new InMemoryObjectStorage();
    const useCase = new CreateGroupUseCase(groups, storage);

    const result = await useCase.execute({
      name: 'Group of friends with no image',
      image: null,
    });

    expect(result.name).toBe('Group of friends with no image');
    expect(result.profilePic).toBeNull();

    await expect(storage.findByKey(result.profilePic)).resolves.toBeNull();
    await expect(groups.findById(result.id)).resolves.toEqual(result);
  });

  it('rejects an empty or oversized name', async () => {
    const useCase = new CreateGroupUseCase(
      new InMemoryGroupRepository(),
      new InMemoryObjectStorage()
    );
    const image = {
      originalName: 'photo.png',
      contentType: 'image/png',
      bytes: Uint8Array.from([1]),
    };

    await expect(useCase.execute({ name: '   ', image })).rejects.toBeInstanceOf(InvalidGroupError);
    await expect(useCase.execute({ name: 'a'.repeat(501), image })).rejects.toBeInstanceOf(
      InvalidGroupError
    );
  });

  it('rejects a file that is not an image', async () => {
    const useCase = new CreateGroupUseCase(
      new InMemoryGroupRepository(),
      new InMemoryObjectStorage()
    );

    await expect(
      useCase.execute({
        name: 'Document',
        image: {
          originalName: 'document.txt',
          contentType: 'text/plain',
          bytes: Uint8Array.from([1]),
        },
      })
    ).rejects.toBeInstanceOf(InvalidGroupError);
  });

  it('removes the uploaded object when database persistence fails', async () => {
    const storage = new InMemoryObjectStorage();
    const error = new Error('Database unavailable');
    const groups = {
      create: jest.fn().mockRejectedValue(error),
      findById: jest.fn(),
    } as unknown as GroupRepository;
    const useCase = new CreateGroupUseCase(groups, storage);

    await expect(
      useCase.execute({
        name: 'Example',
        image: {
          originalName: 'photo.png',
          contentType: 'image/png',
          bytes: Uint8Array.from([1]),
        },
      })
    ).rejects.toBe(error);

    const profilePic = groups.create as jest.Mock;
    expect(profilePic).toHaveBeenCalledTimes(1);
    expect(storage.has(profilePic.mock.calls[0][0].profilePic)).toBe(false);
  });
});
