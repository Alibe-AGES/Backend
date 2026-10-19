import { Module } from '@nestjs/common';
import { FeatureFlagsModule } from '../../infrastructure/feature-flags/feature-flags.module';
import { GooglePlacesModule } from '../../infrastructure/api/google-places/google-places.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { GetLocationPhotoUseCase } from './application/get-location-photo.use-case';
import { ListCatalogLocationsUseCase } from './application/list-catalog-locations.use-case';
import { LocationRepository } from './domain/location.repository';
import { LocationsController } from './http/locations.controller';
import { PrismaLocationRepository } from './persistence/prisma-location.repository';

@Module({
  imports: [PrismaModule, GooglePlacesModule, FeatureFlagsModule],
  controllers: [LocationsController],
  providers: [
    ListCatalogLocationsUseCase,
    GetLocationPhotoUseCase,
    {
      provide: LocationRepository,
      useClass: PrismaLocationRepository,
    },
  ],
})
export class LocationsModule {}
