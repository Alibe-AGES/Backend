import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  type Money,
  type Place,
  type PlaceOpeningPeriod,
  type PlaceTimePoint,
  PlacesProvider,
  PlacesProviderUnavailableError,
  type SearchNearbyPlacesInput,
} from '../../../shared/places/places-provider';
import { GOOGLE_PLACES_API_KEY } from './google-places.config';

export const GOOGLE_PLACES_SEARCH_NEARBY_URL =
  'https://places.googleapis.com/v1/places:searchNearby';

export const GOOGLE_PLACES_MAX_RADIUS_METERS = 50_000;
export const GOOGLE_PLACES_MAX_RESULT_COUNT = 20;

const REQUEST_TIMEOUT_IN_MS = 10_000;

/** Campos solicitados ao Google; cada campo influencia o SKU cobrado pela busca. */
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.priceLevel',
  'places.priceRange',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.googleMapsUri',
  'places.primaryType',
  'places.types',
  'places.regularOpeningHours',
  'places.editorialSummary',
  'places.outdoorSeating',
  'places.goodForGroups',
].join(',');

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
}

interface GoogleSearchNearbyResponse {
  places?: GooglePlace[];
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
          'X-Goog-FieldMask': FIELD_MASK,
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
