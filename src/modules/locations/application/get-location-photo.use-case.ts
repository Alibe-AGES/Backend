import { Injectable } from '@nestjs/common';
import { PlacesProvider } from '../../../shared/places/places-provider';

/** Width used when the app does not request a specific size. */
export const DEFAULT_LOCATION_PHOTO_WIDTH_PX = 800;

export class LocationPhotoNotFoundError extends Error {}

@Injectable()
export class GetLocationPhotoUseCase {
  constructor(private readonly places: PlacesProvider) {}

  /** Resolves the public URL of a place photo; the app loads it only when the card is shown. */
  async execute(photoName: string, maxWidthPx = DEFAULT_LOCATION_PHOTO_WIDTH_PX): Promise<string> {
    const url = await this.places.getPhotoUrl(photoName, maxWidthPx);

    if (!url) {
      throw new LocationPhotoNotFoundError('Foto do local não encontrada');
    }

    return url;
  }
}
