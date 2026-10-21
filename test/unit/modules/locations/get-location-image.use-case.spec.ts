import {
  GetLocationImageUseCase,
  LocationForImageNotFoundError,
  LocationImageAccessDeniedError,
  LocationImageNotFoundError,
} from '../../../../src/modules/locations/application/get-location-image.use-case';
import { LocationRepository } from '../../../../src/modules/locations/domain/location.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';

const LOCATION_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const IMAGE_KEY = `locations/${LOCATION_ID}/images/location.png`;

describe('GetLocationImageUseCase', () => {
  let locations: jest.Mocked<LocationRepository>;
  let storage: jest.Mocked<ObjectStorage>;
  let useCase: GetLocationImageUseCase;

  beforeEach(() => {
    locations = {
      findImageAccess: jest.fn(),
    } as unknown as jest.Mocked<LocationRepository>;
    storage = { save: jest.fn(), findByKey: jest.fn(), delete: jest.fn() };
    useCase = new GetLocationImageUseCase(locations, storage);
  });

  it('returns the image to a member of a group that uses the location', async () => {
    const image = { bytes: Uint8Array.from([137, 80, 78, 71]), contentType: 'image/png' };
    locations.findImageAccess.mockResolvedValue({ imageKey: IMAGE_KEY, userIsMember: true });
    storage.findByKey.mockResolvedValue(image);

    await expect(useCase.execute(LOCATION_ID, USER_ID)).resolves.toEqual(image);
    expect(locations.findImageAccess).toHaveBeenCalledWith(LOCATION_ID, USER_ID);
    expect(storage.findByKey).toHaveBeenCalledWith(IMAGE_KEY);
  });

  it('reports an unknown location', async () => {
    locations.findImageAccess.mockResolvedValue(null);
    await expect(useCase.execute(LOCATION_ID, USER_ID)).rejects.toBeInstanceOf(
      LocationForImageNotFoundError
    );
  });

  it('denies a user outside every group that uses the location', async () => {
    locations.findImageAccess.mockResolvedValue({ imageKey: IMAGE_KEY, userIsMember: false });
    await expect(useCase.execute(LOCATION_ID, USER_ID)).rejects.toBeInstanceOf(
      LocationImageAccessDeniedError
    );
  });

  it('reports a location without an image', async () => {
    locations.findImageAccess.mockResolvedValue({ imageKey: null, userIsMember: true });
    await expect(useCase.execute(LOCATION_ID, USER_ID)).rejects.toBeInstanceOf(
      LocationImageNotFoundError
    );
    expect(storage.findByKey).not.toHaveBeenCalled();
  });

  it('reports an image missing from object storage', async () => {
    locations.findImageAccess.mockResolvedValue({ imageKey: IMAGE_KEY, userIsMember: true });
    storage.findByKey.mockResolvedValue(null);
    await expect(useCase.execute(LOCATION_ID, USER_ID)).rejects.toBeInstanceOf(
      LocationImageNotFoundError
    );
  });
});
