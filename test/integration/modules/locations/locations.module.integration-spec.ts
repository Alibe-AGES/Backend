import { Test, TestingModule } from '@nestjs/testing';
import { GOOGLE_PLACES_API_KEY } from '../../../../src/infrastructure/api/google-places/google-places.config';
import { GooglePlacesService } from '../../../../src/infrastructure/api/google-places/google-places.service';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { ListCatalogLocationsUseCase } from '../../../../src/modules/locations/application/list-catalog-locations.use-case';
import { LocationRepository } from '../../../../src/modules/locations/domain/location.repository';
import { LocationsController } from '../../../../src/modules/locations/http/locations.controller';
import { LocationsModule } from '../../../../src/modules/locations/locations.module';
import { PrismaLocationRepository } from '../../../../src/modules/locations/persistence/prisma-location.repository';

describe('LocationsModule integration', () => {
  let module: TestingModule;
  let fetchMock: jest.SpyInstance;
  const findMany = jest.fn();
  const createManyAndReturn = jest.fn();

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [LocationsModule],
    })
      .overrideProvider(GOOGLE_PLACES_API_KEY)
      .useValue('test-key')
      .overrideProvider(PrismaService)
      .useValue({ location: { findMany, createManyAndReturn } })
      .compile();
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
    findMany.mockReset();
    createManyAndReturn.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('registers the controller, use case, Prisma repository and Google Places adapter', () => {
    expect(module.get(LocationsController)).toBeInstanceOf(LocationsController);
    expect(module.get(ListCatalogLocationsUseCase)).toBeInstanceOf(ListCatalogLocationsUseCase);
    expect(module.get(LocationRepository)).toBeInstanceOf(PrismaLocationRepository);
    expect(module.get(GooglePlacesService, { strict: false })).toBeInstanceOf(GooglePlacesService);
  });

  it('connects the use case to Google Places and the catalog repository', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          places: [
            { id: 'place-1', displayName: { text: 'Bloom Café' }, formattedAddress: 'Rua A' },
          ],
        }),
        { status: 200 }
      )
    );
    findMany.mockResolvedValue([]);
    createManyAndReturn.mockResolvedValue([{ id: 'location-id', externalId: 'place-1' }]);

    const result = await module.get(ListCatalogLocationsUseCase).execute({
      latitude: -30.0277,
      longitude: -51.2287,
      page: 1,
      limit: 20,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({ id: 'location-id', distanceMeters: null })
    );
    expect(createManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          {
            externalId: 'place-1',
            description: 'Bloom Café',
            address: 'Rua A',
            manuallyCreated: false,
          },
        ],
      })
    );
  });
});
