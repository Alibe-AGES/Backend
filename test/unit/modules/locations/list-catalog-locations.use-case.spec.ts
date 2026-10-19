import {
  InvalidLocationSearchError,
  ListCatalogLocationsUseCase,
} from '../../../../src/modules/locations/application/list-catalog-locations.use-case';
import { mockPriceRange } from '../../../../src/modules/locations/application/mock-price-range';
import { LocationRepository } from '../../../../src/modules/locations/domain/location.repository';
import { FEATURE_FLAGS, FeatureFlags } from '../../../../src/shared/feature-flags/feature-flags';
import { PlacesProvider } from '../../../../src/shared/places/places-provider';
import { buildPlace } from '../../../helpers/place.fixture';

const coordinates = { latitude: -30.0277, longitude: -51.2287 };
const brl = (amount: number) => ({ amount, currencyCode: 'BRL' });

describe('ListCatalogLocationsUseCase', () => {
  let places: jest.Mocked<PlacesProvider>;
  let locations: jest.Mocked<LocationRepository>;
  let featureFlags: jest.Mocked<FeatureFlags>;
  let useCase: ListCatalogLocationsUseCase;

  beforeEach(() => {
    places = {
      searchNearby: jest.fn(),
      getPhotoUrl: jest.fn(),
    };
    locations = {
      findById: jest.fn(),
      ensureCatalogLocations: jest.fn(
        async (items) => new Map(items.map((item) => [item.externalId, `id-${item.externalId}`]))
      ),
    };
    featureFlags = { isEnabled: jest.fn().mockResolvedValue(true) };
    useCase = new ListCatalogLocationsUseCase(places, locations, featureFlags);
  });

  it('searches around the user, filters, paginates and registers the page in the catalog', async () => {
    places.searchNearby.mockResolvedValue([
      buildPlace({ externalId: 'a', goodForGroups: true }),
      buildPlace({ externalId: 'b', goodForGroups: false }),
      buildPlace({ externalId: 'c', goodForGroups: true, summary: null, location: null }),
      buildPlace({ externalId: 'd', goodForGroups: true }),
    ]);

    const result = await useCase.execute({
      ...coordinates,
      page: 2,
      limit: 2,
      maxDistanceKm: 5,
      groupSize: 'large',
      type: 'restaurant',
    });

    expect(places.searchNearby).toHaveBeenCalledWith({
      center: coordinates,
      radiusMeters: 5000,
      includedTypes: ['restaurant'],
      includePriceRange: true,
    });
    expect(locations.ensureCatalogLocations).toHaveBeenCalledWith([
      { externalId: 'd', description: 'Café com ambiente tranquilo', address: expect.any(String) },
    ]);
    expect(result).toEqual({
      items: [
        {
          id: 'id-d',
          place: expect.objectContaining({ externalId: 'd' }),
          distanceMeters: 2705,
        },
      ],
      page: 2,
      limit: 2,
      total: 3,
    });
    expect(places.getPhotoUrl).not.toHaveBeenCalled();
  });

  it('uses the maximum radius and the place name as fallback description', async () => {
    places.searchNearby.mockResolvedValue([buildPlace({ summary: null, location: null })]);

    const result = await useCase.execute({ ...coordinates, page: 1, limit: 20 });

    expect(places.searchNearby).toHaveBeenCalledWith(
      expect.objectContaining({ radiusMeters: 50_000, includedTypes: undefined })
    );
    expect(locations.ensureCatalogLocations).toHaveBeenCalledWith([
      expect.objectContaining({ description: 'Bloom Café' }),
    ]);
    expect(result.items[0].distanceMeters).toBeNull();
  });

  it('keeps the budget from the provider when the budget flag is enabled', async () => {
    const priceRange = { start: brl(20), end: brl(40) };
    places.searchNearby.mockResolvedValue([buildPlace({ priceRange })]);

    const result = await useCase.execute({ ...coordinates, page: 1, limit: 20 });

    expect(featureFlags.isEnabled).toHaveBeenCalledWith(FEATURE_FLAGS.googlePlacesBudget);
    expect(result.items[0].place.priceRange).toEqual(priceRange);
  });

  it('does not request the budget and uses mocked values when the budget flag is disabled', async () => {
    featureFlags.isEnabled.mockResolvedValue(false);
    places.searchNearby.mockResolvedValue([buildPlace({ externalId: 'a' })]);
    const mocked = mockPriceRange('a');

    const result = await useCase.execute({ ...coordinates, page: 1, limit: 20 });

    expect(places.searchNearby).toHaveBeenCalledWith(
      expect.objectContaining({ includePriceRange: false })
    );
    expect(result.items[0].place.priceRange).toEqual(mocked);

    const outOfBudget = await useCase.execute({
      ...coordinates,
      page: 1,
      limit: 20,
      budgetMax: (mocked.start?.amount as number) - 1,
    });
    expect(outOfBudget.total).toBe(0);
  });

  it('rejects a minimum budget greater than the maximum', async () => {
    await expect(
      useCase.execute({ ...coordinates, page: 1, limit: 20, budgetMin: 100, budgetMax: 10 })
    ).rejects.toBeInstanceOf(InvalidLocationSearchError);
    expect(places.searchNearby).not.toHaveBeenCalled();
  });
});
