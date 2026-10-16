import { Injectable } from '@nestjs/common';
import { Group } from '../domain/group.entity';
import { GroupRepository } from '../domain/group.repository';
import { GroupListItemResponseDto } from '../http/dto/group-list-item-response.dto';

@Injectable()
export class ListGroupsUseCase {
  constructor(private readonly groups: GroupRepository) {}

  async execute(userId: string): Promise<GroupListItemResponseDto[]> {
    const groups = await this.groups.findByUserId(userId);

    return groups.map((group: Group) => ({
      id: group.id,
      name: group.name,
      profilePic: group.profilePic,
      createdAt: group.createdAt,
    }));
  }
}
