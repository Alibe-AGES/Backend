import { Event } from '../../src/modules/events/domain/event.entity';
import {
  type CreatedEvent,
  type CreateEventData,
  type EventDetails,
  type EventDetailsAccess,
  type EventCreationLocation,
  type EventImageAccess,
  EventRepository,
  type UpdateEventData,
  EventMemories,
} from '../../src/modules/events/domain/event.repository';

export class InMemoryEventRepository extends EventRepository {
  private readonly events = new Map<string, Event>();
  private readonly locations = new Map<string, string>();
  private readonly groups = new Map<string, Set<string>>();
  private readonly creationLocations = new Map<
    string,
    EventCreationLocation & { description: string | null; manuallyCreated: boolean | null }
  >();
  private readonly memories = new Map<
    string,
    Array<{ id: string; picture: string; eventId: string }>
  >();

  findById(id: string): Promise<Event | null> {
    return Promise.resolve(this.events.get(id) ?? null);
  }

  findGroupMembership(groupId: string, userId: string): Promise<boolean | null> {
    const members = this.groups.get(groupId);
    return Promise.resolve(members ? members.has(userId) : null);
  }

  setLocation(
    location: EventCreationLocation & {
      description: string | null;
      manuallyCreated: boolean | null;
    }
  ): void {
    this.creationLocations.set(location.id, location);
  }

  findLocationById(id: string): Promise<EventCreationLocation | null> {
    return Promise.resolve(this.creationLocations.get(id) ?? null);
  }

  findImageAccess(eventId: string, userId: string): Promise<EventImageAccess | null> {
    const event = this.events.get(eventId);

    if (!event) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      imageKey: event.image,
      userIsMember: this.groups.get(event.groupId)?.has(userId) ?? false,
    });
  }

  create(data: CreateEventData): Promise<CreatedEvent> {
    return Promise.resolve(this.persist(data));
  }

  private persist(data: Omit<CreateEventData, 'notification'>): CreatedEvent {
    const existingLocation =
      data.location.kind === 'existing' ? this.creationLocations.get(data.location.id) : null;
    const eventLocation = existingLocation
      ? {
          id: existingLocation.id,
          description: existingLocation.description,
          manuallyCreated: existingLocation.manuallyCreated,
        }
      : {
          id: data.location.id,
          description: data.location.kind === 'new' ? data.location.address : null,
          manuallyCreated: true,
        };
    const event = new Event({
      id: data.id,
      name: data.name,
      timeslot: data.timeslot,
      image: data.image,
      budgetStart: data.budgetStart,
      budgetEnd: data.budgetEnd,
      status: data.status,
      groupId: data.groupId,
      location: eventLocation,
      proposals: [
        {
          id: '55555555-5555-4555-8555-555555555555',
          ownerId: data.ownerId,
          ownerDetails: {
            name: 'Ana Beatriz Silva', // Mock
            image: 'https://example.com/users/ana.jpg', // Mock
          },
          responses: [
            {
              id: '66666666-6666-4666-8666-666666666666',
              answer: data.ownerAnswer,
              createdAt: data.createdAt,
              userId: data.ownerId,
              user: {
                name: 'Ana Beatriz Silva', // Mock
                image: 'https://example.com/users/ana.jpg', // Mock
              },
            },
          ],
          createdAt: data.createdAt,
        },
      ],
      createdAt: data.createdAt,
      updatedAt: data.createdAt,
    });
    this.events.set(event.id, event);

    return {
      event,
      ownerResponse: {
        id: '66666666-6666-4666-8666-666666666666',
        userId: data.ownerId,
        answer: data.ownerAnswer,
      },
    };
  }

  update(id: string, data: UpdateEventData): Promise<Event> {
    const current = this.events.get(id);

    if (!current) {
      return Promise.reject(new Error('Event not found'));
    }

    const locationId = data.location
      ? (this.locations.get(data.location) ?? '66666666-6666-4666-8666-666666666666')
      : current.location.id;

    if (data.location) {
      this.locations.set(data.location, locationId);
    }

    const updated = new Event({
      ...current,
      ...data,
      updatedAt: new Date('2026-09-23T14:00:00.000Z'),
      location: data.location
        ? { id: locationId, description: data.location, manuallyCreated: true }
        : current.location,
    });
    this.events.set(id, updated);
    return Promise.resolve(updated);
  }

  set(event: Event): void {
    this.events.set(event.id, event);
  }

  setGroupMembers(groupId: string, userIds: string[]): void {
    this.groups.set(groupId, new Set(userIds));
  }

  findEventDetails(id: string, userId: string): Promise<EventDetailsAccess | null> {
    const event = this.events.get(id);

    if (!event) {
      return Promise.resolve(null);
    }

    const proposal = event.proposals[0];

    if (!proposal?.ownerDetails || !proposal.createdAt) {
      return Promise.reject(new Error('Evento sem proposta associada'));
    }

    const eventDetails: EventDetails = {
      id: event.id,
      name: event.name,
      image: event.image,
      timeslot: event.timeslot,
      budgetStart: event.budgetStart as string,
      budgetEnd: event.budgetEnd as string,
      status: event.status as EventDetails['status'],
      groupId: event.groupId,
      location: event.location,
      proposal: {
        id: proposal.id,
        owner: {
          id: proposal.ownerId,
          name: proposal.ownerDetails.name,
          image: proposal.ownerDetails.image,
        },
        responses: (proposal.responses ?? []).map((response) => ({
          id: response.id,
          answer: response.answer,
          createdAt: response.createdAt as Date,
          user: {
            id: response.userId,
            name: response.user?.name ?? '',
            image: response.user?.image ?? null,
          },
        })),
        createdAt: proposal.createdAt,
      },
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };

    return Promise.resolve({
      event: eventDetails,
      userIsMember: this.groups.get(event.groupId)?.has(userId) ?? false,
    });
  }

  setMemories(
    eventId: string,
    eventMemories: Array<{ id: string; picture: string; eventId: string }>
  ): void {
    this.memories.set(eventId, eventMemories);
  }

  addGroupMember(groupId: string, userId: string): void {
    const members = this.groups.get(groupId) ?? new Set<string>();
    members.add(userId);
    this.groups.set(groupId, members);
  }

  findMemories(eventId: string, userId: string): Promise<EventMemories | null> {
    const event = this.events.get(eventId);

    if (!event) {
      return Promise.resolve(null);
    }

    const eventMemories = this.memories.get(eventId) ?? [];
    const userIsMember = this.groups.get(event.groupId)?.has(userId);

    return Promise.resolve({
      memories: eventMemories,
      userIsMember,
    });
  }
}
