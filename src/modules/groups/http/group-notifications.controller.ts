import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import {
  GroupNotificationNotFoundError,
  NotificationGroupAccessDeniedError,
  NotificationGroupNotFoundError,
} from '../application/group-notification.errors';
import { ListGroupNotificationsUseCase } from '../application/list-group-notifications.use-case';
import { MarkAllGroupNotificationsReadUseCase } from '../application/mark-all-group-notifications-read.use-case';
import { MarkGroupNotificationReadUseCase } from '../application/mark-group-notification-read.use-case';
import {
  GroupNotificationResponseDto,
  PaginatedGroupNotificationsResponseDto,
} from './dto/group-notification-response.dto';
import { ListGroupNotificationsQueryDto } from './dto/list-group-notifications-query.dto';

@ApiTags('Group notifications')
@ApiCookieAuth('better-auth')
@ApiBearerAuth('better-auth-bearer')
@Controller('groups')
export class GroupNotificationsController {
  constructor(
    private readonly listNotifications: ListGroupNotificationsUseCase,
    private readonly markAllNotificationsRead: MarkAllGroupNotificationsReadUseCase,
    private readonly markNotificationRead: MarkGroupNotificationReadUseCase
  ) {}

  @Get(':groupId/notifications')
  @ApiOperation({ summary: 'Lista o mural de notificações compartilhado pelo grupo' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({ type: PaginatedGroupNotificationsResponseDto })
  @ApiBadRequestResponse({ description: 'Identificador ou paginação inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  async list(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Query() query: ListGroupNotificationsQueryDto,
    @Request() request: AuthenticatedRequest
  ): Promise<PaginatedGroupNotificationsResponseDto> {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    try {
      const result = await this.listNotifications.execute({
        groupId,
        userId,
        page: query.page,
        limit: query.limit,
      });

      return {
        items: result.items.map((notification): GroupNotificationResponseDto => ({
          ...notification,
        })),
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      if (error instanceof NotificationGroupNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof NotificationGroupAccessDeniedError) {
        throw new ForbiddenException(error.message);
      }

      throw error;
    }
  }

  @Patch(':groupId/notifications/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marca todas as notificações do grupo como lidas pelo usuário' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Notificações marcadas como lidas.' })
  @ApiBadRequestResponse({ description: 'Identificador de grupo inválido.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  async markAllAsRead(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Request() request: AuthenticatedRequest
  ): Promise<void> {
    const userId = this.authenticatedUserId(request);

    try {
      await this.markAllNotificationsRead.execute({ groupId, userId });
    } catch (error) {
      this.rethrowHttpError(error);
    }
  }

  @Patch(':groupId/notifications/:notificationId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marca uma notificação específica do grupo como lida pelo usuário' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({ name: 'notificationId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Notificação marcada como lida.' })
  @ApiBadRequestResponse({ description: 'Identificador inválido.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo.' })
  @ApiNotFoundResponse({ description: 'Grupo ou notificação não encontrado.' })
  async markOneAsRead(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Param('notificationId', new ParseUUIDPipe()) notificationId: string,
    @Request() request: AuthenticatedRequest
  ): Promise<void> {
    const userId = this.authenticatedUserId(request);

    try {
      await this.markNotificationRead.execute({ groupId, notificationId, userId });
    } catch (error) {
      this.rethrowHttpError(error);
    }
  }

  private authenticatedUserId(request: AuthenticatedRequest): string {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }

  private rethrowHttpError(error: unknown): never {
    if (error instanceof NotificationGroupNotFoundError) {
      throw new NotFoundException(error.message);
    }

    if (error instanceof NotificationGroupAccessDeniedError) {
      throw new ForbiddenException(error.message);
    }

    if (error instanceof GroupNotificationNotFoundError) {
      throw new NotFoundException(error.message);
    }

    throw error;
  }
}
