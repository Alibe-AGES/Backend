import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
  ApiCreatedResponse,
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
  CreateEventUseCase,
  EventGroupAccessDeniedError,
  EventGroupNotFoundError,
  InvalidEventCreationError,
} from '../application/create-event.use-case';
import {
  EventAccessDeniedError,
  EventNotFoundError,
  InvalidEventUpdateError,
  UpdateEventUseCase,
} from '../application/update-event.use-case';
import { Event } from '../domain/event.entity';
import type { CreatedEvent } from '../domain/event.repository';
import { CreateEventDto } from './dto/create-event.dto';
import { CreatedEventResponseDto, EventResponseDto } from './dto/event-response.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventDetailsResponseDto } from './dto/event-details-response.dto';
import { GetEventUseCase } from '../application/get-event.use-case';

const MAX_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024;

@ApiTags('Events')
@Controller()
export class EventController {
  constructor(
    private readonly getEventUseCase: GetEventUseCase,
    private readonly updateEventUseCase: UpdateEventUseCase,
    private readonly createEventUseCase: CreateEventUseCase
  ) {}

  @Post('groups/:groupId/events')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES } }))
  @ApiOperation({ summary: 'Cria um evento no grupo com a proposta do usuário autenticado' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'date', 'time', 'location'],
      properties: {
        name: { type: 'string', example: 'Jantar de aniversário' },
        date: { type: 'string', format: 'date', example: '2026-10-15' },
        time: { type: 'string', example: '20:00' },
        location: { type: 'string', example: 'Rua dos Andradas, 1234, Porto Alegre' },
        image: { type: 'string', format: 'binary' },
        budgetStart: { type: 'string', example: '50.00' },
        budgetEnd: { type: 'string', example: '120.00' },
      },
    },
  })
  @ApiCreatedResponse({ type: CreatedEventResponseDto })
  @ApiBadRequestResponse({ description: 'Nome, dia, horário e endereço são obrigatórios.' })
  @ApiPayloadTooLargeResponse({ description: 'A imagem ultrapassa o limite de 5 MB.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence a este grupo.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  async create(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Body() input: CreateEventDto,
    @UploadedFile() image: Express.Multer.File | undefined,
    @Request() request: AuthenticatedRequest
  ): Promise<CreatedEventResponseDto> {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    try {
      const created = await this.createEventUseCase.execute({
        ...input,
        groupId,
        userId,
        image: image && {
          originalName: image.originalname,
          contentType: image.mimetype,
          bytes: image.buffer,
        },
      });

      return this.toCreatedResponse(created, userId);
    } catch (error) {
      if (error instanceof InvalidEventCreationError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof EventGroupNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof EventGroupAccessDeniedError) {
        throw new ForbiddenException(error.message);
      }

      throw error;
    }
  }

  @Patch('api/events/:eventId')
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
  
  @Get(':id')
  @ApiOperation({ summary: 'Consulta todos os dados de um evento ' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: EventDetailsResponseDto })
  @ApiBadRequestResponse({ description: 'Identificador do evento inválido.' })
  @ApiNotFoundResponse({ description: 'Evento não encontrado' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  async get(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Request() request: AuthenticatedRequest
  ): Promise<EventDetailsResponseDto> {
    const userId = request?.user.id;
    return await this.getEventUseCase.execute(id, userId);
  }

  private toCreatedResponse(
    { event, ownerResponse }: CreatedEvent,
    ownerId: string
  ): CreatedEventResponseDto {
    const createdProposal =
      event.proposals.find((item) => item.ownerId === ownerId) ?? event.proposals[0];

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
      createdAt: event.createdAt,
      proposal: {
        id: createdProposal.id,
        ownerId: createdProposal.ownerId,
        response: ownerResponse,
      },
    };
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
