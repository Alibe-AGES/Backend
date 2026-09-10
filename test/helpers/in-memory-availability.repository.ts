import { randomUUID } from 'node:crypto';
import { Availability } from '../../src/modules/availability/domain/availability.entity';
import {
  AvailabilityRepository,
  CreateAvailabilityData,
} from '../../src/modules/availability/domain/availability.repository';

export class InMemoryAvailabilityRepository extends AvailabilityRepository {
  private readonly availabilities = new Map<string, Availability>();

  create(data: CreateAvailabilityData): Promise<Availability> {
    const id = randomUUID();
    const availability = new Availability({
      id: id,
      groupId: data.groupId,
      userId: data.userId,
      date: data.date,
      timeslotStart: data.timeslotStart ? data.timeslotStart : null,
      timeslotEnd: data.timeslotEnd ? data.timeslotEnd : null,
    });

    this.availabilities.set(availability.id, availability);
    return Promise.resolve(availability);
  }
}
