import { Module } from '@nestjs/common';
import { FeatureFlagsModule } from '../../infrastructure/feature-flags/feature-flags.module';
import { GooglePlacesModule } from '../../infrastructure/api/google-places/google-places.module';
import { GetLocationUseCase } from './application/get-location.use-case';
import { GetLocationPhotoUseCase } from './application/get-location-photo.use-case';
import { ListCatalogLocationsUseCase } from './application/list-catalog-locations.use-case';
import { SearchCatalogLocationsUseCase } from './application/search-catalog-locations.use-case';
import { CatalogLocationsPageService } from './application/services/catalog-locations-page.service';
import { LocationsController } from './http/locations.controller';

@Module({
  imports: [GooglePlacesModule, FeatureFlagsModule],
  controllers: [LocationsController],
  providers: [
    CatalogLocationsPageService,
    ListCatalogLocationsUseCase,
    SearchCatalogLocationsUseCase,
    GetLocationPhotoUseCase,
    GetLocationUseCase,
  ],
})
export class LocationsModule {}
