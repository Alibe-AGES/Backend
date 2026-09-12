import {
  GroupNotFoundError,
  GetGroupUseCase,
} from '../../../../src/modules/groups/application/get-group.use-case';
import { GroupRepository } from '../../../../src/modules/groups/domain/group.repository';

const groupId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const details = {
  id: groupId,
  name: 'Amigos da faculdade',
  profilePic: `groups/${groupId}/image.png`,
  createdAt: new Date('2026-08-01T15:00:00.000Z'),
  participants: [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Ana Souza',
      profilePic: 'users/ana/image.jpg',
    },
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: null,
      profilePic: null,
    },
  ],
  nextEvent: {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Jantar da turma',
    timeslot: new Date('2026-09-05T20:00:00.000Z'),
    status: 'confirmed' as const,
  },
};

describe('GetGroupUseCase', () => {
  it('returns the group details with participant and event data', async () => {
    const findDetailsById = jest.fn().mockResolvedValue(details);
    const repository = { findDetailsById } as unknown as GroupRepository;
    const useCase = new GetGroupUseCase(repository);

    await expect(useCase.execute(groupId)).resolves.toEqual({
      ...details,
      profilePic: `/groups/${groupId}/profile-picture`,
      participants: [details.participants[0], { ...details.participants[1], name: '' }],
    });
    expect(findDetailsById).toHaveBeenCalledWith(groupId);
  });

  it('returns null image and next event when they are not available', async () => {
    const findDetailsById = jest.fn().mockResolvedValue({
      ...details,
      profilePic: null,
      nextEvent: null,
    });
    const repository = { findDetailsById } as unknown as GroupRepository;
    const useCase = new GetGroupUseCase(repository);

    await expect(useCase.execute(groupId)).resolves.toEqual({
      ...details,
      profilePic: null,
      participants: [details.participants[0], { ...details.participants[1], name: '' }],
      nextEvent: null,
    });
  });

  it('reports a group that does not exist', async () => {
    const repository = {
      findDetailsById: jest.fn().mockResolvedValue(null),
    } as unknown as GroupRepository;
    const useCase = new GetGroupUseCase(repository);

    await expect(useCase.execute(groupId)).rejects.toBeInstanceOf(GroupNotFoundError);
  });
});
