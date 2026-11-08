import { PrismaFeatureFlagsService } from '../../../../src/infrastructure/feature-flags/prisma-feature-flags.service';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { FEATURE_FLAGS } from '../../../../src/shared/feature-flags/feature-flags';

describe('PrismaFeatureFlagsService', () => {
  const findUnique = jest.fn();
  const service = new PrismaFeatureFlagsService({
    featureFlag: { findUnique },
  } as unknown as PrismaService);

  beforeEach(() => {
    findUnique.mockReset();
  });

  it('reads the flag state from the database', async () => {
    findUnique.mockResolvedValue({ enabled: true });

    await expect(service.isEnabled(FEATURE_FLAGS.googlePlacesBudget)).resolves.toBe(true);
    expect(findUnique).toHaveBeenCalledWith({
      where: { key: 'google_places_budget' },
      select: { enabled: true },
    });
  });

  it('treats a missing flag as disabled', async () => {
    findUnique.mockResolvedValue(null);

    await expect(service.isEnabled(FEATURE_FLAGS.googlePlacesBudget)).resolves.toBe(false);
  });
});
