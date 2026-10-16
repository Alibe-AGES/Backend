import { Injectable } from '@nestjs/common';
import { GroupRepository } from '../domain/group.repository';
import { JoinGroupByInviteResponseDto } from '../http/dto/join-group-by-invite-response.dto';

export class InviteLinkNotFoundError extends Error {}

export class InviteLinkExpiredError extends Error {}

@Injectable()
export class JoinGroupByInviteUseCase {
  constructor(private readonly groups: GroupRepository) {}

  async execute(token: string, userId: string): Promise<JoinGroupByInviteResponseDto> {
    const inviteLink = await this.groups.findInviteLinkByToken(token);

    if (!inviteLink) {
      throw new InviteLinkNotFoundError('Convite não encontrado');
    }

    if (inviteLink.isExpired(new Date())) {
      throw new InviteLinkExpiredError('Convite expirado');
    }

    await this.groups.addMember(inviteLink.groupId, userId);

    return {
      token: inviteLink.token,
    };
  }
}
