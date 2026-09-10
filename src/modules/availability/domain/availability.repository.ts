import { Availability } from './availability.entity';

export interface CreateAvailabilityData {
  groupId: string;
  userId: string;
  date: Date;
  timeslotStart?: Date | null;
  timeslotEnd?: Date | null;
}

export abstract class AvailabilityRepository {
  abstract create(data: CreateAvailabilityData): Promise<Availability>;
}
