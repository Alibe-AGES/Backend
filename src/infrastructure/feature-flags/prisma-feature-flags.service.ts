import { Injectable } from '@nestjs/common';
import { type FeatureFlagKey, FeatureFlags } from '../../shared/feature-flags/feature-flags';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaFeatureFlagsService extends FeatureFlags {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isEnabled(key: FeatureFlagKey): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findUnique({
      where: { key },
      select: { enabled: true },
    });

    return flag?.enabled ?? false;
  }
}
