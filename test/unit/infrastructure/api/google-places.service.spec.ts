import { getGooglePlacesApiKey } from '../../../../src/infrastructure/api/google-places/google-places.config';
import {
  GOOGLE_PLACES_SEARCH_NEARBY_URL,
  GooglePlacesService,
} from '../../../../src/infrastructure/api/google-places/google-places.service';
import { PlacesProviderUnavailableError } from '../../../../src/shared/places/places-provider';

const center = { latitude: -30.0277, longitude: -51.2287 };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('GooglePlacesService', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads the API key from the environment', () => {
    expect(getGooglePlacesApiKey({ GOOGLE_PLACES_API_KEY: ' key ' })).toBe('key');
    expect(getGooglePlacesApiKey({ GOOGLE_PLACES_API_KEY: ' ' })).toBeNull();
    expect(getGooglePlacesApiKey({})).toBeNull();
  });

  it('fails without calling Google when the API key is missing', async () => {
    const service = new GooglePlacesService(null);

    await expect(service.searchNearby({ center, radiusMeters: 5000 })).rejects.toBeInstanceOf(
      PlacesProviderUnavailableError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a nearby search clamped to Google limits and maps the places', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        places: [
          {
            id: 'place-1',
            displayName: { text: 'Bloom Café' },
            formattedAddress: 'Rua Padre Chagas, 320',
            location: { latitude: -30.02, longitude: -51.2 },
            rating: 4.5,
            userRatingCount: 10,
            priceLevel: 'PRICE_LEVEL_MODERATE',
            priceRange: {
              startPrice: { currencyCode: 'BRL', units: '20' },
              endPrice: { currencyCode: 'BRL', units: '100', nanos: 500_000_000 },
            },
            nationalPhoneNumber: '(51) 3333-3333',
            websiteUri: 'https://bloom.example',
            types: ['cafe'],
            primaryType: 'cafe',
            regularOpeningHours: {
              weekdayDescriptions: ['segunda-feira: 09:00–18:00'],
              periods: [{ open: { day: 1, hour: 9 }, close: { day: 1, hour: 18 } }, { open: {} }],
            },
            editorialSummary: { text: 'Café tranquilo' },
            outdoorSeating: true,
          },
          { id: 'place-2' },
        ],
      })
    );
    const service = new GooglePlacesService('secret-key');

    const places = await service.searchNearby({
      center,
      radiusMeters: 90_000,
      includedTypes: ['cafe'],
      maxResultCount: 50,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(GOOGLE_PLACES_SEARCH_NEARBY_URL);
    expect(init.headers).toEqual(
      expect.objectContaining({
        'X-Goog-Api-Key': 'secret-key',
        'X-Goog-FieldMask': expect.stringContaining('places.id'),
      })
    );
    expect(JSON.parse(init.body as string)).toEqual(
      expect.objectContaining({
        includedTypes: ['cafe'],
        maxResultCount: 20,
        locationRestriction: { circle: { center, radius: 50_000 } },
      })
    );
    expect(places[0]).toEqual({
      externalId: 'place-1',
      name: 'Bloom Café',
      summary: 'Café tranquilo',
      address: 'Rua Padre Chagas, 320',
      location: { latitude: -30.02, longitude: -51.2 },
      rating: 4.5,
      userRatingCount: 10,
      priceLevel: 'PRICE_LEVEL_MODERATE',
      priceRange: {
        start: { amount: 20, currencyCode: 'BRL' },
        end: { amount: 100.5, currencyCode: 'BRL' },
      },
      phoneNumber: '(51) 3333-3333',
      websiteUri: 'https://bloom.example',
      googleMapsUri: null,
      primaryType: 'cafe',
      types: ['cafe'],
      openingHours: {
        weekdayDescriptions: ['segunda-feira: 09:00–18:00'],
        periods: [
          { open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 18, minute: 0 } },
          { open: { day: 0, hour: 0, minute: 0 }, close: null },
        ],
      },
      outdoorSeating: true,
      goodForGroups: null,
    });
    expect(places[1]).toEqual(
      expect.objectContaining({ externalId: 'place-2', name: '', priceRange: null, types: [] })
    );
  });

  it('omits included types and returns an empty list when Google finds nothing', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await expect(
      new GooglePlacesService('key').searchNearby({ center, radiusMeters: 5000 })
    ).resolves.toEqual([]);
    expect(
      JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    ).not.toHaveProperty('includedTypes');
  });

  it('converts HTTP and network failures into an unavailable error', async () => {
    const service = new GooglePlacesService('key');
    jest.spyOn(service['logger'], 'error').mockImplementation();

    fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'denied' }, 403));
    await expect(service.searchNearby({ center, radiusMeters: 5000 })).rejects.toBeInstanceOf(
      PlacesProviderUnavailableError
    );

    fetchMock.mockRejectedValueOnce(new Error('timeout'));
    await expect(service.searchNearby({ center, radiusMeters: 5000 })).rejects.toBeInstanceOf(
      PlacesProviderUnavailableError
    );
  });
});
