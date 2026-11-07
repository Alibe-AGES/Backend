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
  CreateMemoryData,
  EventMemoryDetails,
  EventMemoryAccess,
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
            name: 'Ana Beatriz Silva',
            image: 'https://example.com/users/ana.jpg',
          },
          responses: [
            {
              id: '66666666-6666-4666-8666-666666666666',
              answer: data.ownerAnswer,
              createdAt: data.createdAt,
              userId: data.ownerId,
              user: {
                name: 'Ana Beatriz Silva',
                image: 'https://example.com/users/ana.jpg',
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
    if (!event.proposals || event.proposals.length === 0) {
      const patchedEvent = new Event({
        ...event,
        proposals: [
          {
            id: '55555555-5555-4555-8555-555555555555',
            ownerId: 'user-id-mock',
            ownerDetails: {
              name: 'Ana Beatriz Silva',
              image: 'https://example.com/users/ana.jpg',
            },
            responses: [],
            createdAt: event.createdAt,
          },
        ],
      });
      this.events.set(patchedEvent.id, patchedEvent);
      return;
    }

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

    // Fallback seguro caso o mock venha sem ownerDetails ou createdAt
    const ownerDetails = proposal?.ownerDetails ?? {
      name: 'Ana Beatriz Silva',
      image: 'https://example.com/users/ana.jpg',
    };
    const proposalCreatedAt = proposal?.createdAt ?? event.createdAt;

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
        id: proposal?.id ?? '55555555-5555-4555-8555-555555555555',
        owner: {
          id: proposal?.ownerId ?? 'owner-id-mock',
          name: ownerDetails.name,
          image: ownerDetails.image,
        },
        responses: (proposal?.responses ?? []).map((response) => ({
          id: response.id,
          answer: response.answer,
          createdAt: response.createdAt as Date,
          user: {
            id: response.userId,
            name: response.user?.name ?? '',
            image: response.user?.image ?? null,
          },
        })),
        createdAt: proposalCreatedAt,
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

  createMemory(data: CreateMemoryData): Promise<EventMemoryDetails | null> {
    const memoryRecord = {
      id: data.id,
      eventId: data.eventId,
      picture: data.picture,
    };

    const existingMemories = this.memories.get(data.eventId) ?? [];
    this.memories.set(data.eventId, [...existingMemories, memoryRecord]);

    return Promise.resolve({
      id: data.id,
      picture: data.picture,
      eventId: data.eventId,
    });
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

  findMemoryById(
    id: string,
    eventId: string,
    userId: string
  ): Promise<EventMemoryAccess | null> {
    const eventMemories = this.memories.get(eventId);

    if (!eventMemories || eventMemories.length === 0) {
      return null;
    }

    const memory = eventMemories.find((m) => m.id === id);

    if (!memory) {
      return null;
    }

    const event = this.events.get(eventId);
    if (!event) {
      return null;
    }

    const groupMembers = this.groups.get(event.groupId);
    const userIsMember = groupMembers ? groupMembers.has(userId) : false;

    return Promise.resolve({
      memory: {
        id: memory.id,
        picture: memory.picture,
        eventId: memory.eventId,
      },
      userIsMember,
    });
  }

  setMemory(eventId: string, memory: { id: string; picture: string; eventId: string }): void {
    const existingMemories = this.memories.get(eventId) ?? [];
    
    const index = existingMemories.findIndex((m) => m.id === memory.id);
    if (index >= 0) {
      existingMemories[index] = memory;
    } else {
      existingMemories.push(memory);
    }

    this.memories.set(eventId, existingMemories);
  }
}
