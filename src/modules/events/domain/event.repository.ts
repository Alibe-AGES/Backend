import { Event } from './event.entity';

export interface UpdateEventData {
  name?: string;
  timeslot?: Date;
  location?: string;
  image?: string | null;
  budgetStart?: string | null;
  budgetEnd?: string | null;
}

export abstract class EventRepository {
  abstract findById(id: string): Promise<Event | null>;

  abstract update(id: string, data: UpdateEventData): Promise<Event>;
}
