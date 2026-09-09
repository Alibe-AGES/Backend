import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Request } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import { AvailabilityResponseDto } from './dto/availability-response.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import { CreateAvailabilityUseCase, InvalidAvailabilityError } from '../application/create-availability.use-case';
import { Availability } from '../domain/availability.entity';

const MOCK_AUTHENTICATED_USER_ID = '11111111-1111-4111-8111-111111111111';

@ApiTags('Availability - Mock')
@Controller('groups/:groupId/availabilities')
export class AvailabilityController {
  constructor(private readonly createUseCase: CreateAvailabilityUseCase) {}
  /**
   * POST /groups/:groupId/availabilities
   * Registra disponibilidade para um dia. startTime e endTime são opcionais, mas devem ser
   * enviados juntos. Futuramente, o userId será extraído da autenticação.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
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
  async create(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Body() input: CreateAvailabilityDto,
    @Request() request: AuthenticatedRequest
  ): Promise<AvailabilityResponseDto> {

    const userId = request.user?.id
    try {
      console.log("DATE ANTES USECASE: " + input.date)

      const response = await this.createUseCase.create({
        groupId: groupId,
        userId: userId,
        date: input.date,
        timeslotStart: input.startTime ? input.startTime : null,
        timeslotEnd: input.endTime ? input.endTime : null
      });
      
      return this.toResponse(response);
    }catch(error) {
      if(error instanceof InvalidAvailabilityError) {
        throw new BadRequestException(error.message)
      }
      throw error
    }
  }

  private toResponse(availability: Availability): AvailabilityResponseDto{
    return {
      id: availability.id,
      groupId: availability.groupId,
      userId: availability.userId,
      date: availability.date.toISOString().split('T')[0], 
      startTime: availability.timeslotStart 
        ? availability.timeslotStart.toISOString().substring(11, 16) 
        : null,
      endTime: availability.timeslotEnd 
        ? availability.timeslotEnd.toISOString().substring(11, 16) 
        : null,
    };
  }
}
