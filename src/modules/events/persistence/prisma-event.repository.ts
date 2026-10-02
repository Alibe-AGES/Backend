import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Event } from '../domain/event.entity';
import {
  type CreatedEvent,
  type CreateEventData,
  type EventDetails,
  type EventDetailsAccess,
  type EventImageAccess,
  EventRepository,
  type UpdateEventData,
} from '../domain/event.repository';

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

  async findImageAccess(eventId: string, userId: string): Promise<EventImageAccess | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        image: true,
        group: {
          select: {
            users: {
              where: { userId },
              select: { userId: true },
              take: 1,
            },
          },
        },
      },
    });

    if (!event) {
      return null;
    }

    return {
      imageKey: event.image,
      userIsMember: event.group.users.length > 0,
    };
  }

  async create(data: CreateEventData): Promise<CreatedEvent> {
    const { event, ownerResponse } = await this.prisma.$transaction(async (transaction) => {
      const location = await transaction.location.create({
        data: {
          description: data.location.description,
          manuallyCreated: data.location.manuallyCreated,
        },
        select: { id: true },
      });

      await transaction.event.create({
        data: {
          id: data.id,
          name: data.name,
          timeslot: data.timeslot,
          image: data.image,
          budgetStart: data.budgetStart,
          budgetEnd: data.budgetEnd,
          status: data.status,
          createdAt: data.createdAt,
          groupId: data.groupId,
          locationId: location.id,
        },
        select: { id: true },
      });

      const proposal = await transaction.proposal.create({
        data: { eventId: data.id, ownerId: data.ownerId, createdAt: data.createdAt },
        select: { id: true },
      });

      const ownerResponse = await transaction.proposalResponse.create({
        data: {
          proposalId: proposal.id,
          userId: data.ownerId,
          answer: data.ownerAnswer,
          createdAt: data.createdAt,
        },
        select: { id: true, userId: true, answer: true },
      });

      const event = await transaction.event.findUniqueOrThrow({
        where: { id: data.id },
        include: eventInclude,
      });

      return { event, ownerResponse };
    });

    return { event: this.toDomain(event), ownerResponse };
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

  async findEventDetails(eventId: string, userId: string): Promise<EventDetailsAccess | null> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        image: true,
        timeslot: true,
        budgetStart: true,
        budgetEnd: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        groupId: true,
        group: {
          select: {
            users: {
              where: { userId },
              select: { userId: true },
              take: 1,
            },
          },
        },
        location: {
          select: {
            id: true,
            description: true,
            manuallyCreated: true,
          },
        },
        proposals: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            id: true,
            owner: {
              select: {
                id: true,
                name: true,
                profilePic: true,
              },
            },
            responses: {
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                answer: true,
                createdAt: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    profilePic: true,
                  },
                },
              },
            },
            createdAt: true,
          },
        },
      },
    });

    if (!event) {
      return null;
    }

    const proposal = event.proposals[0];

    if (!proposal) {
      throw new Error('Evento sem proposta associada');
    }

    const details: EventDetails = {
      id: event.id,
      name: event.name,
      image: event.image,
      timeslot: event.timeslot,
      budgetStart: event.budgetStart?.toFixed(2) ?? null,
      budgetEnd: event.budgetEnd?.toFixed(2) ?? null,
      status: event.status,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      groupId: event.groupId,
      location: event.location
        ? {
            id: event.location.id,
            description: event.location.description,
            manuallyCreated: event.location.manuallyCreated,
          }
        : null,
      proposal: {
        id: proposal.id,
        owner: {
          id: proposal.owner.id,
          name: proposal.owner.name,
          image: proposal.owner.profilePic,
        },
        responses: proposal.responses.map((response) => ({
          id: response.id,
          answer: response.answer,
          createdAt: response.createdAt,
          user: {
            id: response.user.id,
            name: response.user.name,
            image: response.user.profilePic,
          },
        })),
        createdAt: proposal.createdAt,
      },
    };

    return {
      event: details,
      userIsMember: event.group.users.length > 0,
    };
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
