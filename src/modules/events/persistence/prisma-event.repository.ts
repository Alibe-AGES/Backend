import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Event } from '../domain/event.entity';
import { EventRepository, type UpdateEventData } from '../domain/event.repository';

const eventInclude = {
  location: true,
  proposals: {
    select: { id: true, ownerId: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.EventInclude;

type EventRecord = Prisma.EventGetPayload<{ include: typeof eventInclude }>;

@Injectable()
export class PrismaEventRepository extends EventRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findById(id: string): Promise<Event | null> {
    const event = await this.prisma.event.findUnique({ where: { id }, include: eventInclude });
    return event ? this.toDomain(event) : null;
  }

  async update(id: string, data: UpdateEventData): Promise<Event> {
    const event = await this.prisma.$transaction(async (transaction) => {
      const updateData: Prisma.EventUpdateInput = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.timeslot !== undefined) updateData.timeslot = data.timeslot;
      if (data.image !== undefined) updateData.image = data.image;
      if (data.budgetStart !== undefined) updateData.budgetStart = data.budgetStart;
      if (data.budgetEnd !== undefined) updateData.budgetEnd = data.budgetEnd;

      if (data.location !== undefined) {
        let location = await transaction.location.findFirst({
          where: { description: data.location, manuallyCreated: true },
          select: { id: true },
        });

        if (!location) {
          location = await transaction.location.create({
            data: { description: data.location, manuallyCreated: true },
            select: { id: true },
          });
        }

        updateData.location = { connect: { id: location.id } };
      }

      return transaction.event.update({ where: { id }, data: updateData, include: eventInclude });
    });

    return this.toDomain(event);
  }

  private toDomain(data: EventRecord): Event {
    return new Event({
      id: data.id,
      name: data.name,
      timeslot: data.timeslot,
      image: data.image,
      budgetStart: data.budgetStart?.toString() ?? null,
      budgetEnd: data.budgetEnd?.toString() ?? null,
      status: data.status,
      groupId: data.groupId,
      location: data.location,
      proposals: data.proposals,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
