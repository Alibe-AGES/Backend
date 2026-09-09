import { BadRequestException, Injectable } from "@nestjs/common";
import { Availability } from "../domain/availability.entity";
import { AvailabilityRepository } from "../domain/availability.repository";

export interface CreateAvailabilityInput {
  groupId: string;
  userId: string;
  date: string;
  timeslotStart?: string;
  timeslotEnd?: string;
}

export class InvalidAvailabilityError extends Error {}

@Injectable()
export class CreateAvailabilityUseCase {
    constructor(private readonly availabilities: AvailabilityRepository) {}

    async create(input: CreateAvailabilityInput): Promise<Availability> {

      console.log("DATE pre PARSE: " + input.date)
      const availability = await this.availabilities.create({
        groupId: input.groupId,
        userId: input.userId,
        date: this.parseDateTime(input.date),
        timeslotStart: input.timeslotStart ? this.parseDateTime(input.date, input.timeslotStart) : null,
        timeslotEnd: input.timeslotEnd ? this.parseDateTime(input.date, input.timeslotEnd) : null,
      });


      return availability;
    }

    private parseDateTime(dateStr: string, timeStr?: string): Date | null {
      if(!timeStr) {
        return new Date(`${dateStr}T00:00:00.000Z`);
      }
      return new Date(`${dateStr}T${timeStr}:00.000Z`);
    }
}