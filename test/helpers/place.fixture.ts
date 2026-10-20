import type { Place } from '../../src/shared/places/places-provider';

export function buildPlace(overrides: Partial<Place> = {}): Place {
  return {
    externalId: 'place-1',
    name: 'Bloom Café',
    summary: 'Café com ambiente tranquilo',
    address: 'Rua Padre Chagas, 320 - Moinhos de Vento, Porto Alegre - RS',
    location: { latitude: -30.0277, longitude: -51.2006 },
    rating: 4.5,
    userRatingCount: 312,
    priceLevel: 'PRICE_LEVEL_MODERATE',
    priceRange: null,
    phoneNumber: null,
    websiteUri: null,
    googleMapsUri: null,
    primaryType: 'cafe',
    types: ['cafe'],
    openingHours: null,
    outdoorSeating: null,
    goodForGroups: null,
    photoName: null,
    ...overrides,
  };
}
