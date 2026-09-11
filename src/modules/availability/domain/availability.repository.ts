import { Availability } from './availability.entity';

export interface CreateAvailabilityData {
  groupId: string;
  userId: string;
  date: Date;
  timeslotStart?: Date | null;
  timeslotEnd?: Date | null;
}

export abstract class AvailabilityRepository {
  /** Retorna null quando o grupo não existe. */
  abstract findGroupMembership(groupId: string, userId: string): Promise<boolean | null>;

  abstract create(data: CreateAvailabilityData): Promise<Availability>;
}
