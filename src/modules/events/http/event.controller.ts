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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
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

const MAX_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024;

@ApiTags('Events')
@Controller('api/events')
export class EventController {
  constructor(private readonly updateEventUseCase: UpdateEventUseCase) {}

  @Patch(':eventId')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES } }))
  @ApiOperation({ summary: 'Atualiza parcialmente um evento' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        date: { type: 'string', format: 'date' },
        time: { type: 'string', example: '21:00' },
        location: { type: 'string' },
        image: { type: 'string', format: 'binary' },
        budgetStart: { type: 'string', nullable: true, example: '70.00' },
        budgetEnd: { type: 'string', nullable: true, example: '150.00' },
      },
    },
  })
  @ApiOkResponse({ type: EventResponseDto })
  @ApiBadRequestResponse({ description: 'Identificador ou dados do evento inválidos.' })
  @ApiPayloadTooLargeResponse({ description: 'A imagem ultrapassa o limite de 5 MB.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não é proprietário de uma proposta do evento.' })
  @ApiNotFoundResponse({ description: 'Evento não encontrado.' })
  async update(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() input: UpdateEventDto,
    @UploadedFile() image: Express.Multer.File | undefined,
    @Request() request: AuthenticatedRequest
  ): Promise<EventResponseDto> {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    try {
      const update = image
        ? {
            ...input,
            image: {
              originalName: image.originalname,
              contentType: image.mimetype,
              bytes: image.buffer,
            },
          }
        : input;

      const event = await this.updateEventUseCase.execute(eventId, userId, update);
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
