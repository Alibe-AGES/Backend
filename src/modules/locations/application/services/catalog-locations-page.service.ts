import { Injectable } from '@nestjs/common';
import { FEATURE_FLAGS, FeatureFlags } from '../../../../shared/feature-flags/feature-flags';
import type { GeoPoint, Place } from '../../../../shared/places/places-provider';
import {
  distanceInMeters,
  matchesPlaceFilters,
  type PlaceFilters,
} from '../../domain/place-filters';
import { mockPriceRange } from '../mock-price-range';

/** Without a distance filter, the search uses the largest radius accepted by Google Places. */
export const ANY_DISTANCE_IN_KM = 50;

export interface CatalogSearchInput extends PlaceFilters {
  latitude: number;
  longitude: number;
  page: number;
  limit: number;
  maxDistanceKm?: number;
  type?: string;
}

export interface CatalogSearchArea {
  center: GeoPoint;
  radiusMeters: number;
  includePriceRange: boolean;
}

export interface CatalogLocation {
  place: Place;
  distanceMeters: number | null;
}

export interface CatalogLocationsPage {
  items: CatalogLocation[];
  page: number;
  limit: number;
  total: number;
}

export class InvalidLocationSearchError extends Error {}

/**
 * Shared by the feed and the text search: validates the filters, applies the budget flag,
 * filters and paginates. Nothing is persisted; a location is only stored when a proposal uses it.
 */
@Injectable()
export class CatalogLocationsPageService {
  constructor(private readonly featureFlags: FeatureFlags) {}

  async build(
    input: CatalogSearchInput,
    findPlaces: (area: CatalogSearchArea) => Promise<Place[]>
  ): Promise<CatalogLocationsPage> {
    if (
      input.budgetMin !== undefined &&
      input.budgetMax !== undefined &&
      input.budgetMin > input.budgetMax
    ) {
      throw new InvalidLocationSearchError('O orçamento mínimo não pode ser maior que o máximo');
    }

    const budgetFromProvider = await this.featureFlags.isEnabled(FEATURE_FLAGS.googlePlacesBudget);
    const center: GeoPoint = { latitude: input.latitude, longitude: input.longitude };
    const radiusMeters = (input.maxDistanceKm ?? ANY_DISTANCE_IN_KM) * 1000;
    const found = await findPlaces({ center, radiusMeters, includePriceRange: budgetFromProvider });
    const places = budgetFromProvider
      ? found
      : found.map((place) => ({ ...place, priceRange: mockPriceRange(place.externalId) }));

    // Text search only biases by location, so an explicit distance limit is enforced here.
    const filtered = places.filter(
      (place) =>
        matchesPlaceFilters(place, input) &&
        (input.maxDistanceKm === undefined ||
          !place.location ||
          distanceInMeters(center, place.location) <= radiusMeters)
    );
    const pageItems = filtered.slice((input.page - 1) * input.limit, input.page * input.limit);

    return {
      items: pageItems.map((place) => ({
        place,
        distanceMeters: place.location ? distanceInMeters(center, place.location) : null,
      })),
      page: input.page,
      limit: input.limit,
      total: filtered.length,
    };
  }
}
