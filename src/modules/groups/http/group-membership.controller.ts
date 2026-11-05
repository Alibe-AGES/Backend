import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Put,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import {
  GroupMembershipNotFoundError,
  LeaveGroupUseCase,
} from '../application/leave-group.use-case';

@ApiTags('Groups')
@Controller('api/groups')
export class GroupMembershipController {
  constructor(private readonly leaveGroupUseCase: LeaveGroupUseCase) {}

  @Put(':groupId/leave')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Remove o usuário autenticado do grupo' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Participação removida com sucesso. Resposta sem corpo.' })
  @ApiBadRequestResponse({
    description: 'UUID inválido, grupo inexistente ou usuário sem vínculo.',
  })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  async leave(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Request() request: AuthenticatedRequest
  ): Promise<void> {
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('Authenticated user not found');

    try {
      await this.leaveGroupUseCase.execute(groupId, userId);
    } catch (error) {
      if (error instanceof GroupMembershipNotFoundError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
