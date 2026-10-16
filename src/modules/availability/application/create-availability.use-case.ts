import { Injectable } from '@nestjs/common';
import { Availability } from '../domain/availability.entity';
import { AvailabilityRepository } from '../domain/availability.repository';

export interface CreateAvailabilityIntervalInput {
  timeslotStart?: string | null;
  timeslotEnd?: string | null;
}

export interface CreateAvailabilityInput {
  groupId: string;
  userId: string;
  date: string;
  intervals?: CreateAvailabilityIntervalInput[];
}

export class InvalidAvailabilityError extends Error {}

export class AvailabilityGroupNotFoundError extends Error {}

export class AvailabilityAccessDeniedError extends Error {}

@Injectable()
export class CreateAvailabilityUseCase {
  constructor(private readonly availabilities: AvailabilityRepository) {}

  async create(input: CreateAvailabilityInput): Promise<Availability[]> {
    const date = this.parseDateTime(input.date);

    if (date < this.today()) {
      throw new InvalidAvailabilityError('date deve ser hoje ou uma data futura');
    }

    const intervalsToProcess = input.intervals?.length
      ? input.intervals
      : [{ timeslotStart: null, timeslotEnd: null }];

    const availabilitiesToCreate = intervalsToProcess.map((interval) => {
      const hasTimeslotStart = interval.timeslotStart != null;
      const hasTimeslotEnd = interval.timeslotEnd != null;

      if (hasTimeslotStart !== hasTimeslotEnd) {
        throw new InvalidAvailabilityError(
          'startTime e endTime devem estar ambos preenchidos ou nenhum'
        );
      }
      const timeslotStart = interval.timeslotStart
        ? this.parseDateTime(input.date, interval.timeslotStart)
        : null;
      const timeslotEnd = interval.timeslotEnd
        ? this.parseDateTime(input.date, interval.timeslotEnd)
        : null;

      if (timeslotStart && timeslotEnd && timeslotStart >= timeslotEnd) {
        throw new InvalidAvailabilityError('endTime deve ser posterior a startTime');
      }

      return {
        groupId: input.groupId,
        userId: input.userId,
        date,
        timeslotStart,
        timeslotEnd,
      };
    });

    const userIsMember = await this.availabilities.findGroupMembership(input.groupId, input.userId);

    if (userIsMember === null) {
      throw new AvailabilityGroupNotFoundError('Group not found');
    }

    if (!userIsMember) {
      throw new AvailabilityAccessDeniedError('User does not belong to this group');
    }

    return this.availabilities.createMany(availabilitiesToCreate);
  }

  private parseDateTime(dateStr: string, timeStr?: string): Date {
    if (!timeStr) {
      return new Date(`${dateStr}T00:00:00.000Z`);
    }
    return new Date(`${dateStr}T${timeStr}:00.000Z`);
  }

  private today(): Date {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    return today;
  }
}
