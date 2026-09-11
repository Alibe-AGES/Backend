import { randomUUID } from 'node:crypto';
import { Availability } from '../../src/modules/availability/domain/availability.entity';
import {
  AvailabilityRepository,
  CreateAvailabilityData,
} from '../../src/modules/availability/domain/availability.repository';

export class InMemoryAvailabilityRepository extends AvailabilityRepository {
  private readonly availabilities = new Map<string, Availability>();
  private membershipResult: boolean | null = true;

  setMembershipResult(result: boolean | null): void {
    this.membershipResult = result;
  }

  findGroupMembership(): Promise<boolean | null> {
    return Promise.resolve(this.membershipResult);
  }

  create(data: CreateAvailabilityData): Promise<Availability> {
    const id = randomUUID();
    const availability = new Availability({
      id,
      groupId: data.groupId,
      userId: data.userId,
      date: data.date,
      timeslotStart: data.timeslotStart ?? null,
      timeslotEnd: data.timeslotEnd ?? null,
    });

    this.availabilities.set(availability.id, availability);
    return Promise.resolve(availability);
  }
}
