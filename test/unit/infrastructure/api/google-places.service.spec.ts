import { getGooglePlacesApiKey } from '../../../../src/infrastructure/api/google-places/google-places.config';
import {
  GOOGLE_PLACES_API_BASE_URL,
  GOOGLE_PLACES_SEARCH_NEARBY_URL,
  GOOGLE_PLACES_SEARCH_TEXT_URL,
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
            photos: [{}, { name: 'places/place-1/photos/photo-1' }],
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
      includePriceRange: true,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(GOOGLE_PLACES_SEARCH_NEARBY_URL);
    expect(init.headers).toEqual(
      expect.objectContaining({
        'X-Goog-Api-Key': 'secret-key',
        'X-Goog-FieldMask': expect.stringContaining('places.id'),
      })
    );
    const fieldMask = (init.headers as Record<string, string>)['X-Goog-FieldMask'].split(',');
    expect(fieldMask).toEqual(expect.arrayContaining(['places.priceRange', 'places.photos']));
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
      photoName: 'places/place-1/photos/photo-1',
    });
    expect(places[1]).toEqual(
      expect.objectContaining({
        externalId: 'place-2',
        name: '',
        priceRange: null,
        types: [],
        photoName: null,
      })
    );
  });

  it('does not request the price range unless asked', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await new GooglePlacesService('key').searchNearby({ center, radiusMeters: 5000 });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)['X-Goog-FieldMask']).not.toContain(
      'places.priceRange'
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

  it('sends a text search biased around the center and maps the places', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ places: [{ id: 'place-1', displayName: { text: 'Pizzaria' } }] })
    );

    const places = await new GooglePlacesService('secret-key').searchText({
      textQuery: 'pizza vegana',
      center,
      radiusMeters: 90_000,
      includedType: 'restaurant',
      maxResultCount: 50,
      includePriceRange: true,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(GOOGLE_PLACES_SEARCH_TEXT_URL);
    expect((init.headers as Record<string, string>)['X-Goog-FieldMask']).toContain(
      'places.priceRange'
    );
    expect(JSON.parse(init.body as string)).toEqual({
      textQuery: 'pizza vegana',
      includedType: 'restaurant',
      pageSize: 20,
      rankPreference: 'RELEVANCE',
      languageCode: 'pt-BR',
      regionCode: 'BR',
      locationBias: { circle: { center, radius: 50_000 } },
    });
    expect(places).toEqual([expect.objectContaining({ externalId: 'place-1', name: 'Pizzaria' })]);
  });

  it('omits the included type and fails without a key on text search', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await expect(
      new GooglePlacesService('key').searchText({ textQuery: 'bar', center, radiusMeters: 5000 })
    ).resolves.toEqual([]);
    expect(
      JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    ).not.toHaveProperty('includedType');

    await expect(
      new GooglePlacesService(null).searchText({ textQuery: 'bar', center, radiusMeters: 5000 })
    ).rejects.toBeInstanceOf(PlacesProviderUnavailableError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

  describe('getPlaceById', () => {
    const placeId = 'ChIJN1t_tDeuEmsRUsoyG83frY4';

    it('requests Place Details with the unprefixed field mask and maps the place', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          id: placeId,
          displayName: { text: 'Bloom Café' },
          formattedAddress: 'Rua A',
        })
      );
      const service = new GooglePlacesService('secret-key');

      const place = await service.getPlaceById(placeId, { includePriceRange: true });

      expect(place).toEqual(
        expect.objectContaining({ externalId: placeId, name: 'Bloom Café', address: 'Rua A' })
      );
      const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
      expect(url.toString()).toBe(
        `${GOOGLE_PLACES_API_BASE_URL}/places/${placeId}?languageCode=pt-BR&regionCode=BR`
      );
      expect(init.method).toBeUndefined();
      const headers = init.headers as Record<string, string>;
      expect(headers['X-Goog-Api-Key']).toBe('secret-key');
      const fieldMask = headers['X-Goog-FieldMask'].split(',');
      expect(fieldMask).toEqual(expect.arrayContaining(['id', 'displayName', 'priceRange']));
      expect(fieldMask.some((field) => field.startsWith('places.'))).toBe(false);
    });

    it('does not request the price range unless asked', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ id: placeId }));

      await new GooglePlacesService('key').getPlaceById(placeId);

      const init = fetchMock.mock.calls[0][1] as RequestInit;
      expect((init.headers as Record<string, string>)['X-Goog-FieldMask']).not.toContain(
        'priceRange'
      );
    });

    it.each([400, 404])('returns null when Google answers %s', async (status) => {
      const service = new GooglePlacesService('key');
      jest.spyOn(service['logger'], 'warn').mockImplementation();
      fetchMock.mockResolvedValue(jsonResponse({ error: 'not found' }, status));

      await expect(service.getPlaceById(placeId)).resolves.toBeNull();
    });

    it('converts other failures and a missing key into an unavailable error', async () => {
      const service = new GooglePlacesService('key');
      jest.spyOn(service['logger'], 'error').mockImplementation();

      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'denied' }, 403));
      await expect(service.getPlaceById(placeId)).rejects.toBeInstanceOf(
        PlacesProviderUnavailableError
      );

      fetchMock.mockRejectedValueOnce(new Error('timeout'));
      await expect(service.getPlaceById(placeId)).rejects.toBeInstanceOf(
        PlacesProviderUnavailableError
      );

      await expect(new GooglePlacesService(null).getPlaceById(placeId)).rejects.toBeInstanceOf(
        PlacesProviderUnavailableError
      );
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPhotoUrl', () => {
    const photoName = 'places/place-1/photos/photo-1';

    it('resolves the public photo URL through the media route without exposing the key', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ name: photoName, photoUri: 'https://lh3.googleusercontent.com/photo' })
      );

      await expect(new GooglePlacesService('secret-key').getPhotoUrl(photoName, 800)).resolves.toBe(
        'https://lh3.googleusercontent.com/photo'
      );

      const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
      expect(url.toString()).toBe(
        `${GOOGLE_PLACES_API_BASE_URL}/${photoName}/media?maxWidthPx=800&skipHttpRedirect=true`
      );
      expect(url.toString()).not.toContain('secret-key');
      expect(init.headers).toEqual({ 'X-Goog-Api-Key': 'secret-key' });
    });

    it('returns null without calling Google for a missing key or an invalid photo name', async () => {
      await expect(new GooglePlacesService(null).getPhotoUrl(photoName, 800)).resolves.toBeNull();
      await expect(
        new GooglePlacesService('key').getPhotoUrl('places/../../other', 800)
      ).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('returns null when Google fails or returns no URL', async () => {
      const service = new GooglePlacesService('key');
      jest.spyOn(service['logger'], 'warn').mockImplementation();

      fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'not found' }, 404));
      await expect(service.getPhotoUrl(photoName, 800)).resolves.toBeNull();

      fetchMock.mockRejectedValueOnce(new Error('timeout'));
      await expect(service.getPhotoUrl(photoName, 800)).resolves.toBeNull();

      fetchMock.mockResolvedValueOnce(jsonResponse({}));
      await expect(service.getPhotoUrl(photoName, 800)).resolves.toBeNull();
    });
  });
});
