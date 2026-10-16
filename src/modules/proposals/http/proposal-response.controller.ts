import {
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import { CreateProposalResponseUseCase } from '../application/create-proposal-response.use-case';
import {
  ProposalAccessDeniedError,
  ProposalEventNotFoundError,
  ProposalNotFoundError,
} from '../application/resolve-event-proposal';
import {
  ProposalResponseNotFoundError,
  UpdateProposalResponseUseCase,
} from '../application/update-proposal-response.use-case';
import { ProposalResponse } from '../domain/proposal-response.entity';
import { ProposalResponseAlreadyExistsError } from '../domain/proposal-response.repository';
import { ProposalAnswerDto } from './dto/proposal-answer.dto';
import { ProposalResponseDto } from './dto/proposal-response.dto';

const answerBody = {
  schema: {
    type: 'object',
    required: ['answer'],
    properties: {
      answer: {
        type: 'string',
        enum: ['yes', 'no'],
        description: '`yes` aceita a proposta; `no` recusa a proposta.',
        example: 'yes',
      },
    },
  },
};

@ApiTags('Proposal responses')
@Controller('api/events/:eventId/proposal/responses')
export class ProposalResponseController {
  constructor(
    private readonly createUseCase: CreateProposalResponseUseCase,
    private readonly updateUseCase: UpdateProposalResponseUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Cria a resposta do usuário autenticado para a proposta do evento' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiBody(answerBody)
  @ApiCreatedResponse({ type: ProposalResponseDto })
  @ApiBadRequestResponse({ description: 'Identificador do evento ou resposta inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo do evento.' })
  @ApiNotFoundResponse({ description: 'Evento ou proposta não encontrados.' })
  @ApiConflictResponse({ description: 'O usuário já respondeu esta proposta.' })
  async create(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() input: ProposalAnswerDto,
    @Request() request: AuthenticatedRequest
  ): Promise<ProposalResponseDto> {
    const userId = this.getUserId(request);

    try {
      const response = await this.createUseCase.execute({ eventId, userId, answer: input.answer });
      return this.toResponse(response);
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  @Patch('me')
  @ApiOperation({ summary: 'Altera a resposta do usuário autenticado para a proposta do evento' })
  @ApiParam({ name: 'eventId', format: 'uuid' })
  @ApiBody(answerBody)
  @ApiOkResponse({ type: ProposalResponseDto })
  @ApiBadRequestResponse({ description: 'Identificador do evento ou resposta inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo do evento.' })
  @ApiNotFoundResponse({
    description: 'Evento, proposta ou resposta do usuário não encontrados.',
  })
  async update(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() input: ProposalAnswerDto,
    @Request() request: AuthenticatedRequest
  ): Promise<ProposalResponseDto> {
    const userId = this.getUserId(request);

    try {
      const response = await this.updateUseCase.execute({ eventId, userId, answer: input.answer });
      return this.toResponse(response);
    } catch (error) {
      throw this.toHttpError(error);
    }
  }

  private getUserId(request: AuthenticatedRequest): string {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return userId;
  }

  private toHttpError(error: unknown): unknown {
    if (
      error instanceof ProposalEventNotFoundError ||
      error instanceof ProposalNotFoundError ||
      error instanceof ProposalResponseNotFoundError
    ) {
      return new NotFoundException(error.message);
    }

    if (error instanceof ProposalAccessDeniedError) {
      return new ForbiddenException(error.message);
    }

    if (error instanceof ProposalResponseAlreadyExistsError) {
      return new ConflictException(error.message);
    }

    return error;
  }

  private toResponse(response: ProposalResponse): ProposalResponseDto {
    return {
      id: response.id,
      proposalId: response.proposalId,
      userId: response.userId,
      answer: response.answer,
      createdAt: response.createdAt,
    };
  }
}
