import {
  GetUserProfilePictureUseCase,
  UserImageAccessDeniedError,
  UserNotFoundError,
  UserProfilePictureNotFoundError,
} from '../../../../src/modules/users/application/get-user-profile-picture.use-case';
import { UserImageRepository } from '../../../../src/modules/users/domain/user-image.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';

const TARGET_USER_ID = '22222222-2222-4222-8222-222222222222';
const REQUESTER_USER_ID = '11111111-1111-4111-8111-111111111111';
const IMAGE_KEY = `users/${TARGET_USER_ID}/profile-picture.png`;

describe('GetUserProfilePictureUseCase', () => {
  let users: jest.Mocked<UserImageRepository>;
  let storage: jest.Mocked<ObjectStorage>;
  let useCase: GetUserProfilePictureUseCase;

  beforeEach(() => {
    users = {
      findProfilePictureAccess: jest.fn(),
    };
    storage = {
      save: jest.fn(),
      findByKey: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new GetUserProfilePictureUseCase(users, storage);
  });

  it('returns the image when the requester is allowed to see it', async () => {
    const image = {
      bytes: Uint8Array.from([137, 80, 78, 71]),
      contentType: 'image/png',
    };
    users.findProfilePictureAccess.mockResolvedValue({
      imageKey: IMAGE_KEY,
      requesterCanAccess: true,
    });
    storage.findByKey.mockResolvedValue(image);

    await expect(useCase.execute(TARGET_USER_ID, REQUESTER_USER_ID)).resolves.toEqual(image);
    expect(users.findProfilePictureAccess).toHaveBeenCalledWith(TARGET_USER_ID, REQUESTER_USER_ID);
    expect(storage.findByKey).toHaveBeenCalledWith(IMAGE_KEY);
  });

  it('reports a target user that does not exist', async () => {
    users.findProfilePictureAccess.mockResolvedValue(null);

    await expect(useCase.execute(TARGET_USER_ID, REQUESTER_USER_ID)).rejects.toBeInstanceOf(
      UserNotFoundError
    );
    expect(storage.findByKey).not.toHaveBeenCalled();
  });

  it('denies access when users do not share a group', async () => {
    users.findProfilePictureAccess.mockResolvedValue({
      imageKey: IMAGE_KEY,
      requesterCanAccess: false,
    });

    await expect(useCase.execute(TARGET_USER_ID, REQUESTER_USER_ID)).rejects.toBeInstanceOf(
      UserImageAccessDeniedError
    );
    expect(storage.findByKey).not.toHaveBeenCalled();
  });

  it('reports a user without a profile picture', async () => {
    users.findProfilePictureAccess.mockResolvedValue({
      imageKey: null,
      requesterCanAccess: true,
    });

    await expect(useCase.execute(TARGET_USER_ID, REQUESTER_USER_ID)).rejects.toBeInstanceOf(
      UserProfilePictureNotFoundError
    );
    expect(storage.findByKey).not.toHaveBeenCalled();
  });

  it('reports an object that no longer exists in storage', async () => {
    users.findProfilePictureAccess.mockResolvedValue({
      imageKey: IMAGE_KEY,
      requesterCanAccess: true,
    });
    storage.findByKey.mockResolvedValue(null);

    await expect(useCase.execute(TARGET_USER_ID, REQUESTER_USER_ID)).rejects.toBeInstanceOf(
      UserProfilePictureNotFoundError
    );
  });
});
