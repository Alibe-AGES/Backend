import type { GeoPoint, Place, PlaceOpeningPeriod } from '../../../shared/places/places-provider';

export const DAY_PERIODS = ['morning', 'afternoon', 'night'] as const;
export const PLACE_ENVIRONMENTS = ['outdoor', 'indoor'] as const;
export const GROUP_SIZES = ['couple', 'small', 'large'] as const;

export type DayPeriod = (typeof DAY_PERIODS)[number];
export type PlaceEnvironment = (typeof PLACE_ENVIRONMENTS)[number];
export type GroupSize = (typeof GROUP_SIZES)[number];

export interface PlaceFilters {
  budgetMin?: number;
  budgetMax?: number;
  period?: DayPeriod;
  environment?: PlaceEnvironment;
  groupSize?: GroupSize;
}

const MINUTES_IN_DAY = 24 * 60;
const MINUTES_IN_WEEK = 7 * MINUTES_IN_DAY;
const EARTH_RADIUS_IN_METERS = 6_371_000;

/** [start, end) windows in minutes of the day. */
const DAY_PERIOD_WINDOWS: Record<DayPeriod, [number, number]> = {
  morning: [6 * 60, 12 * 60],
  afternoon: [12 * 60, 18 * 60],
  night: [18 * 60, 24 * 60],
};

const OUTDOOR_PLACE_TYPES = new Set([
  'park',
  'national_park',
  'state_park',
  'hiking_area',
  'beach',
  'campground',
  'botanical_garden',
  'garden',
  'dog_park',
  'playground',
  'plaza',
  'picnic_ground',
  'marina',
]);

/**
 * Budget and period only exclude a place when Google returns data that contradicts the filter,
 * since price ranges and opening hours are often missing.
 */
export function matchesPlaceFilters(place: Place, filters: PlaceFilters): boolean {
  return (
    matchesBudget(place, filters.budgetMin, filters.budgetMax) &&
    matchesPeriod(place, filters.period) &&
    matchesEnvironment(place, filters.environment) &&
    matchesGroupSize(place, filters.groupSize)
  );
}

export function distanceInMeters(from: GeoPoint, to: GeoPoint): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(to.latitude - from.latitude);
  const deltaLongitude = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return Math.round(2 * EARTH_RADIUS_IN_METERS * Math.asin(Math.sqrt(a)));
}

function matchesBudget(place: Place, budgetMin?: number, budgetMax?: number): boolean {
  if ((budgetMin === undefined && budgetMax === undefined) || !place.priceRange) {
    return true;
  }

  const placeStart = place.priceRange.start?.amount ?? 0;
  const placeEnd = place.priceRange.end?.amount ?? Number.POSITIVE_INFINITY;

  return placeStart <= (budgetMax ?? Number.POSITIVE_INFINITY) && placeEnd >= (budgetMin ?? 0);
}

function matchesPeriod(place: Place, period?: DayPeriod): boolean {
  if (!period || !place.openingHours?.periods.length) {
    return true;
  }

  const [windowStart, windowEnd] = DAY_PERIOD_WINDOWS[period];

  return place.openingHours.periods.some((openingPeriod) => {
    const [opensAt, closesAt] = toMinutesOfWeek(openingPeriod);

    for (let day = 0; day < 7; day++) {
      for (const offset of [0, MINUTES_IN_WEEK]) {
        const start = day * MINUTES_IN_DAY + windowStart + offset;
        const end = day * MINUTES_IN_DAY + windowEnd + offset;

        if (opensAt < end && closesAt > start) {
          return true;
        }
      }
    }

    return false;
  });
}

function toMinutesOfWeek({ open, close }: PlaceOpeningPeriod): [number, number] {
  const opensAt = open.day * MINUTES_IN_DAY + open.hour * 60 + open.minute;

  if (!close) {
    return [0, Number.POSITIVE_INFINITY];
  }

  let closesAt = close.day * MINUTES_IN_DAY + close.hour * 60 + close.minute;
  if (closesAt <= opensAt) {
    closesAt += MINUTES_IN_WEEK;
  }

  return [opensAt, closesAt];
}

function matchesEnvironment(place: Place, environment?: PlaceEnvironment): boolean {
  if (!environment) {
    return true;
  }

  const isOutdoorPlace = place.types.some((type) => OUTDOOR_PLACE_TYPES.has(type));

  if (environment === 'outdoor') {
    return isOutdoorPlace || place.outdoorSeating === true;
  }

  return !isOutdoorPlace;
}

function matchesGroupSize(place: Place, groupSize?: GroupSize): boolean {
  if (groupSize === 'large') {
    return place.goodForGroups === true;
  }

  if (groupSize === 'small') {
    return place.goodForGroups !== false;
  }

  return true;
}
