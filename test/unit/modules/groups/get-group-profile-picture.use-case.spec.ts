import {
  GetGroupProfilePictureUseCase,
  GroupImageAccessDeniedError,
  GroupNotFoundError,
  GroupProfilePictureNotFoundError,
} from '../../../../src/modules/groups/application/get-group-profile-picture.use-case';
import { GroupRepository } from '../../../../src/modules/groups/domain/group.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';

const GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const IMAGE_KEY = `groups/${GROUP_ID}/profile-picture.png`;

describe('GetGroupProfilePictureUseCase', () => {
  let groups: jest.Mocked<GroupRepository>;
  let storage: jest.Mocked<ObjectStorage>;
  let useCase: GetGroupProfilePictureUseCase;

  beforeEach(() => {
    groups = {
      create: jest.fn(),
      findById: jest.fn(),
      findDetailsById: jest.fn(),
      findByUserId: jest.fn(),
      createInviteLink: jest.fn(),
      findLatestInviteLinkByGroupId: jest.fn(),
      findProfilePictureAccess: jest.fn(),
    };
    storage = {
      save: jest.fn(),
      findByKey: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new GetGroupProfilePictureUseCase(groups, storage);
  });

  it('returns the image when the authenticated user belongs to the group', async () => {
    const image = {
      bytes: Uint8Array.from([137, 80, 78, 71]),
      contentType: 'image/png',
    };
    groups.findProfilePictureAccess.mockResolvedValue({
      imageKey: IMAGE_KEY,
      userIsMember: true,
    });
    storage.findByKey.mockResolvedValue(image);

    await expect(useCase.execute(GROUP_ID, USER_ID)).resolves.toEqual(image);
    expect(groups.findProfilePictureAccess).toHaveBeenCalledWith(GROUP_ID, USER_ID);
    expect(storage.findByKey).toHaveBeenCalledWith(IMAGE_KEY);
  });

  it('reports a group that does not exist', async () => {
    groups.findProfilePictureAccess.mockResolvedValue(null);

    await expect(useCase.execute(GROUP_ID, USER_ID)).rejects.toBeInstanceOf(GroupNotFoundError);
    expect(storage.findByKey).not.toHaveBeenCalled();
  });

  it('denies access when the authenticated user is not a group member', async () => {
    groups.findProfilePictureAccess.mockResolvedValue({
      imageKey: IMAGE_KEY,
      userIsMember: false,
    });

    await expect(useCase.execute(GROUP_ID, USER_ID)).rejects.toBeInstanceOf(
      GroupImageAccessDeniedError
    );
    expect(storage.findByKey).not.toHaveBeenCalled();
  });

  it('reports a group without a profile picture', async () => {
    groups.findProfilePictureAccess.mockResolvedValue({
      imageKey: null,
      userIsMember: true,
    });

    await expect(useCase.execute(GROUP_ID, USER_ID)).rejects.toBeInstanceOf(
      GroupProfilePictureNotFoundError
    );
    expect(storage.findByKey).not.toHaveBeenCalled();
  });

  it('reports an object that no longer exists in storage', async () => {
    groups.findProfilePictureAccess.mockResolvedValue({
      imageKey: IMAGE_KEY,
      userIsMember: true,
    });
    storage.findByKey.mockResolvedValue(null);

    await expect(useCase.execute(GROUP_ID, USER_ID)).rejects.toBeInstanceOf(
      GroupProfilePictureNotFoundError
    );
  });
});
