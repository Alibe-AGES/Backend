import { mockPriceRange } from '../../../../src/modules/locations/application/mock-price-range';

describe('mockPriceRange', () => {
  it('returns the same BRL range for the same place', () => {
    expect(mockPriceRange('place-1')).toEqual(mockPriceRange('place-1'));
  });

  it('generates bounded ranges that vary between places', () => {
    const ranges = Array.from({ length: 50 }, (_, index) => mockPriceRange(`place-${index}`));

    for (const range of ranges) {
      const start = range.start?.amount as number;
      const end = range.end?.amount as number;

      expect(range.start?.currencyCode).toBe('BRL');
      expect(range.end?.currencyCode).toBe('BRL');
      expect(start).toBeGreaterThanOrEqual(10);
      expect(start).toBeLessThanOrEqual(105);
      expect(end - start).toBeGreaterThanOrEqual(20);
      expect(end - start).toBeLessThanOrEqual(110);
    }

    expect(new Set(ranges.map((range) => range.start?.amount)).size).toBeGreaterThan(1);
  });
});
