import { EventDetails, EventRepository } from '../../src/modules/event/domain/event.repository';

export class InMemoryEventRepository extends EventRepository {
  private readonly events = new Map<string, EventDetails>();

  findUnique(id: string): Promise<EventDetails | null> {
    return Promise.resolve(this.events.get(id));
  }
}
