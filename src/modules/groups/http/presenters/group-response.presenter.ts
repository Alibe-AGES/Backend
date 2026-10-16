import { GroupListItemResponseDto } from '../dto/group-list-item-response.dto';

export class GroupResponsePresenter {
  static profilePictureUrl(groupId: string, profilePictureKey: string | null): string | null {
    return profilePictureKey ? `/groups/${groupId}/profile-picture` : null;
  }

  static toResponse(group: GroupListItemResponseDto): GroupListItemResponseDto {
    return {
      ...group,
      profilePic: this.profilePictureUrl(group.id, group.profilePic),
    };
  }
}
