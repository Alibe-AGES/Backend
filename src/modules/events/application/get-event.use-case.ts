import { Injectable } from '@nestjs/common';
import { type EventDetails, EventRepository } from '../domain/event.repository';

export class EventNotFoundError extends Error {}
export class EventDetailsAccessDeniedError extends Error {}

@Injectable()
export class GetEventUseCase {
  constructor(private readonly events: EventRepository) {}

  async execute(eventId: string, userId: string): Promise<EventDetails> {
    const access = await this.events.findEventDetails(eventId, userId);

    if (!access) {
      throw new EventNotFoundError('Evento não encontrado');
    }

    if (!access.userIsMember) {
      throw new EventDetailsAccessDeniedError('O usuário não pertence ao grupo do evento');
    }

    return access.event;
  }
}
