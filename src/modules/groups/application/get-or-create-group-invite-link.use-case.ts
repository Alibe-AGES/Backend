import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { GroupInviteLink } from '../domain/group-invite-link.entity';
import { GroupRepository } from '../domain/group.repository';
import { GetGroupInviteLinkResponseDto } from '../http/dto/get-group-invite-link-response.dto';

const INVITE_VALIDITY_IN_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class GetOrCreateGroupInviteLinkUseCase {
  constructor(private readonly groups: GroupRepository) {}

  async execute(groupId: string): Promise<GetGroupInviteLinkResponseDto> {
    const now = new Date();
    const currentInviteLink = await this.groups.findLatestInviteLinkByGroupId(groupId);

    if (currentInviteLink && !currentInviteLink.isExpired(now)) {
      return this.toResponse(currentInviteLink);
    }

    const newInviteLink = await this.groups.createInviteLink({
      id: randomUUID(),
      token: randomUUID(),
      validity: new Date(now.getTime() + INVITE_VALIDITY_IN_MILLISECONDS),
      createdAt: now,
      groupId,
    });

    return this.toResponse(newInviteLink);
  }

  private toResponse(inviteLink: GroupInviteLink): GetGroupInviteLinkResponseDto {
    return {
      token: inviteLink.token,
      expiresAt: inviteLink.validity,
    };
  }
}
