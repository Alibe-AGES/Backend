import { Module } from '@nestjs/common';
import { FeatureFlags } from '../../shared/feature-flags/feature-flags';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaFeatureFlagsService } from './prisma-feature-flags.service';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaFeatureFlagsService,
    {
      provide: FeatureFlags,
      useExisting: PrismaFeatureFlagsService,
    },
  ],
  exports: [FeatureFlags],
})
export class FeatureFlagsModule {}
