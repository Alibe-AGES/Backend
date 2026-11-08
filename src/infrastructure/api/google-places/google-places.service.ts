import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  type GetPlaceOptions,
  type Money,
  type Place,
  type PlaceOpeningPeriod,
  type PlaceTimePoint,
  PLACE_PHOTO_NAME_PATTERN,
  PlacesProvider,
  PlacesProviderUnavailableError,
  type SearchNearbyPlacesInput,
  type SearchTextPlacesInput,
} from '../../../shared/places/places-provider';
import { GOOGLE_PLACES_API_KEY } from './google-places.config';

export const GOOGLE_PLACES_SEARCH_NEARBY_URL =
  'https://places.googleapis.com/v1/places:searchNearby';

export const GOOGLE_PLACES_SEARCH_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';

export const GOOGLE_PLACES_API_BASE_URL = 'https://places.googleapis.com/v1';

export const GOOGLE_PLACES_MAX_RADIUS_METERS = 50_000;
export const GOOGLE_PLACES_MAX_RESULT_COUNT = 20;

const REQUEST_TIMEOUT_IN_MS = 10_000;

/** Fields requested from Google; each field affects the SKU billed for the request. */
const BASE_FIELDS = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'priceLevel',
  'nationalPhoneNumber',
  'websiteUri',
  'googleMapsUri',
  'primaryType',
  'types',
  'regularOpeningHours',
  'editorialSummary',
  'outdoorSeating',
  'goodForGroups',
  'photos',
];

const PRICE_RANGE_FIELD = 'priceRange';

/** Place Details answers these statuses when the id is malformed or the place does not exist. */
const PLACE_NOT_FOUND_STATUSES = new Set([400, 404]);

interface GoogleMoney {
  currencyCode?: string;
  units?: string;
  nanos?: number;
}

interface GoogleTimePoint {
  day?: number;
  hour?: number;
  minute?: number;
}

interface GooglePlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  priceRange?: { startPrice?: GoogleMoney; endPrice?: GoogleMoney };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  primaryType?: string;
  types?: string[];
  regularOpeningHours?: {
    periods?: Array<{ open?: GoogleTimePoint; close?: GoogleTimePoint }>;
    weekdayDescriptions?: string[];
  };
  editorialSummary?: { text?: string };
  outdoorSeating?: boolean;
  goodForGroups?: boolean;
  photos?: Array<{ name?: string }>;
}

interface GoogleSearchResponse {
  places?: GooglePlace[];
}

interface GooglePhotoMediaResponse {
  photoUri?: string;
}

@Injectable()
export class GooglePlacesService extends PlacesProvider {
  private readonly logger = new Logger(GooglePlacesService.name);

  constructor(@Inject(GOOGLE_PLACES_API_KEY) private readonly apiKey: string | null) {
    super();
  }

  async searchNearby(input: SearchNearbyPlacesInput): Promise<Place[]> {
    return this.search(
      GOOGLE_PLACES_SEARCH_NEARBY_URL,
      {
        ...(input.includedTypes?.length ? { includedTypes: input.includedTypes } : {}),
        maxResultCount: this.clampResultCount(input.maxResultCount),
        rankPreference: 'POPULARITY',
        languageCode: 'pt-BR',
        regionCode: 'BR',
        locationRestriction: {
          circle: { center: input.center, radius: this.clampRadius(input.radiusMeters) },
        },
      },
      input.includePriceRange
    );
  }

  /**
   * Text Search (New) only accepts a rectangle as restriction, so the circle is sent as a bias;
   * callers that need a hard distance limit must filter the results.
   */
  async searchText(input: SearchTextPlacesInput): Promise<Place[]> {
    return this.search(
      GOOGLE_PLACES_SEARCH_TEXT_URL,
      {
        textQuery: input.textQuery,
        ...(input.includedType ? { includedType: input.includedType } : {}),
        pageSize: this.clampResultCount(input.maxResultCount),
        rankPreference: 'RELEVANCE',
        languageCode: 'pt-BR',
        regionCode: 'BR',
        locationBias: {
          circle: { center: input.center, radius: this.clampRadius(input.radiusMeters) },
        },
      },
      input.includePriceRange
    );
  }

  /** Place Details (New); the id is the same externalId returned by the searches. */
  async getPlaceById(placeId: string, options: GetPlaceOptions = {}): Promise<Place | null> {
    const url = new URL(`${GOOGLE_PLACES_API_BASE_URL}/places/${encodeURIComponent(placeId)}`);
    url.searchParams.set('languageCode', 'pt-BR');
    url.searchParams.set('regionCode', 'BR');

    const response = await this.send(url, {
      headers: { 'X-Goog-FieldMask': this.fieldMask(options.includePriceRange).join(',') },
    });

    if (PLACE_NOT_FOUND_STATUSES.has(response.status)) {
      this.logger.warn(`Google Place Details respondeu ${response.status} para ${placeId}`);
      return null;
    }

    await this.ensureOk(response);
    return this.toPlace((await response.json()) as GooglePlace);
  }

  /**
   * Resolves the photo through the Place Photos (New) media route with skipHttpRedirect, so the
   * returned googleusercontent URL can be sent to the app without exposing the API key.
   */
  async getPhotoUrl(photoName: string, maxWidthPx: number): Promise<string | null> {
    if (!this.apiKey || !PLACE_PHOTO_NAME_PATTERN.test(photoName)) {
      return null;
    }

    const url = new URL(`${GOOGLE_PLACES_API_BASE_URL}/${photoName}/media`);
    url.searchParams.set('maxWidthPx', String(maxWidthPx));
    url.searchParams.set('skipHttpRedirect', 'true');

    try {
      const response = await fetch(url, {
        headers: { 'X-Goog-Api-Key': this.apiKey },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_IN_MS),
      });

      if (!response.ok) {
        this.logger.warn(`Google Place Photos respondeu ${response.status} para ${photoName}`);
        return null;
      }

      const payload = (await response.json()) as GooglePhotoMediaResponse;
      return payload.photoUri ?? null;
    } catch (error) {
      this.logger.warn(`Falha ao consultar a foto ${photoName}: ${(error as Error).message}`);
      return null;
    }
  }

  private async search(
    url: string,
    body: Record<string, unknown>,
    includePriceRange = false
  ): Promise<Place[]> {
    const response = await this.send(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-FieldMask': this.fieldMask(includePriceRange)
          .map((field) => `places.${field}`)
          .join(','),
      },
      body: JSON.stringify(body),
    });
    await this.ensureOk(response);

    const payload = (await response.json()) as GoogleSearchResponse;
    return (payload.places ?? []).map((place) => this.toPlace(place));
  }

  private async send(url: string | URL, init: RequestInit): Promise<Response> {
    if (!this.apiKey) {
      throw new PlacesProviderUnavailableError('GOOGLE_PLACES_API_KEY não configurada');
    }

    try {
      return await fetch(url, {
        ...init,
        headers: { ...(init.headers as Record<string, string>), 'X-Goog-Api-Key': this.apiKey },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_IN_MS),
      });
    } catch (error) {
      this.logger.error('Falha de rede ao consultar o Google Places', error as Error);
      throw new PlacesProviderUnavailableError('Não foi possível consultar o Google Places');
    }
  }

  private async ensureOk(response: Response): Promise<void> {
    if (!response.ok) {
      this.logger.error(
        `Google Places respondeu ${response.status}: ${await response.text().catch(() => '')}`
      );
      throw new PlacesProviderUnavailableError('Não foi possível consultar o Google Places');
    }
  }

  private fieldMask(includePriceRange = false): string[] {
    return [...BASE_FIELDS, ...(includePriceRange ? [PRICE_RANGE_FIELD] : [])];
  }

  private clampResultCount(maxResultCount: number | undefined): number {
    return Math.min(
      maxResultCount ?? GOOGLE_PLACES_MAX_RESULT_COUNT,
      GOOGLE_PLACES_MAX_RESULT_COUNT
    );
  }

  private clampRadius(radiusMeters: number): number {
    return Math.min(radiusMeters, GOOGLE_PLACES_MAX_RADIUS_METERS);
  }

  private toPlace(place: GooglePlace): Place {
    const periods = place.regularOpeningHours?.periods ?? [];

    return {
      externalId: place.id,
      name: place.displayName?.text ?? '',
      summary: place.editorialSummary?.text ?? null,
      address: place.formattedAddress ?? null,
      location: place.location ?? null,
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? null,
      priceLevel: place.priceLevel ?? null,
      priceRange: place.priceRange
        ? {
            start: this.toMoney(place.priceRange.startPrice),
            end: this.toMoney(place.priceRange.endPrice),
          }
        : null,
      phoneNumber: place.nationalPhoneNumber ?? null,
      websiteUri: place.websiteUri ?? null,
      googleMapsUri: place.googleMapsUri ?? null,
      primaryType: place.primaryType ?? null,
      types: place.types ?? [],
      openingHours: place.regularOpeningHours
        ? {
            weekdayDescriptions: place.regularOpeningHours.weekdayDescriptions ?? [],
            periods: periods
              .filter((period) => period.open)
              .map((period): PlaceOpeningPeriod => ({
                open: this.toTimePoint(period.open as GoogleTimePoint),
                close: period.close ? this.toTimePoint(period.close) : null,
              })),
          }
        : null,
      outdoorSeating: place.outdoorSeating ?? null,
      goodForGroups: place.goodForGroups ?? null,
      photoName: place.photos?.find((photo) => photo.name)?.name ?? null,
    };
  }

  private toMoney(money: GoogleMoney | undefined): Money | null {
    if (!money?.currencyCode) {
      return null;
    }

    return {
      amount: Number(money.units ?? 0) + (money.nanos ?? 0) / 1e9,
      currencyCode: money.currencyCode,
    };
  }

  private toTimePoint(point: GoogleTimePoint): PlaceTimePoint {
    return { day: point.day ?? 0, hour: point.hour ?? 0, minute: point.minute ?? 0 };
  }
}
