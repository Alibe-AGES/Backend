import { Injectable } from '@nestjs/common';
import { type GeoPoint, type Place, PlacesProvider } from '../../../shared/places/places-provider';
import { LocationRepository } from '../domain/location.repository';
import { distanceInMeters, matchesPlaceFilters, type PlaceFilters } from '../domain/place-filters';

/** Without a distance filter, the search uses the largest radius accepted by Google Places. */
export const ANY_DISTANCE_IN_KM = 50;

export interface ListCatalogLocationsInput extends PlaceFilters {
  latitude: number;
  longitude: number;
  page: number;
  limit: number;
  maxDistanceKm?: number;
  type?: string;
}

export interface CatalogLocation {
  id: string;
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

@Injectable()
export class ListCatalogLocationsUseCase {
  constructor(
    private readonly places: PlacesProvider,
    private readonly locations: LocationRepository
  ) {}

  async execute(input: ListCatalogLocationsInput): Promise<CatalogLocationsPage> {
    if (
      input.budgetMin !== undefined &&
      input.budgetMax !== undefined &&
      input.budgetMin > input.budgetMax
    ) {
      throw new InvalidLocationSearchError('O orçamento mínimo não pode ser maior que o máximo');
    }

    const center: GeoPoint = { latitude: input.latitude, longitude: input.longitude };
    const places = await this.places.searchNearby({
      center,
      radiusMeters: (input.maxDistanceKm ?? ANY_DISTANCE_IN_KM) * 1000,
      includedTypes: input.type ? [input.type] : undefined,
    });

    const filtered = places.filter((place) => matchesPlaceFilters(place, input));
    const pageItems = filtered.slice((input.page - 1) * input.limit, input.page * input.limit);

    const ids = await this.locations.ensureCatalogLocations(
      pageItems.map((place) => ({
        externalId: place.externalId,
        description: place.summary ?? place.name,
        address: place.address,
      }))
    );

    return {
      items: pageItems.map((place) => ({
        id: ids.get(place.externalId) as string,
        place,
        distanceMeters: place.location ? distanceInMeters(center, place.location) : null,
      })),
      page: input.page,
      limit: input.limit,
      total: filtered.length,
    };
  }
}
