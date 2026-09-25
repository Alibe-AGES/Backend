import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import {
  EventAccessDeniedError,
  EventNotFoundError,
  InvalidEventUpdateError,
  UpdateEventUseCase,
} from '../application/update-event.use-case';
import { Event } from '../domain/event.entity';
import { EventResponseDto } from './dto/event-response.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@ApiTags('Events')
@Controller('api/events')
export class EventController {
  constructor(private readonly updateEventUseCase: UpdateEventUseCase) {}

  @Patch(':eventId')
  @ApiOperation({ summary: 'Atualiza parcialmente um evento' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiOkResponse({ type: EventResponseDto })
  @ApiBadRequestResponse({ description: 'Identificador ou dados do evento inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não é proprietário de uma proposta do evento.' })
  @ApiNotFoundResponse({ description: 'Evento não encontrado.' })
  async update(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() input: UpdateEventDto,
    @Request() request: AuthenticatedRequest
  ): Promise<EventResponseDto> {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    try {
      const event = await this.updateEventUseCase.execute(eventId, userId, input);
      return this.toResponse(event, userId);
    } catch (error) {
      if (error instanceof InvalidEventUpdateError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof EventNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof EventAccessDeniedError) {
        throw new ForbiddenException(error.message);
      }

      throw error;
    }
  }

  private toResponse(event: Event, ownerId: string): EventResponseDto {
    const proposal = event.proposals.find((item) => item.ownerId === ownerId);

    return {
      id: event.id,
      name: event.name,
      date: event.timeslot?.toISOString().slice(0, 10) ?? null,
      time: event.timeslot?.toISOString().slice(11, 16) ?? null,
      image: event.image,
      budgetStart: event.budgetStart,
      budgetEnd: event.budgetEnd,
      status: event.status,
      groupId: event.groupId,
      location: event.location,
      proposal: proposal ? { id: proposal.id, ownerId: proposal.ownerId } : null,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }
}
