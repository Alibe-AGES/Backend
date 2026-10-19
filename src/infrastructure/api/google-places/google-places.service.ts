import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  type Money,
  type Place,
  type PlaceOpeningPeriod,
  type PlaceTimePoint,
  PLACE_PHOTO_NAME_PATTERN,
  PlacesProvider,
  PlacesProviderUnavailableError,
  type SearchNearbyPlacesInput,
} from '../../../shared/places/places-provider';
import { GOOGLE_PLACES_API_KEY } from './google-places.config';

export const GOOGLE_PLACES_SEARCH_NEARBY_URL =
  'https://places.googleapis.com/v1/places:searchNearby';

export const GOOGLE_PLACES_API_BASE_URL = 'https://places.googleapis.com/v1';

export const GOOGLE_PLACES_MAX_RADIUS_METERS = 50_000;
export const GOOGLE_PLACES_MAX_RESULT_COUNT = 20;

const REQUEST_TIMEOUT_IN_MS = 10_000;

/** Fields requested from Google; each field affects the SKU billed for the search. */
const BASE_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.primaryType',
  'places.types',
  'places.regularOpeningHours',
  'places.editorialSummary',
  'places.outdoorSeating',
  'places.goodForGroups',
  'places.photos',
];

const PRICE_RANGE_FIELD = 'places.priceRange';

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

interface GoogleSearchNearbyResponse {
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
    if (!this.apiKey) {
      throw new PlacesProviderUnavailableError('GOOGLE_PLACES_API_KEY não configurada');
    }

    const body = {
      ...(input.includedTypes?.length ? { includedTypes: input.includedTypes } : {}),
      maxResultCount: Math.min(
        input.maxResultCount ?? GOOGLE_PLACES_MAX_RESULT_COUNT,
        GOOGLE_PLACES_MAX_RESULT_COUNT
      ),
      rankPreference: 'POPULARITY',
      languageCode: 'pt-BR',
      regionCode: 'BR',
      locationRestriction: {
        circle: {
          center: input.center,
          radius: Math.min(input.radiusMeters, GOOGLE_PLACES_MAX_RADIUS_METERS),
        },
      },
    };

    let response: Response;
    try {
      response = await fetch(GOOGLE_PLACES_SEARCH_NEARBY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
          'X-Goog-FieldMask': [
            ...BASE_FIELDS,
            ...(input.includePriceRange ? [PRICE_RANGE_FIELD] : []),
          ].join(','),
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_IN_MS),
      });
    } catch (error) {
      this.logger.error('Falha de rede ao consultar o Google Places', error as Error);
      throw new PlacesProviderUnavailableError('Não foi possível consultar o Google Places');
    }

    if (!response.ok) {
      this.logger.error(
        `Google Places respondeu ${response.status}: ${await response.text().catch(() => '')}`
      );
      throw new PlacesProviderUnavailableError('Não foi possível consultar o Google Places');
    }

    const payload = (await response.json()) as GoogleSearchNearbyResponse;
    return (payload.places ?? []).map((place) => this.toPlace(place));
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
