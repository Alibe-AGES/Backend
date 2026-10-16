import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Query,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import {
  CalendarAccessDeniedError,
  CalendarGroupNotFoundError,
  GetGroupCalendarUseCase,
  InvalidCalendarPeriodError,
} from '../application/get-group-calendar.use-case';
import { CalendarDayResponseDto } from './dto/calendar-day-response.dto';
import { GetGroupCalendarQueryDto } from './dto/get-group-calendar-query.dto';

@ApiTags('Calendar')
@Controller('groups/:groupId/calendar')
export class CalendarController {
  constructor(private readonly getGroupCalendar: GetGroupCalendarUseCase) {}

  /**
   * GET /groups/:groupId/calendar?month=5&year=2026
   * Retorna os dias do mês que possuem eventos, propostas ou disponibilidades. O userId é
   * extraído do usuário autenticado e utilizado para validar o acesso ao grupo.
   */
  @Get()
  @ApiOperation({ summary: 'Obtém o calendário mensal do grupo' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiQuery({
    name: 'month',
    type: Number,
    minimum: 1,
    maximum: 12,
    example: 5,
    description: 'Número do mês entre 1 e 12.',
  })
  @ApiQuery({
    name: 'year',
    type: Number,
    minimum: 1000,
    maximum: 9999,
    example: 2026,
    description: 'Ano do calendário com quatro dígitos.',
  })
  @ApiOkResponse({
    description: 'Dias com informações do calendário retornados com sucesso.',
    type: CalendarDayResponseDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description:
      'groupId deve ser UUID, month deve estar entre 1 e 12 e year deve ter quatro dígitos.',
  })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  async list(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Query() query: GetGroupCalendarQueryDto,
    @Request() request: AuthenticatedRequest
  ): Promise<CalendarDayResponseDto[]> {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    try {
      return await this.getGroupCalendar.execute({
        groupId,
        userId,
        month: query.month,
        year: query.year,
      });
    } catch (error) {
      if (error instanceof InvalidCalendarPeriodError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof CalendarAccessDeniedError) {
        throw new ForbiddenException(error.message);
      }

      if (error instanceof CalendarGroupNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
