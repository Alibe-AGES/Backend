import { BadRequestException, Injectable } from '@nestjs/common';
import { AvailabilitiesResponseDto } from '../http/dto/get-availabilities-response.dto';
import { GroupRepository } from '../domain/group.repository';

export class GroupNotFoundError extends Error {}

@Injectable()
export class GetAvailabilityIntervalsUseCase {
  constructor(private readonly groups: GroupRepository) {}

  async execute(groupId: string, date: string, userId: string): Promise<AvailabilitiesResponseDto> {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) {
      throw new BadRequestException("Formato inválido de data");
    }
    
    return await this.groups.findAvailabilitiesByDate(groupId, date, userId);
  }
}
