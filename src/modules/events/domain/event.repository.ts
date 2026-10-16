import {
  Event,
  type EventProposalResponse,
  type EventStatus,
  type ProposalAnswer,
} from './event.entity';

export interface EventDetails {
  id: string;
  name: string | null;
  image: string | null;
  timeslot: Date | null;
  budgetStart: string | null;
  budgetEnd: string | null;
  status: EventStatus;
  createdAt: Date | null;
  updatedAt: Date;
  groupId: string;
  location: {
    id: string;
    description: string | null;
    manuallyCreated: boolean | null;
  } | null;
  proposal: {
    id: string;
    owner: {
      id: string;
      name: string;
      image: string | null;
    };
    responses: Array<{
      id: string;
      answer: ProposalAnswer;
      createdAt: Date;
      user: {
        id: string;
        name: string;
        image: string | null;
      };
    }>;
    createdAt: Date;
  };
}

export interface EventDetailsAccess {
  event: EventDetails;
  userIsMember: boolean;
}

export interface UpdateEventData {
  name?: string;
  timeslot?: Date;
  location?: string;
  image?: string | null;
  budgetStart?: string | null;
  budgetEnd?: string | null;
}

export interface CreateEventData {
  id: string;
  groupId: string;
  ownerId: string;
  name: string;
  timeslot: Date;
  location: {
    description: string;
    manuallyCreated: boolean;
  };
  image: string | null;
  budgetStart: string | null;
  budgetEnd: string | null;
  status: EventStatus;
  ownerAnswer: ProposalAnswer;
  createdAt: Date;
}

export interface CreatedEvent {
  event: Event;
  ownerResponse: EventProposalResponse;
}

export interface EventImageAccess {
  imageKey: string | null;
  userIsMember: boolean;
}

export abstract class EventRepository {
  abstract findById(id: string): Promise<Event | null>;

  /** Retorna null quando o grupo não existe. */
  abstract findGroupMembership(groupId: string, userId: string): Promise<boolean | null>;

  /** Cria location, evento, proposta e resposta do criador de forma atômica. */
  abstract create(data: CreateEventData): Promise<CreatedEvent>;

  abstract update(id: string, data: UpdateEventData): Promise<Event>;

  abstract findEventDetails(eventId: string, userId: string): Promise<EventDetailsAccess | null>;

  abstract findImageAccess(eventId: string, userId: string): Promise<EventImageAccess | null>;
}
