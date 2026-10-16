export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Money {
  amount: number;
  currencyCode: string;
}

export interface PlacePriceRange {
  start: Money | null;
  end: Money | null;
}

/** day: 0 = Sunday ... 6 = Saturday, in the place's local time. */
export interface PlaceTimePoint {
  day: number;
  hour: number;
  minute: number;
}

/** A period without `close` means the place is open 24 hours. */
export interface PlaceOpeningPeriod {
  open: PlaceTimePoint;
  close: PlaceTimePoint | null;
}

export interface PlaceOpeningHours {
  weekdayDescriptions: string[];
  periods: PlaceOpeningPeriod[];
}

export interface Place {
  externalId: string;
  name: string;
  summary: string | null;
  address: string | null;
  location: GeoPoint | null;
  rating: number | null;
  userRatingCount: number | null;
  priceLevel: string | null;
  priceRange: PlacePriceRange | null;
  phoneNumber: string | null;
  websiteUri: string | null;
  googleMapsUri: string | null;
  primaryType: string | null;
  types: string[];
  openingHours: PlaceOpeningHours | null;
  outdoorSeating: boolean | null;
  goodForGroups: boolean | null;
}

export interface SearchNearbyPlacesInput {
  center: GeoPoint;
  radiusMeters: number;
  includedTypes?: string[];
  maxResultCount?: number;
}

export class PlacesProviderUnavailableError extends Error {}

export abstract class PlacesProvider {
  abstract searchNearby(input: SearchNearbyPlacesInput): Promise<Place[]>;
}
