import { Event } from '../../src/modules/events/domain/event.entity';
import {
  EventRepository,
  type UpdateEventData,
} from '../../src/modules/events/domain/event.repository';

export class InMemoryEventRepository extends EventRepository {
  private readonly events = new Map<string, Event>();
  private readonly locations = new Map<string, string>();

  findById(id: string): Promise<Event | null> {
    return Promise.resolve(this.events.get(id) ?? null);
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
}
