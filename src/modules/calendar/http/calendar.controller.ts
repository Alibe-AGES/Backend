import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CalendarDayResponseDto } from './dto/calendar-day-response.dto';
import { GetGroupCalendarQueryDto } from './dto/get-group-calendar-query.dto';

@ApiTags('Calendar - Mock')
@Controller('groups/:groupId/calendar')
export class CalendarController {
  /**
   * GET /groups/:groupId/calendar?month=5&year=2026
   * Retorna somente os dias do mês que possuem informações para o calendário. Futuramente, o
   * userId será extraído do usuário autenticado e utilizado para validar o acesso ao grupo.
   */
  @Get()
  @ApiOperation({ summary: '[Mock] Obtém o calendário mensal do grupo' })
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
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  list(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Query() query: GetGroupCalendarQueryDto
  ): CalendarDayResponseDto[] {
    // O mock ainda não consulta membros ou permissões. Quando a autenticação existir, o userId
    // será obtido dela e nunca será recebido em path, query ou body.
    void groupId;
    const datePrefix = `${query.year}-${String(query.month).padStart(2, '0')}`;

    return [
      {
        date: `${datePrefix}-08`,
        scheduledEventIds: [],
        proposalIds: [],
        availableUserIds: [],
        allUsersAvailable: false,
        completedEventIds: ['33333333-3333-4333-8333-333333333333'],
      },
      {
        date: `${datePrefix}-18`,
        scheduledEventIds: [],
        proposalIds: [],
        availableUserIds: [
          '11111111-1111-4111-8111-111111111111',
          '22222222-2222-4222-8222-222222222222',
        ],
        allUsersAvailable: true,
        completedEventIds: [],
      },
      {
        date: `${datePrefix}-19`,
        scheduledEventIds: [],
        proposalIds: ['44444444-4444-4444-8444-444444444444'],
        availableUserIds: [],
        allUsersAvailable: false,
        completedEventIds: [],
      },
      {
        date: `${datePrefix}-22`,
        scheduledEventIds: ['55555555-5555-4555-8555-555555555555'],
        proposalIds: ['66666666-6666-4666-8666-666666666666'],
        availableUserIds: ['11111111-1111-4111-8111-111111111111'],
        allUsersAvailable: false,
        completedEventIds: [],
      },
      {
        date: `${datePrefix}-27`,
        scheduledEventIds: [],
        proposalIds: [],
        availableUserIds: ['11111111-1111-4111-8111-111111111111'],
        allUsersAvailable: false,
        completedEventIds: [],
      },
    ];
  }
}
