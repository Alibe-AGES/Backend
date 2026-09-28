import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaUserImageRepository } from '../../../../src/modules/users/persistence/prisma-user-image.repository';

const TARGET_USER_ID = '22222222-2222-4222-8222-222222222222';
const REQUESTER_USER_ID = '11111111-1111-4111-8111-111111111111';
const IMAGE_KEY = `users/${TARGET_USER_ID}/profile-picture.png`;

describe('PrismaUserImageRepository integration', () => {
  let findUnique: jest.Mock;
  let repository: PrismaUserImageRepository;
  let update: jest.Mock;

  beforeEach(() => {
    findUnique = jest.fn();
    update = jest.fn();
    repository = new PrismaUserImageRepository({
      user: { findUnique, update },
    } as unknown as PrismaService);
  });

  it('queries the profile picture and shared membership together', async () => {
    findUnique.mockResolvedValue({
      profilePic: IMAGE_KEY,
      groups: [{ groupId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }],
    });

    await expect(
      repository.findProfilePictureAccess(TARGET_USER_ID, REQUESTER_USER_ID)
    ).resolves.toEqual({
      imageKey: IMAGE_KEY,
      requesterCanAccess: true,
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: TARGET_USER_ID },
      select: {
        profilePic: true,
        groups: {
          where: {
            group: {
              users: {
                some: { userId: REQUESTER_USER_ID },
              },
            },
          },
          select: { groupId: true },
          take: 1,
        },
      },
    });
  });

  it('allows a user to access their own profile picture', async () => {
    findUnique.mockResolvedValue({
      profilePic: IMAGE_KEY,
      groups: [],
    });

    await expect(
      repository.findProfilePictureAccess(REQUESTER_USER_ID, REQUESTER_USER_ID)
    ).resolves.toEqual({
      imageKey: IMAGE_KEY,
      requesterCanAccess: true,
    });
  });

  it('denies users who do not share a group', async () => {
    findUnique.mockResolvedValue({
      profilePic: IMAGE_KEY,
      groups: [],
    });

    await expect(
      repository.findProfilePictureAccess(TARGET_USER_ID, REQUESTER_USER_ID)
    ).resolves.toEqual({
      imageKey: IMAGE_KEY,
      requesterCanAccess: false,
    });
  });

  it('returns null when the target user does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      repository.findProfilePictureAccess(TARGET_USER_ID, REQUESTER_USER_ID)
    ).resolves.toBeNull();
  });

  it('updates profilePic and returns the previous storage key', async () => {
    const newImageKey = `users/${TARGET_USER_ID}/profile-pictures/new.png`;
    findUnique.mockResolvedValue({ profilePic: IMAGE_KEY });
    update.mockResolvedValue({});

    await expect(repository.updateProfilePicture(TARGET_USER_ID, newImageKey)).resolves.toEqual({
      previousImageKey: IMAGE_KEY,
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: TARGET_USER_ID },
      select: { profilePic: true },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: TARGET_USER_ID },
      data: { profilePic: newImageKey },
    });
  });

  it('does not update profilePic when the user does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      repository.updateProfilePicture(
        TARGET_USER_ID,
        `users/${TARGET_USER_ID}/profile-pictures/new.png`
      )
    ).resolves.toBeNull();
    expect(update).not.toHaveBeenCalled();
  });
});
