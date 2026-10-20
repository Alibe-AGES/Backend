import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { LocationRepository, type StoredLocation } from '../domain/location.repository';

@Injectable()
export class PrismaLocationRepository extends LocationRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findById(id: string): Promise<StoredLocation | null> {
    return this.prisma.location.findUnique({
      where: { id },
      select: {
        id: true,
        externalId: true,
        description: true,
        address: true,
        manuallyCreated: true,
      },
    });
  }
}
