import { Injectable } from '@nestjs/common';
import { FEATURE_FLAGS, FeatureFlags } from '../../../shared/feature-flags/feature-flags';
import { type Place, PlacesProvider } from '../../../shared/places/places-provider';
import { mockPriceRange } from './mock-price-range';

export class LocationNotFoundError extends Error {}

@Injectable()
export class GetLocationUseCase {
  constructor(
    private readonly places: PlacesProvider,
    private readonly featureFlags: FeatureFlags
  ) {}

  /** Looks the place up on the provider by its Place ID; nothing is read from the database. */
  async execute(placeId: string): Promise<Place> {
    const budgetFromProvider = await this.featureFlags.isEnabled(FEATURE_FLAGS.googlePlacesBudget);
    const place = await this.places.getPlaceById(placeId, {
      includePriceRange: budgetFromProvider,
    });

    if (!place) {
      throw new LocationNotFoundError('Local não encontrado');
    }

    return budgetFromProvider ? place : { ...place, priceRange: mockPriceRange(place.externalId) };
  }
}
