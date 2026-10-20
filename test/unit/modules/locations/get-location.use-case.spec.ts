import {
  GetLocationUseCase,
  LocationNotFoundError,
} from '../../../../src/modules/locations/application/get-location.use-case';
import { LocationRepository } from '../../../../src/modules/locations/domain/location.repository';

const LOCATION_ID = '0b6f3c1e-8a2d-4f7b-9c1e-2d3f4a5b6c7d';

describe('GetLocationUseCase', () => {
  let locations: jest.Mocked<LocationRepository>;
  let useCase: GetLocationUseCase;

  beforeEach(() => {
    locations = { findById: jest.fn(), ensureCatalogLocations: jest.fn() };
    useCase = new GetLocationUseCase(locations);
  });

  it('returns the location found by id', async () => {
    const location = {
      id: LOCATION_ID,
      externalId: 'place-001',
      description: 'Café com ambiente tranquilo e mesas externas',
      address: 'Rua Padre Chagas, 320 - Moinhos de Vento, Porto Alegre - RS',
      manuallyCreated: false,
    };
    locations.findById.mockResolvedValue(location);

    await expect(useCase.execute(LOCATION_ID)).resolves.toEqual(location);
    expect(locations.findById).toHaveBeenCalledWith(LOCATION_ID);
  });

  it('fails when the location does not exist', async () => {
    locations.findById.mockResolvedValue(null);

    await expect(useCase.execute(LOCATION_ID)).rejects.toBeInstanceOf(LocationNotFoundError);
  });
});
