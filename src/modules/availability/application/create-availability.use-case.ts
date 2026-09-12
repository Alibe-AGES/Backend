import { Injectable } from '@nestjs/common';
import { Availability } from '../domain/availability.entity';
import { AvailabilityRepository } from '../domain/availability.repository';

export interface CreateAvailabilityInput {
  groupId: string;
  userId: string;
  date: string;
  timeslotStart?: string | null;
  timeslotEnd?: string | null;
}

export class InvalidAvailabilityError extends Error {}

export class AvailabilityGroupNotFoundError extends Error {}

export class AvailabilityAccessDeniedError extends Error {}

@Injectable()
export class CreateAvailabilityUseCase {
  constructor(private readonly availabilities: AvailabilityRepository) {}

  async create(input: CreateAvailabilityInput): Promise<Availability> {
    const hasTimeslotStart = input.timeslotStart != null;
    const hasTimeslotEnd = input.timeslotEnd != null;

    if (hasTimeslotStart !== hasTimeslotEnd) {
      throw new InvalidAvailabilityError(
        'startTime e endTime devem estar ambos preenchidos ou nenhum'
      );
    }

    const date = this.parseDateTime(input.date);
    const timeslotStart = input.timeslotStart
      ? this.parseDateTime(input.date, input.timeslotStart)
      : null;
    const timeslotEnd = input.timeslotEnd
      ? this.parseDateTime(input.date, input.timeslotEnd)
      : null;

    if (timeslotStart && timeslotEnd && timeslotStart >= timeslotEnd) {
      throw new InvalidAvailabilityError('endTime deve ser posterior a startTime');
    }

    const userIsMember = await this.availabilities.findGroupMembership(input.groupId, input.userId);

    if (userIsMember === null) {
      throw new AvailabilityGroupNotFoundError('Group not found');
    }

    if (!userIsMember) {
      throw new AvailabilityAccessDeniedError('User does not belong to this group');
    }

    return this.availabilities.create({
      groupId: input.groupId,
      userId: input.userId,
      date,
      timeslotStart,
      timeslotEnd,
    });
  }

  private parseDateTime(dateStr: string, timeStr?: string): Date {
    if (!timeStr) {
      return new Date(`${dateStr}T00:00:00.000Z`);
    }
    return new Date(`${dateStr}T${timeStr}:00.000Z`);
  }
}
