import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { type CatalogLocationData, LocationRepository } from '../domain/location.repository';

@Injectable()
export class PrismaLocationRepository extends LocationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async ensureCatalogLocations(locations: CatalogLocationData[]): Promise<Map<string, string>> {
    const ids = new Map<string, string>();

    if (locations.length === 0) {
      return ids;
    }

    const existing = await this.prisma.location.findMany({
      where: {
        externalId: { in: locations.map((location) => location.externalId) },
        manuallyCreated: false,
      },
      select: { id: true, externalId: true },
    });
    existing.forEach((location) => ids.set(location.externalId as string, location.id));

    const missing = locations.filter((location) => !ids.has(location.externalId));
    if (missing.length > 0) {
      const created = await this.prisma.location.createManyAndReturn({
        data: missing.map((location) => ({ ...location, manuallyCreated: false })),
        select: { id: true, externalId: true },
      });
      created.forEach((location) => ids.set(location.externalId as string, location.id));
    }

    return ids;
  }
}
