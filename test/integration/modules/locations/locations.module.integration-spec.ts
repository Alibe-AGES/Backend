import { Test, TestingModule } from '@nestjs/testing';
import { GOOGLE_PLACES_API_KEY } from '../../../../src/infrastructure/api/google-places/google-places.config';
import {
  GOOGLE_PLACES_API_BASE_URL,
  GOOGLE_PLACES_SEARCH_NEARBY_URL,
  GOOGLE_PLACES_SEARCH_TEXT_URL,
  GooglePlacesService,
} from '../../../../src/infrastructure/api/google-places/google-places.service';
import { PrismaFeatureFlagsService } from '../../../../src/infrastructure/feature-flags/prisma-feature-flags.service';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { GetLocationUseCase } from '../../../../src/modules/locations/application/get-location.use-case';
import { GetLocationPhotoUseCase } from '../../../../src/modules/locations/application/get-location-photo.use-case';
import { ListCatalogLocationsUseCase } from '../../../../src/modules/locations/application/list-catalog-locations.use-case';
import { SearchCatalogLocationsUseCase } from '../../../../src/modules/locations/application/search-catalog-locations.use-case';
import { mockPriceRange } from '../../../../src/modules/locations/application/mock-price-range';
import { LocationsController } from '../../../../src/modules/locations/http/locations.controller';
import { LocationsModule } from '../../../../src/modules/locations/locations.module';
import { FeatureFlags } from '../../../../src/shared/feature-flags/feature-flags';

const PHOTO_NAME = 'places/place-1/photos/photo-1';
const PHOTO_URI = 'https://lh3.googleusercontent.com/photo-1';

describe('LocationsModule integration', () => {
  let module: TestingModule;
  let fetchMock: jest.SpyInstance;
  const findUniqueFlag = jest.fn();

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [LocationsModule],
    })
      .overrideProvider(GOOGLE_PLACES_API_KEY)
      .useValue('test-key')
      .overrideProvider(PrismaService)
      .useValue({ featureFlag: { findUnique: findUniqueFlag } })
      .compile();
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const place = {
        id: 'place-1',
        displayName: { text: 'Bloom Café' },
        formattedAddress: 'Rua A',
        photos: [{ name: PHOTO_NAME }],
      };
      const body =
        String(url) === GOOGLE_PLACES_SEARCH_NEARBY_URL ||
        String(url) === GOOGLE_PLACES_SEARCH_TEXT_URL
          ? { places: [place] }
          : String(url).includes('/media')
            ? { name: PHOTO_NAME, photoUri: PHOTO_URI }
            : place;

      return new Response(JSON.stringify(body), { status: 200 });
    });
    findUniqueFlag.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers the controller, use cases and Google Places adapter', () => {
    expect(module.get(LocationsController)).toBeInstanceOf(LocationsController);
    expect(module.get(ListCatalogLocationsUseCase)).toBeInstanceOf(ListCatalogLocationsUseCase);
    expect(module.get(SearchCatalogLocationsUseCase)).toBeInstanceOf(SearchCatalogLocationsUseCase);
    expect(module.get(GooglePlacesService, { strict: false })).toBeInstanceOf(GooglePlacesService);
    expect(module.get(FeatureFlags, { strict: false })).toBeInstanceOf(PrismaFeatureFlagsService);
  });

  it('connects Google Places and the disabled budget flag without persisting the page', async () => {
    findUniqueFlag.mockResolvedValue({ enabled: false });

    const result = await module.get(ListCatalogLocationsUseCase).execute({
      latitude: -30.0277,
      longitude: -51.2287,
      page: 1,
      limit: 20,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual(expect.objectContaining({ distanceMeters: null }));
    expect(result.items[0].place.photoName).toBe(PHOTO_NAME);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.items[0].place.priceRange).toEqual(mockPriceRange('place-1'));
    expect(findUniqueFlag).toHaveBeenCalledWith(
      expect.objectContaining({ where: { key: 'google_places_budget' } })
    );

    const searchInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect((searchInit.headers as Record<string, string>)['X-Goog-FieldMask']).not.toContain(
      'places.priceRange'
    );
  });

  it('requests the budget from Google when the flag is enabled', async () => {
    findUniqueFlag.mockResolvedValue({ enabled: true });

    const result = await module.get(ListCatalogLocationsUseCase).execute({
      latitude: -30.0277,
      longitude: -51.2287,
      page: 1,
      limit: 20,
    });

    const searchInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect((searchInit.headers as Record<string, string>)['X-Goog-FieldMask']).toContain(
      'places.priceRange'
    );
    expect(result.items[0].place.priceRange).toBeNull();
  });

  it('connects the text search to Google Places Text Search', async () => {
    findUniqueFlag.mockResolvedValue({ enabled: true });

    const result = await module.get(SearchCatalogLocationsUseCase).execute({
      latitude: -30.0277,
      longitude: -51.2287,
      page: 1,
      limit: 20,
      text: 'café',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(GOOGLE_PLACES_SEARCH_TEXT_URL);
    expect(JSON.parse(init.body as string)).toEqual(expect.objectContaining({ textQuery: 'café' }));
    expect(result.items[0].place.externalId).toBe('place-1');
  });

  it('connects the photo use case to the Google Places media route', async () => {
    await expect(module.get(GetLocationPhotoUseCase).execute(PHOTO_NAME)).resolves.toBe(PHOTO_URI);
    expect(String(fetchMock.mock.calls[0][0])).toContain(`${PHOTO_NAME}/media`);
  });

  it('connects the get location use case to Google Place Details', async () => {
    findUniqueFlag.mockResolvedValue({ enabled: true });

    const place = await module.get(GetLocationUseCase).execute('place-1');

    expect(place).toEqual(expect.objectContaining({ externalId: 'place-1', name: 'Bloom Café' }));
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toContain(`${GOOGLE_PLACES_API_BASE_URL}/places/place-1?`);
    expect((init.headers as Record<string, string>)['X-Goog-FieldMask']).toContain('priceRange');
  });
});
