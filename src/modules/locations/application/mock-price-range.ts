import type { PlacePriceRange } from '../../../shared/places/places-provider';

const MIN_START_PRICE = 10;
const START_PRICE_STEPS = 20;
const MIN_RANGE_WIDTH = 20;
const RANGE_WIDTH_STEPS = 10;
const PRICE_STEP = 5;

/**
 * Builds a random-looking price range in BRL used while the Google Places budget flag is
 * disabled. The value is derived from the place id, so a place keeps the same budget across
 * requests and pages, keeping the budget filter consistent.
 */
export function mockPriceRange(externalId: string): PlacePriceRange {
  const hash = hashString(externalId);
  const start = MIN_START_PRICE + (hash % START_PRICE_STEPS) * PRICE_STEP;
  const width =
    MIN_RANGE_WIDTH + (Math.floor(hash / START_PRICE_STEPS) % RANGE_WIDTH_STEPS) * PRICE_STEP * 2;

  return {
    start: { amount: start, currencyCode: 'BRL' },
    end: { amount: start + width, currencyCode: 'BRL' },
  };
}

/** FNV-1a 32-bit hash. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}
