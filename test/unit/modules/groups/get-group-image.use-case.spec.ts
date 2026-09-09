import {
  GetGroupImageUseCase,
  GroupImageNotFoundError,
} from '../../../../src/modules/groups/application/get-group-image.use-case';
import { Group } from '../../../../src/modules/groups/domain/group.entity';
import { InMemoryGroupRepository } from '../../../helpers/in-memory-group.repository';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

const group = new Group({
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Amigos da faculdade',
  profilePic: 'groups/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/image.png',
  createdAt: new Date('2026-08-01T15:00:00.000Z'),
});

describe('GetGroupImageUseCase', () => {
  it('returns an existing group image using the persisted token', async () => {
    const groups = new InMemoryGroupRepository();
    const storage = new InMemoryObjectStorage();
    const image = { bytes: Uint8Array.from([1, 2, 3]), contentType: 'image/png' };
    await groups.create({ ...group, creatorId: '11111111-1111-4111-8111-111111111111' });
    await storage.save({ key: group.profilePic!, ...image });
    const useCase = new GetGroupImageUseCase(groups, storage);

    await expect(useCase.execute(group.id)).resolves.toEqual(image);
  });

  it('reports a group that does not exist', async () => {
    const useCase = new GetGroupImageUseCase(
      new InMemoryGroupRepository(),
      new InMemoryObjectStorage()
    );

    await expect(useCase.execute(group.id)).rejects.toBeInstanceOf(GroupImageNotFoundError);
  });

  it('reports a group image that does not exist', async () => {
    const groups = new InMemoryGroupRepository();
    await groups.create({ ...group, creatorId: '11111111-1111-4111-8111-111111111111' });
    const useCase = new GetGroupImageUseCase(groups, new InMemoryObjectStorage());

    await expect(useCase.execute(group.id)).rejects.toBeInstanceOf(GroupImageNotFoundError);
  });
});
