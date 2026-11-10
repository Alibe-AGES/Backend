import {
  UpdateGroupUseCase,
  UpdateGroupInput,
} from '../../../../src/modules/groups/application/update-group.use-case';
import { InvalidGroupError } from '../../../../src/modules/groups/application/create-group.use-case';
import {
  GroupManagementError,
  GroupRepository,
} from '../../../../src/modules/groups/domain/group.repository';
import { Group } from '../../../../src/modules/groups/domain/group.entity';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

describe('UpdateGroupUseCase', () => {
  const current = new Group({
    id: 'group',
    name: 'Original',
    profilePic: 'groups/old.png',
    createdAt: new Date(),
  });
  const input = { groupId: current.id, userId: 'owner' };
  const image = {
    originalName: 'photo.png',
    contentType: 'image/png',
    bytes: new Uint8Array([137, 80, 78, 71]),
  };
  let findManagementState: jest.Mock;
  let updateOwned: jest.Mock;
  let storage: InMemoryObjectStorage;
  let useCase: UpdateGroupUseCase;

  beforeEach(async () => {
    findManagementState = jest
      .fn()
      .mockResolvedValue({ ownerId: 'owner', profilePic: current.profilePic });
    updateOwned = jest.fn().mockImplementation(async (_groupId, _ownerId, data) => ({
      group: new Group({ ...current, ...data }),
      previousImageKey: current.profilePic,
    }));
    storage = new InMemoryObjectStorage();
    await storage.save({ key: current.profilePic, ...image });
    useCase = new UpdateGroupUseCase(
      { findManagementState, updateOwned } as unknown as GroupRepository,
      storage
    );
  });

  it('trims the name and preserves the current image when it is omitted', async () => {
    const group = await useCase.execute({ ...input, name: '  Novo nome  ' });
    expect(group.name).toBe('Novo nome');
    expect(group.profilePic).toBe(current.profilePic);
    expect(storage.has(current.profilePic)).toBe(true);
  });

  it('replaces the image under a new key and removes the previous object after persistence', async () => {
    const group = await useCase.execute({ ...input, image });
    expect(group.profilePic).not.toBe(current.profilePic);
    expect(storage.has(group.profilePic)).toBe(true);
    expect(storage.has(current.profilePic)).toBe(false);
  });

  it('removes the image without requiring a replacement', async () => {
    const group = await useCase.execute({ ...input, removeProfilePicture: true });
    expect(group.profilePic).toBeNull();
    expect(storage.has(current.profilePic)).toBe(false);
  });

  it.each([null, { ownerId: 'someone-else', profilePic: current.profilePic }])(
    'rejects absent groups and non-owners before uploading (%p)',
    async (state) => {
      findManagementState.mockResolvedValue(state);
      const save = jest.spyOn(storage, 'save');
      await expect(useCase.execute({ ...input, image })).rejects.toBeInstanceOf(
        GroupManagementError
      );
      expect(save).not.toHaveBeenCalled();
      expect(updateOwned).not.toHaveBeenCalled();
    }
  );

  it.each<Partial<UpdateGroupInput>>([
    {},
    { name: ' ' },
    { name: 'a'.repeat(101) },
    { image, removeProfilePicture: true },
    { image: { ...image, contentType: 'application/pdf' } },
    { image: { ...image, originalName: 'bad.exe' } },
    { image: { ...image, bytes: new Uint8Array() } },
    { image: { ...image, bytes: new Uint8Array(5 * 1024 * 1024 + 1) } },
  ])('rejects invalid edits without modifying storage or persistence', async (change) => {
    const save = jest.spyOn(storage, 'save');
    await expect(useCase.execute({ ...input, ...change })).rejects.toBeInstanceOf(
      InvalidGroupError
    );
    expect(save).not.toHaveBeenCalled();
    expect(updateOwned).not.toHaveBeenCalled();
  });

  it('cleans only the new upload if persistence fails or ownership changes', async () => {
    updateOwned.mockRejectedValue(new GroupManagementError('forbidden', 'Owner changed'));
    const save = jest.spyOn(storage, 'save');
    await expect(useCase.execute({ ...input, image })).rejects.toBeInstanceOf(GroupManagementError);
    expect(storage.has(save.mock.calls[0][0].key)).toBe(false);
    expect(storage.has(current.profilePic)).toBe(true);
  });

  it('does not persist an image if upload fails', async () => {
    jest.spyOn(storage, 'save').mockRejectedValue(new Error('Storage unavailable'));
    await expect(useCase.execute({ ...input, image })).rejects.toThrow('Storage unavailable');
    expect(updateOwned).not.toHaveBeenCalled();
    expect(storage.has(current.profilePic)).toBe(true);
  });
});
