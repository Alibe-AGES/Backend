import {
  distanceInMeters,
  matchesPlaceFilters,
} from '../../../../src/modules/locations/domain/place-filters';
import { buildPlace } from '../../../helpers/place.fixture';

const brl = (amount: number) => ({ amount, currencyCode: 'BRL' });

describe('place filters', () => {
  it('accepts every place when no filter is given', () => {
    expect(matchesPlaceFilters(buildPlace(), {})).toBe(true);
  });

  describe('budget', () => {
    const place = buildPlace({ priceRange: { start: brl(20), end: brl(100) } });

    it('keeps places whose price range overlaps the budget', () => {
      expect(matchesPlaceFilters(place, { budgetMin: 50, budgetMax: 150 })).toBe(true);
      expect(matchesPlaceFilters(place, { budgetMax: 20 })).toBe(true);
    });

    it('drops places whose price range is outside the budget', () => {
      expect(matchesPlaceFilters(place, { budgetMax: 10 })).toBe(false);
      expect(matchesPlaceFilters(place, { budgetMin: 150 })).toBe(false);
    });

    it('treats a missing end price as open-ended and keeps unknown prices', () => {
      const openEnded = buildPlace({ priceRange: { start: brl(100), end: null } });
      expect(matchesPlaceFilters(openEnded, { budgetMin: 500 })).toBe(true);
      expect(matchesPlaceFilters(buildPlace(), { budgetMax: 1 })).toBe(true);
    });
  });

  describe('period', () => {
    const lunchOnly = buildPlace({
      openingHours: {
        weekdayDescriptions: [],
        periods: [
          { open: { day: 2, hour: 11, minute: 0 }, close: { day: 2, hour: 15, minute: 0 } },
        ],
      },
    });

    it('matches when an opening period overlaps the day window', () => {
      expect(matchesPlaceFilters(lunchOnly, { period: 'morning' })).toBe(true);
      expect(matchesPlaceFilters(lunchOnly, { period: 'afternoon' })).toBe(true);
      expect(matchesPlaceFilters(lunchOnly, { period: 'night' })).toBe(false);
    });

    it('matches any selected period', () => {
      expect(matchesPlaceFilters(lunchOnly, { period: ['night', 'morning'] })).toBe(true);
      expect(matchesPlaceFilters(lunchOnly, { period: ['night'] })).toBe(false);
    });

    it('handles periods that cross midnight at the end of the week', () => {
      const saturdayNight = buildPlace({
        openingHours: {
          weekdayDescriptions: [],
          periods: [
            { open: { day: 6, hour: 22, minute: 0 }, close: { day: 0, hour: 4, minute: 0 } },
          ],
        },
      });
      expect(matchesPlaceFilters(saturdayNight, { period: 'night' })).toBe(true);
      expect(matchesPlaceFilters(saturdayNight, { period: 'afternoon' })).toBe(false);
    });

    it('matches 24h places and keeps places without opening hours', () => {
      const alwaysOpen = buildPlace({
        openingHours: {
          weekdayDescriptions: [],
          periods: [{ open: { day: 0, hour: 0, minute: 0 }, close: null }],
        },
      });
      expect(matchesPlaceFilters(alwaysOpen, { period: 'night' })).toBe(true);
      expect(matchesPlaceFilters(buildPlace(), { period: 'night' })).toBe(true);
    });
  });

  describe('environment', () => {
    it('considers outdoor types and outdoor seating as open air', () => {
      const park = buildPlace({ types: ['park'] });
      const terrace = buildPlace({ outdoorSeating: true });

      expect(matchesPlaceFilters(park, { environment: 'outdoor' })).toBe(true);
      expect(matchesPlaceFilters(terrace, { environment: 'outdoor' })).toBe(true);
      expect(matchesPlaceFilters(buildPlace(), { environment: 'outdoor' })).toBe(false);
    });

    it('matches any selected environment', () => {
      expect(matchesPlaceFilters(buildPlace(), { environment: ['outdoor', 'indoor'] })).toBe(true);
    });

    it('excludes outdoor-only places from indoor results', () => {
      expect(matchesPlaceFilters(buildPlace({ types: ['park'] }), { environment: 'indoor' })).toBe(
        false
      );
      expect(matchesPlaceFilters(buildPlace(), { environment: 'indoor' })).toBe(true);
    });
  });

  describe('group size', () => {
    it('requires good-for-groups for large groups', () => {
      expect(matchesPlaceFilters(buildPlace({ goodForGroups: true }), { groupSize: 'large' })).toBe(
        true
      );
      expect(matchesPlaceFilters(buildPlace(), { groupSize: 'large' })).toBe(false);
    });

    it('drops only places known to be bad for groups for small groups', () => {
      expect(matchesPlaceFilters(buildPlace(), { groupSize: 'small' })).toBe(true);
      expect(
        matchesPlaceFilters(buildPlace({ goodForGroups: false }), { groupSize: 'small' })
      ).toBe(false);
      expect(
        matchesPlaceFilters(buildPlace({ goodForGroups: false }), { groupSize: 'couple' })
      ).toBe(true);
    });
  });

  it('calculates the distance between two coordinates in meters', () => {
    const origin = { latitude: -30.0277, longitude: -51.2287 };
    expect(distanceInMeters(origin, origin)).toBe(0);
    expect(distanceInMeters(origin, { latitude: -30.0277, longitude: -51.2006 })).toBeCloseTo(
      2704,
      -1
    );
  });
});
