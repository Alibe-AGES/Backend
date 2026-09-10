import { Controller, Get, Param, ParseUUIDPipe, Post, Request } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import { GetOrCreateGroupInviteLinkUseCase } from '../application/get-or-create-group-invite-link.use-case';
import { JoinGroupByInviteResponseDto } from './dto/join-group-by-invite-response.dto';
import { GetGroupInviteLinkResponseDto } from './dto/get-group-invite-link-response.dto';

@ApiTags('Group invites')
@Controller()
export class GroupInvitesController {
  constructor(
    private readonly getOrCreateGroupInviteLinkUseCase: GetOrCreateGroupInviteLinkUseCase
  ) {}

  /**
   * GET /groups/:groupId/invite-link
   * Retorna o convite atual do grupo. Cria um token quando ainda não existe e o substitui
   * quando sua data de expiração já passou.
   */
  @Get('groups/:groupId/invite-link')
  @ApiOperation({
    summary: 'Obtém o convite válido do grupo ou cria um novo',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({
    description: 'Convite válido obtido ou criado com sucesso.',
    type: GetGroupInviteLinkResponseDto,
  })
  @ApiBadRequestResponse({ description: 'groupId deve ser um UUID válido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  async getInviteLink(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Request() request: AuthenticatedRequest
  ): Promise<GetGroupInviteLinkResponseDto> {
    // Disponível para a futura validação de acesso ao grupo.
    const userId = request.user?.id;
    void userId;

    return this.getOrCreateGroupInviteLinkUseCase.execute(groupId);
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
  join(
    @Param('token', new ParseUUIDPipe()) token: string,
    @Request() request: AuthenticatedRequest
  ): JoinGroupByInviteResponseDto {
    // Será usado para vincular o usuário autenticado ao grupo do convite.
    const userId = request.user?.id;
    void userId;

    return {
      token,
    };
  }
}
