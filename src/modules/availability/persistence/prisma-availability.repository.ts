import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Availability } from '../domain/availability.entity';
import { AvailabilityRepository, CreateAvailabilityData } from '../domain/availability.repository';

@Injectable()
export class PrismaAvailabilityRepository extends AvailabilityRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findGroupMembership(groupId: string, userId: string): Promise<boolean | null> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: {
        users: {
          where: { userId },
          select: { userId: true },
          take: 1,
        },
      },
    });

    return group ? group.users.length > 0 : null;
  }

  async create(data: CreateAvailabilityData): Promise<Availability> {
    const availability = await this.prisma.availability.create({
      data: {
        group: {
          connect: { id: data.groupId },
        },
        user: {
          connect: { id: data.userId },
        },
        date: data.date,
        timeslotStart: data.timeslotStart ?? null,
        timeslotEnd: data.timeslotEnd ?? null,
      },
    });
    return this.toDomain(availability);
  }

  private toDomain(data: {
    id: string;
    groupId: string;
    userId: string;
    date: Date;
    timeslotStart?: Date | null;
    timeslotEnd?: Date | null;
  }): Availability {
    return new Availability(data);
  }
}
