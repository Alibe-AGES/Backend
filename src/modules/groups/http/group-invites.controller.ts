import {
  Controller,
  ForbiddenException,
  Get,
  GoneException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiGoneResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import {
  GetOrCreateGroupInviteLinkUseCase,
  GroupInviteAccessDeniedError,
  GroupInviteGroupNotFoundError,
} from '../application/get-or-create-group-invite-link.use-case';
import {
  InviteLinkExpiredError,
  InviteLinkNotFoundError,
  JoinGroupByInviteUseCase,
} from '../application/join-group-by-invite.use-case';
import { JoinGroupByInviteResponseDto } from './dto/join-group-by-invite-response.dto';
import { GetGroupInviteLinkResponseDto } from './dto/get-group-invite-link-response.dto';

@ApiTags('Group invites')
@Controller()
export class GroupInvitesController {
  constructor(
    private readonly getOrCreateGroupInviteLinkUseCase: GetOrCreateGroupInviteLinkUseCase,
    private readonly joinGroupByInviteUseCase: JoinGroupByInviteUseCase
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
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  async getInviteLink(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Request() request: AuthenticatedRequest
  ): Promise<GetGroupInviteLinkResponseDto> {
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('Authenticated user not found');

    try {
      return await this.getOrCreateGroupInviteLinkUseCase.execute(groupId, userId);
    } catch (error) {
      if (error instanceof GroupInviteGroupNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof GroupInviteAccessDeniedError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  /**
   * POST /invite-links/:token/join
   * Valida o token do convite e adiciona o usuário autenticado ao grupo correspondente.
   */
  @Post('invite-links/:token/join')
  @ApiOperation({ summary: 'Adiciona o usuário autenticado ao grupo do convite' })
  @ApiParam({ name: 'token', format: 'uuid' })
  @ApiCreatedResponse({
    description: 'Usuário adicionado ao grupo com sucesso.',
    type: JoinGroupByInviteResponseDto,
  })
  @ApiBadRequestResponse({ description: 'token deve ser um UUID válido.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiNotFoundResponse({ description: 'Convite não encontrado.' })
  @ApiGoneResponse({ description: 'Convite expirado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  async join(
    @Param('token', new ParseUUIDPipe()) token: string,
    @Request() request: AuthenticatedRequest
  ): Promise<JoinGroupByInviteResponseDto> {
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('Authenticated user not found');

    try {
      return await this.joinGroupByInviteUseCase.execute(token, userId);
    } catch (error) {
      if (error instanceof InviteLinkNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof InviteLinkExpiredError) {
        throw new GoneException(error.message);
      }
      throw error;
    }
  }
}
