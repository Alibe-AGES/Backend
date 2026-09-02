import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { JoinGroupByInviteResponseDto } from './dto/join-group-by-invite-response.dto';
import { GetGroupInviteLinkResponseDto } from './dto/get-group-invite-link-response.dto';

interface CurrentInviteLink {
  token: string;
  expiresAt: Date;
}

const INVITE_VALIDITY_IN_MILLISECONDS = 7 * 24 * 60 * 60 * 1000;

@ApiTags('Group invites - Mock')
@Controller()
export class GroupInvitesController {
  private readonly currentInviteLinks = new Map<string, CurrentInviteLink>();

  /**
   * GET /groups/:groupId/invite-link
   * Retorna o convite atual do grupo. O mock cria um token quando ainda não existe e o substitui
   * quando sua data de expiração já passou.
   */
  @Get('groups/:groupId/invite-link')
  @ApiOperation({
    summary: '[Mock] Obtém o convite válido do grupo ou cria um novo',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({
    description: 'Convite válido obtido ou criado com sucesso.',
    type: GetGroupInviteLinkResponseDto,
  })
  @ApiBadRequestResponse({ description: 'groupId deve ser um UUID válido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  getInviteLink(
    @Param('groupId', new ParseUUIDPipe()) groupId: string
  ): GetGroupInviteLinkResponseDto {
    const now = Date.now();
    const currentInviteLink = this.currentInviteLinks.get(groupId);

    if (currentInviteLink && currentInviteLink.expiresAt.getTime() > now) {
      return currentInviteLink;
    }

    const newInviteLink: CurrentInviteLink = {
      token: randomUUID(),
      expiresAt: new Date(now + INVITE_VALIDITY_IN_MILLISECONDS),
    };

    this.currentInviteLinks.set(groupId, newInviteLink);
    return newInviteLink;
  }

  /**
   * POST /invite-links/:token/join
   * Simula o acesso ao convite. Futuramente, o userId será extraído do usuário autenticado e não
   * será recebido em path, query ou body.
   */
  @Post('invite-links/:token/join')
  @ApiOperation({ summary: '[Mock] Acessa um grupo utilizando o token do convite' })
  @ApiParam({ name: 'token', format: 'uuid' })
  @ApiCreatedResponse({
    description: 'Entrada no grupo simulada com sucesso.',
    type: JoinGroupByInviteResponseDto,
  })
  @ApiBadRequestResponse({ description: 'token deve ser um UUID válido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  join(@Param('token', new ParseUUIDPipe()) token: string): JoinGroupByInviteResponseDto {
    return {
      token,
    };
  }
}
