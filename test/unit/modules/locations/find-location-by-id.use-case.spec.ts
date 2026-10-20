import { FindLocationByIdUseCase } from '../../../../src/modules/locations/application/find-location-by-id.use-case';
import { LocationNotFoundError } from '../../../../src/modules/locations/application/get-location.use-case';
import { LocationRepository } from '../../../../src/modules/locations/domain/location.repository';

const LOCATION_ID = '0b6f3c1e-8a2d-4f7b-9c1e-2d3f4a5b6c7d';

describe('FindLocationByIdUseCase', () => {
  let locations: jest.Mocked<LocationRepository>;
  let useCase: FindLocationByIdUseCase;

  beforeEach(() => {
    locations = { findById: jest.fn() };
    useCase = new FindLocationByIdUseCase(locations);
  });

  it('returns the location stored with the internal id', async () => {
    const location = {
      id: LOCATION_ID,
      externalId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
      description: 'Café com ambiente tranquilo',
      address: 'Rua Padre Chagas, 320',
      manuallyCreated: false,
    };
    locations.findById.mockResolvedValue(location);

    await expect(useCase.execute(LOCATION_ID)).resolves.toEqual(location);
    expect(locations.findById).toHaveBeenCalledWith(LOCATION_ID);
  });

  it('fails when no location has the id', async () => {
    locations.findById.mockResolvedValue(null);

    await expect(useCase.execute(LOCATION_ID)).rejects.toBeInstanceOf(LocationNotFoundError);
  });
});
