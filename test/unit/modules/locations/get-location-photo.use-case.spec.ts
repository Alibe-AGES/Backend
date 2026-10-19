import {
  DEFAULT_LOCATION_PHOTO_WIDTH_PX,
  GetLocationPhotoUseCase,
  LocationPhotoNotFoundError,
} from '../../../../src/modules/locations/application/get-location-photo.use-case';
import { PlacesProvider } from '../../../../src/shared/places/places-provider';

const PHOTO_NAME = 'places/place-1/photos/photo-1';

describe('GetLocationPhotoUseCase', () => {
  let places: jest.Mocked<PlacesProvider>;
  let useCase: GetLocationPhotoUseCase;

  beforeEach(() => {
    places = { searchNearby: jest.fn(), getPhotoUrl: jest.fn() };
    useCase = new GetLocationPhotoUseCase(places);
  });

  it('returns the public photo URL using the default width', async () => {
    places.getPhotoUrl.mockResolvedValue('https://lh3.googleusercontent.com/photo-1');

    await expect(useCase.execute(PHOTO_NAME)).resolves.toBe(
      'https://lh3.googleusercontent.com/photo-1'
    );
    expect(places.getPhotoUrl).toHaveBeenCalledWith(PHOTO_NAME, DEFAULT_LOCATION_PHOTO_WIDTH_PX);
  });

  it('forwards the requested width', async () => {
    places.getPhotoUrl.mockResolvedValue('https://lh3.googleusercontent.com/photo-1');

    await useCase.execute(PHOTO_NAME, 400);

    expect(places.getPhotoUrl).toHaveBeenCalledWith(PHOTO_NAME, 400);
  });

  it('fails when the photo cannot be resolved', async () => {
    places.getPhotoUrl.mockResolvedValue(null);

    await expect(useCase.execute(PHOTO_NAME)).rejects.toBeInstanceOf(LocationPhotoNotFoundError);
  });
});
