import { Injectable } from '@nestjs/common';
import { AvailabilitiesResponseDto } from '../http/dto/get-availabilities-response.dto';
import { GroupRepository } from '../domain/group.repository';

export class GroupNotFoundError extends Error {}

@Injectable()
export class GetAvailabilityIntervalsUseCase {
  constructor(private readonly groups: GroupRepository) {}

  async execute(groupId: string, date: string, userId: string): Promise<AvailabilitiesResponseDto> {
    return await this.groups.findAvailabilitiesByDate(groupId, date, userId);
  }
}
