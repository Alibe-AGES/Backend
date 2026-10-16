import {
  InvalidUserProfilePictureError,
  UpdateUserProfilePictureUseCase,
  UserNotFoundForProfilePictureError,
} from '../../../../src/modules/users/application/update-user-profile-picture.use-case';
import { UserImageRepository } from '../../../../src/modules/users/domain/user-image.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const PROFILE_PICTURE_URL = `/users/${USER_ID}/profile-picture`;
const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('UpdateUserProfilePictureUseCase', () => {
  let users: jest.Mocked<UserImageRepository>;
  let storage: jest.Mocked<ObjectStorage>;
  let useCase: UpdateUserProfilePictureUseCase;

  beforeEach(() => {
    users = {
      findProfilePictureAccess: jest.fn(),
      updateProfilePicture: jest.fn(),
    };
    storage = {
      save: jest.fn(),
      findByKey: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new UpdateUserProfilePictureUseCase(users, storage);
  });

  it('stores the image and updates the profile picture key', async () => {
    users.updateProfilePicture.mockResolvedValue({ previousImageKey: null });

    await expect(
      useCase.execute({
        userId: USER_ID,
        contentType: 'image/png',
        bytes: PNG_BYTES,
      })
    ).resolves.toEqual({ profilePic: PROFILE_PICTURE_URL });

    const imageKey = savedImageKey();
    expect(imageKey).toMatch(
      new RegExp(`^users/${USER_ID}/profile-pictures/[0-9a-f-]{36}\\.png$`, 'i')
    );
    expect(storage.save).toHaveBeenCalledWith({
      key: imageKey,
      bytes: PNG_BYTES,
      contentType: 'image/png',
    });
    expect(users.updateProfilePicture).toHaveBeenCalledWith(USER_ID, imageKey);
  });

  it('removes the previous object after replacing the profile picture', async () => {
    const previousImageKey = `users/${USER_ID}/profile-pictures/previous.png`;
    users.updateProfilePicture.mockResolvedValue({ previousImageKey });

    await useCase.execute({
      userId: USER_ID,
      contentType: 'image/png',
      bytes: PNG_BYTES,
    });

    expect(storage.delete).toHaveBeenCalledWith(previousImageKey);
  });

  it.each([
    {
      contentType: 'text/plain',
      bytes: PNG_BYTES,
    },
    {
      contentType: 'image/png',
      bytes: Uint8Array.from([1, 2, 3]),
    },
  ])('rejects an invalid image', async ({ contentType, bytes }) => {
    await expect(
      useCase.execute({
        userId: USER_ID,
        contentType,
        bytes,
      })
    ).rejects.toBeInstanceOf(InvalidUserProfilePictureError);

    expect(storage.save).not.toHaveBeenCalled();
    expect(users.updateProfilePicture).not.toHaveBeenCalled();
  });

  it('removes the uploaded object when the user does not exist', async () => {
    users.updateProfilePicture.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId: USER_ID,
        contentType: 'image/png',
        bytes: PNG_BYTES,
      })
    ).rejects.toBeInstanceOf(UserNotFoundForProfilePictureError);

    expect(storage.delete).toHaveBeenCalledWith(savedImageKey());
  });

  it('removes the uploaded object when persistence fails', async () => {
    users.updateProfilePicture.mockRejectedValue(new Error('database unavailable'));

    await expect(
      useCase.execute({
        userId: USER_ID,
        contentType: 'image/png',
        bytes: PNG_BYTES,
      })
    ).rejects.toThrow('database unavailable');

    expect(storage.delete).toHaveBeenCalledWith(savedImageKey());
  });

  function savedImageKey(): string {
    return storage.save.mock.calls[0][0].key;
  }
});
