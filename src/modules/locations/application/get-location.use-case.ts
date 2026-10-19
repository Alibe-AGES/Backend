import { Injectable } from '@nestjs/common';
import { type LocationDetails, LocationRepository } from '../domain/location.repository';

export class LocationNotFoundError extends Error {}

@Injectable()
export class GetLocationUseCase {
  constructor(private readonly locations: LocationRepository) {}

  async execute(locationId: string): Promise<LocationDetails> {
    const location = await this.locations.findById(locationId);

    if (!location) {
      throw new LocationNotFoundError('Local não encontrado');
    }

    return location;
  }
}
