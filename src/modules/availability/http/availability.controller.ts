import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import { AvailabilityResponseDto } from './dto/availability-response.dto';
import { CreateAvailabilityDto } from './dto/create-availability.dto';
import {
  AvailabilityAccessDeniedError,
  AvailabilityGroupNotFoundError,
  CreateAvailabilityUseCase,
  InvalidAvailabilityError,
} from '../application/create-availability.use-case';
import { Availability } from '../domain/availability.entity';

@ApiTags('Availability')
@Controller('groups/:groupId/availabilities')
export class AvailabilityController {
  constructor(private readonly createUseCase: CreateAvailabilityUseCase) {}
  /**
   * POST /groups/:groupId/availabilities
   * Registra disponibilidade para um dia. startTime e endTime são opcionais, mas devem ser
   * enviados juntos. O userId é extraído do usuário autenticado.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra a disponibilidade do usuário no grupo' })
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
    description: 'Disponibilidade registrada com sucesso.',
    type: AvailabilityResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'groupId, date ou intervalo de horários inválido.',
  })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  async create(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Body() input: CreateAvailabilityDto,
    @Request() request: AuthenticatedRequest
  ): Promise<AvailabilityResponseDto> {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    try {
      const response = await this.createUseCase.create({
        groupId,
        userId,
        date: input.date,
        timeslotStart: input.startTime ?? null,
        timeslotEnd: input.endTime ?? null,
      });

      return this.toResponse(response);
    } catch (error) {
      if (error instanceof InvalidAvailabilityError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof AvailabilityAccessDeniedError) {
        throw new ForbiddenException(error.message);
      }

      if (error instanceof AvailabilityGroupNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  private toResponse(availability: Availability): AvailabilityResponseDto {
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
