import { SearchCatalogLocationsUseCase } from '../../../../src/modules/locations/application/search-catalog-locations.use-case';
import {
  CatalogLocationsPageService,
  InvalidLocationSearchError,
} from '../../../../src/modules/locations/application/services/catalog-locations-page.service';
import { LocationRepository } from '../../../../src/modules/locations/domain/location.repository';
import { FeatureFlags } from '../../../../src/shared/feature-flags/feature-flags';
import { PlacesProvider } from '../../../../src/shared/places/places-provider';
import { buildPlace } from '../../../helpers/place.fixture';

const coordinates = { latitude: -30.0277, longitude: -51.2287 };

describe('SearchCatalogLocationsUseCase', () => {
  let places: jest.Mocked<PlacesProvider>;
  let locations: jest.Mocked<LocationRepository>;
  let featureFlags: jest.Mocked<FeatureFlags>;
  let useCase: SearchCatalogLocationsUseCase;

  beforeEach(() => {
    places = {
      searchNearby: jest.fn(),
      searchText: jest.fn(),
      getPhotoUrl: jest.fn(),
    };
    locations = {
      ensureCatalogLocations: jest.fn(
        async (items) => new Map(items.map((item) => [item.externalId, `id-${item.externalId}`]))
      ),
    };
    featureFlags = { isEnabled: jest.fn().mockResolvedValue(true) };
    useCase = new SearchCatalogLocationsUseCase(
      places,
      new CatalogLocationsPageService(locations, featureFlags)
    );
  });

  it('searches by text biased around the user and registers the page in the catalog', async () => {
    places.searchText.mockResolvedValue([buildPlace({ externalId: 'a' })]);

    const result = await useCase.execute({
      ...coordinates,
      page: 1,
      limit: 20,
      text: 'pizza vegana',
      type: 'restaurant',
    });

    expect(places.searchText).toHaveBeenCalledWith({
      textQuery: 'pizza vegana',
      center: coordinates,
      radiusMeters: 50_000,
      includedType: 'restaurant',
      includePriceRange: true,
    });
    expect(places.searchNearby).not.toHaveBeenCalled();
    expect(locations.ensureCatalogLocations).toHaveBeenCalledWith([
      expect.objectContaining({ externalId: 'a' }),
    ]);
    expect(result).toEqual({
      items: [
        { id: 'id-a', place: expect.objectContaining({ externalId: 'a' }), distanceMeters: 2705 },
      ],
      page: 1,
      limit: 20,
      total: 1,
    });
  });

  it('drops results beyond the requested distance but keeps places without location', async () => {
    places.searchText.mockResolvedValue([
      buildPlace({ externalId: 'near' }),
      buildPlace({ externalId: 'far', location: { latitude: -29.68, longitude: -51.13 } }),
      buildPlace({ externalId: 'unknown', location: null }),
    ]);

    const result = await useCase.execute({
      ...coordinates,
      page: 1,
      limit: 20,
      maxDistanceKm: 5,
      text: 'pizza',
    });

    expect(places.searchText).toHaveBeenCalledWith(expect.objectContaining({ radiusMeters: 5000 }));
    expect(result.items.map((item) => item.place.externalId)).toEqual(['near', 'unknown']);
    expect(result.total).toBe(2);
  });

  it('keeps far results when no distance limit is requested', async () => {
    places.searchText.mockResolvedValue([
      buildPlace({ externalId: 'far', location: { latitude: -23.55, longitude: -46.63 } }),
    ]);

    const result = await useCase.execute({ ...coordinates, page: 1, limit: 20, text: 'pizza' });

    expect(result.total).toBe(1);
  });

  it('rejects a minimum budget greater than the maximum before searching', async () => {
    await expect(
      useCase.execute({
        ...coordinates,
        page: 1,
        limit: 20,
        text: 'pizza',
        budgetMin: 100,
        budgetMax: 10,
      })
    ).rejects.toBeInstanceOf(InvalidLocationSearchError);
    expect(places.searchText).not.toHaveBeenCalled();
  });
});
