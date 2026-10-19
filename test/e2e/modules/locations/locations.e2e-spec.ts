import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { LocationRepository } from '../../../../src/modules/locations/domain/location.repository';
import { FeatureFlags } from '../../../../src/shared/feature-flags/feature-flags';
import {
  PlacesProvider,
  PlacesProviderUnavailableError,
} from '../../../../src/shared/places/places-provider';
import { buildPlace } from '../../../helpers/place.fixture';

const LOCATION_ID = '0b6f3c1e-8a2d-4f7b-9c1e-2d3f4a5b6c7d';

describe('Locations endpoint (e2e)', () => {
  let app: INestApplication;
  const searchNearby = jest.fn();
  const getPhotoUrl = jest.fn();
  const isEnabled = jest.fn();
  const ensureCatalogLocations = jest.fn();
  const previousMockAuthEnabled = process.env.MOCK_AUTH_ENABLED;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-local-media')
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(PlacesProvider)
      .useValue({ searchNearby, getPhotoUrl })
      .overrideProvider(FeatureFlags)
      .useValue({ isEnabled })
      .overrideProvider(LocationRepository)
      .useValue({ ensureCatalogLocations })
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    setupApplication(app);
    await app.init();
  });

  afterAll(async () => {
    if (previousMockAuthEnabled === undefined) {
      delete process.env.MOCK_AUTH_ENABLED;
    } else {
      process.env.MOCK_AUTH_ENABLED = previousMockAuthEnabled;
    }

    await app.close();
  });

  beforeEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
    searchNearby.mockReset();
    getPhotoUrl.mockReset().mockResolvedValue('https://lh3.googleusercontent.com/photo-1');
    isEnabled.mockReset().mockResolvedValue(true);
    ensureCatalogLocations.mockReset();
    ensureCatalogLocations.mockResolvedValue(new Map([['place-1', LOCATION_ID]]));
  });

  it('returns the page of nearby catalog locations', async () => {
    searchNearby.mockResolvedValue([
      buildPlace({
        priceRange: {
          start: { amount: 20, currencyCode: 'BRL' },
          end: { amount: 100, currencyCode: 'BRL' },
        },
        openingHours: { weekdayDescriptions: ['domingo: Fechado'], periods: [] },
        photoName: 'places/place-1/photos/photo-1',
      }),
    ]);

    const response = await request(app.getHttpServer())
      .get('/api/locations')
      .query({ latitude: -30.0277, longitude: -51.2287, maxDistanceKm: 5, period: 'morning' })
      .expect(200);

    expect(searchNearby).toHaveBeenCalledWith(
      expect.objectContaining({
        center: { latitude: -30.0277, longitude: -51.2287 },
        radiusMeters: 5000,
      })
    );
    expect(response.body).toEqual({
      items: [
        expect.objectContaining({
          id: LOCATION_ID,
          externalId: 'place-1',
          name: 'Bloom Café',
          imageUrl: '/api/locations/photos?name=places%2Fplace-1%2Fphotos%2Fphoto-1',
          description: 'Café com ambiente tranquilo',
          address: 'Rua Padre Chagas, 320 - Moinhos de Vento, Porto Alegre - RS',
          distanceMeters: 2705,
          priceRange: { start: 20, end: 100, currencyCode: 'BRL' },
          openingHours: ['domingo: Fechado'],
        }),
      ],
      page: 1,
      limit: 20,
      total: 1,
    });
  });

  it('returns mocked budgets when the Google Places budget flag is disabled', async () => {
    isEnabled.mockResolvedValue(false);
    searchNearby.mockResolvedValue([buildPlace()]);

    const response = await request(app.getHttpServer())
      .get('/api/locations')
      .query({ latitude: -30.0277, longitude: -51.2287 })
      .expect(200);

    expect(searchNearby).toHaveBeenCalledWith(
      expect.objectContaining({ includePriceRange: false })
    );
    expect(response.body.items[0]).toEqual(
      expect.objectContaining({
        imageUrl: null,
        priceRange: {
          start: expect.any(Number),
          end: expect.any(Number),
          currencyCode: 'BRL',
        },
      })
    );
    expect(getPhotoUrl).not.toHaveBeenCalled();
  });

  it('redirects the feed image URL to the public Google photo', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/locations/photos?name=places%2Fplace-1%2Fphotos%2Fphoto-1&maxWidthPx=400')
      .expect(302);

    expect(response.headers.location).toBe('https://lh3.googleusercontent.com/photo-1');
    expect(response.headers['cache-control']).toBe('private, max-age=3600');
    expect(getPhotoUrl).toHaveBeenCalledWith('places/place-1/photos/photo-1', 400);
  });

  it('validates the photo name and returns 404 for unresolved photos', async () => {
    await request(app.getHttpServer())
      .get('/api/locations/photos')
      .query({ name: 'places/../../v1/places:searchNearby' })
      .expect(400);
    expect(getPhotoUrl).not.toHaveBeenCalled();

    getPhotoUrl.mockResolvedValue(null);
    await request(app.getHttpServer())
      .get('/api/locations/photos')
      .query({ name: 'places/place-1/photos/missing' })
      .expect(404);
  });

  it('validates coordinates, pagination and filters', async () => {
    await request(app.getHttpServer())
      .get('/api/locations')
      .query({ longitude: -51.2287 })
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/locations')
      .query({ latitude: -30, longitude: -51, limit: 50, period: 'dawn' })
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/locations')
      .query({ latitude: -30, longitude: -51, budgetMin: 100, budgetMax: 10 })
      .expect(400);

    expect(searchNearby).not.toHaveBeenCalled();
  });

  it('returns 503 when Google Places is unavailable', async () => {
    searchNearby.mockRejectedValue(new PlacesProviderUnavailableError('down'));

    await request(app.getHttpServer())
      .get('/api/locations')
      .query({ latitude: -30, longitude: -51 })
      .expect(503);
  });

  it('requires an authenticated session', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

    await request(app.getHttpServer())
      .get('/api/locations')
      .query({ latitude: -30, longitude: -51 })
      .expect(401);
  });
});
