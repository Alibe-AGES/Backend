import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaGroupRepository } from '../../../../src/modules/groups/persistence/group.prisma.repository';

const GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const IMAGE_KEY = `groups/${GROUP_ID}/profile-picture.png`;

describe('PrismaGroupRepository profile picture integration', () => {
  let findUnique: jest.Mock;
  let repository: PrismaGroupRepository;

  beforeEach(() => {
    findUnique = jest.fn();
    repository = new PrismaGroupRepository({
      group: { findUnique },
    } as unknown as PrismaService);
  });

  it('queries the group image and membership together', async () => {
    findUnique.mockResolvedValue({
      profilePic: IMAGE_KEY,
      users: [{ userId: USER_ID }],
    });

    await expect(repository.findProfilePictureAccess(GROUP_ID, USER_ID)).resolves.toEqual({
      imageKey: IMAGE_KEY,
      userIsMember: true,
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: GROUP_ID },
      select: {
        profilePic: true,
        users: {
          where: { userId: USER_ID },
          select: { userId: true },
          take: 1,
        },
      },
    });
  });

  it('reports an existing group when the user is not a member', async () => {
    findUnique.mockResolvedValue({
      profilePic: IMAGE_KEY,
      users: [],
    });

    await expect(repository.findProfilePictureAccess(GROUP_ID, USER_ID)).resolves.toEqual({
      imageKey: IMAGE_KEY,
      userIsMember: false,
    });
  });

  it('returns null when the group does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(repository.findProfilePictureAccess(GROUP_ID, USER_ID)).resolves.toBeNull();
  });
});
