import {
  GetLocationUseCase,
  LocationNotFoundError,
} from '../../../../src/modules/locations/application/get-location.use-case';
import { mockPriceRange } from '../../../../src/modules/locations/application/mock-price-range';
import { FEATURE_FLAGS, FeatureFlags } from '../../../../src/shared/feature-flags/feature-flags';
import { PlacesProvider } from '../../../../src/shared/places/places-provider';
import { buildPlace } from '../../../helpers/place.fixture';

const PLACE_ID = 'ChIJN1t_tDeuEmsRUsoyG83frY4';

describe('GetLocationUseCase', () => {
  let places: jest.Mocked<PlacesProvider>;
  let featureFlags: jest.Mocked<FeatureFlags>;
  let useCase: GetLocationUseCase;

  beforeEach(() => {
    places = {
      searchNearby: jest.fn(),
      searchText: jest.fn(),
      getPlaceById: jest.fn(),
      getPhotoUrl: jest.fn(),
    };
    featureFlags = { isEnabled: jest.fn().mockResolvedValue(true) };
    useCase = new GetLocationUseCase(places, featureFlags);
  });

  it('looks the place up on the provider with the budget from Google', async () => {
    const place = buildPlace({
      externalId: PLACE_ID,
      priceRange: { start: { amount: 20, currencyCode: 'BRL' }, end: null },
    });
    places.getPlaceById.mockResolvedValue(place);

    await expect(useCase.execute(PLACE_ID)).resolves.toEqual(place);
    expect(featureFlags.isEnabled).toHaveBeenCalledWith(FEATURE_FLAGS.googlePlacesBudget);
    expect(places.getPlaceById).toHaveBeenCalledWith(PLACE_ID, { includePriceRange: true });
  });

  it('uses the mocked budget when the budget flag is disabled', async () => {
    featureFlags.isEnabled.mockResolvedValue(false);
    places.getPlaceById.mockResolvedValue(buildPlace({ externalId: PLACE_ID }));

    const place = await useCase.execute(PLACE_ID);

    expect(places.getPlaceById).toHaveBeenCalledWith(PLACE_ID, { includePriceRange: false });
    expect(place.priceRange).toEqual(mockPriceRange(PLACE_ID));
  });

  it('fails when the place does not exist', async () => {
    places.getPlaceById.mockResolvedValue(null);

    await expect(useCase.execute(PLACE_ID)).rejects.toBeInstanceOf(LocationNotFoundError);
  });
});
