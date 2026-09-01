import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { AvailabilityResponseDto } from './dto/availability-response.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

const MOCK_AUTHENTICATED_USER_ID = '11111111-1111-4111-8111-111111111111';

@ApiTags('Availability - Mock')
@Controller('groups/:groupId/availabilities')
export class AvailabilityController {
  /**
   * POST /groups/:groupId/availabilities
   * Registra disponibilidade para um dia. startTime e endTime são opcionais, mas devem ser
   * enviados juntos. Futuramente, o userId será extraído da autenticação.
   */
  @Post()
  @ApiOperation({ summary: '[Mock] Registra a disponibilidade do usuário no grupo' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiBody({
    type: CreateAvailabilityDto,
    examples: {
      fullDay: {
        summary: 'Disponível durante o dia todo',
        value: { date: '2026-05-14' },
      },
      interval: {
        summary: 'Disponível em um intervalo',
        value: { date: '2026-05-14', startTime: '18:00', endTime: '22:00' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Disponibilidade registrada com sucesso pelo mock.',
    type: AvailabilityResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'groupId, date ou intervalo de horários inválido.',
  })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  create(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Body() input: CreateAvailabilityDto
  ): AvailabilityResponseDto {
    return {
      id: randomUUID(),
      groupId,
      userId: MOCK_AUTHENTICATED_USER_ID,
      date: input.date,
      startTime: input.startTime ?? null,
      endTime: input.endTime ?? null,
    };
  }
}
