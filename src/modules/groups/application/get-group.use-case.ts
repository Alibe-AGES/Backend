import { Injectable } from '@nestjs/common';
import { GroupRepository } from '../domain/group.repository';
import { GroupDetailsResponseDto } from '../http/dto/group-details-response.dto';

export class GroupNotFoundError extends Error {}

@Injectable()
export class GetGroupUseCase {
  constructor(private readonly groups: GroupRepository) {}

  async execute(groupId: string): Promise<GroupDetailsResponseDto> {
    const group = await this.groups.findDetailsById(groupId);

    if (!group) {
      throw new GroupNotFoundError('Grupo não encontrado');
    }

    return {
      id: group.id,
      name: group.name,
      profilePic: group.profilePic ? `/groups/${group.id}/profile-picture` : null,
      createdAt: group.createdAt,
      participants: group.participants.map((participant) => ({
        id: participant.id,
        name: participant.name ?? '',
        profilePic: participant.profilePic,
      })),
      nextEvent: group.nextEvent
        ? {
            id: group.nextEvent.id,
            name: group.nextEvent.name ?? '',
            timeslot: group.nextEvent.timeslot,
            status: group.nextEvent.status,
          }
        : null,
    };
  }
}
