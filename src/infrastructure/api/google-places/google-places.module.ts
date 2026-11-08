import { Module } from '@nestjs/common';
import { PlacesProvider } from '../../../shared/places/places-provider';
import { GOOGLE_PLACES_API_KEY, getGooglePlacesApiKey } from './google-places.config';
import { GooglePlacesService } from './google-places.service';

@Module({
  providers: [
    { provide: GOOGLE_PLACES_API_KEY, useFactory: () => getGooglePlacesApiKey() },
    GooglePlacesService,
    {
      provide: PlacesProvider,
      useExisting: GooglePlacesService,
    },
  ],
  exports: [PlacesProvider],
})
export class GooglePlacesModule {}
