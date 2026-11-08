import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LocationRepository, type StoredLocation } from '../domain/location.repository';

@Injectable()
export class PrismaLocationRepository extends LocationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<StoredLocation | null> {
    const location = await this.prisma.location.findUnique({
      where: { id },
      select: {
        id: true,
        externalId: true,
        name: true,
        description: true,
        address: true,
        openingHours: true,
        rating: true,
        phoneNumber: true,
        website: true,
        priceStart: true,
        priceEnd: true,
        priceCurrency: true,
        image: true,
        manuallyCreated: true,
      },
    });
    return location
      ? {
          id: location.id,
          externalId: location.externalId,
          name: location.name,
          description: location.description,
          address: location.address,
          openingHours: location.openingHours,
          rating: location.rating,
          phoneNumber: location.phoneNumber,
          website: location.website,
          priceRange: {
            start: location.priceStart?.toFixed(2) ?? null,
            end: location.priceEnd?.toFixed(2) ?? null,
            currencyCode: location.priceCurrency,
          },
          image: location.image,
          manuallyCreated: location.manuallyCreated,
        }
      : null;
  }

  async findImageAccess(id: string, userId: string) {
    const location = await this.prisma.location.findUnique({
      where: { id },
      select: {
        image: true,
        proposals: {
          where: { group: { users: { some: { userId } } } },
          select: { id: true },
          take: 1,
        },
        events: {
          where: { group: { users: { some: { userId } } } },
          select: { id: true },
          take: 1,
        },
      },
    });

    return location
      ? {
          imageKey: location.image,
          userIsMember: location.proposals.length > 0 || location.events.length > 0,
        }
      : null;
  }
}
