import { Injectable } from '@nestjs/common';
import { EventRepository } from '../domain/event.repository';
import { EventDetailsResponseDto } from '../http/dto/event-details-response.dto';

export class EventNotFoundError extends Error {}

@Injectable()
export class GetEventUseCase {
  constructor(private readonly events: EventRepository) {}

  async execute(eventId: string, userId: string): Promise<EventDetailsResponseDto> {
    const event = await this.events.findEventDetails(eventId, userId);

    if (!event) {
      throw new EventNotFoundError('Evento não encontrado');
    }

    return {
      id: event.id,
      name: event.name,
      timeslot: event.timeslot,
      budgetStart: event.budgetStart,
      budgetEnd: event.budgetEnd,
      status: event.status,
      createdAt: event.createdAt,
      groupId: event.groupId,
      location: event.location
        ? {
            id: event.location.id,
            description: event.location.description,
            manuallyCreated: event.location.manuallyCreated,
          }
        : null,
      proposals: event.proposals.map((proposal) => ({
        id: proposal.id,
        owner: {
          id: proposal.owner.id,
          name: proposal.owner.name,
          image: proposal.owner.image,
        },
        responses: proposal.responses.map((response) => ({
          id: response.id,
          answer: response.answer,
          createdAt: response.createdAt,
          userId: response.user.id,
          userName: response.user.name,
          userProfilePic: response.user.image,
        })),
        createdAt: proposal.createdAt,
      })),
    };
  }
}
