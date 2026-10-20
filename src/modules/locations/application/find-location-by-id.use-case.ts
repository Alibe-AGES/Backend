import { Injectable } from '@nestjs/common';
import { LocationRepository, type StoredLocation } from '../domain/location.repository';
import { LocationNotFoundError } from './get-location.use-case';

@Injectable()
export class FindLocationByIdUseCase {
  constructor(private readonly locations: LocationRepository) {}

  /** Reads the location from the database by its internal id; Google is not queried. */
  async execute(locationId: string): Promise<StoredLocation> {
    const location = await this.locations.findById(locationId);

    if (!location) {
      throw new LocationNotFoundError('Local não encontrado');
    }

    return location;
  }
}
