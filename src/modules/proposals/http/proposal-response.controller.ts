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
  type ProposalTarget,
} from '../application/resolve-proposal';
import {
  ProposalResponseNotFoundError,
  UpdateProposalResponseUseCase,
} from '../application/update-proposal-response.use-case';
import {
  type ProposalAnswerResult,
  ProposalResponseAlreadyExistsError,
} from '../domain/proposal-response.repository';
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
@Controller('api')
export class ProposalResponseController {
  constructor(
    private readonly createUseCase: CreateProposalResponseUseCase,
    private readonly updateUseCase: UpdateProposalResponseUseCase
  ) {}

  @Post('events/:eventId/proposal/responses')
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
  create(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() input: ProposalAnswerDto,
    @Request() request: AuthenticatedRequest
  ): Promise<ProposalResponseDto> {
    return this.answer('create', { eventId }, input, request);
  }

  @Patch('events/:eventId/proposal/responses/me')
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
  update(
    @Param('eventId', new ParseUUIDPipe()) eventId: string,
    @Body() input: ProposalAnswerDto,
    @Request() request: AuthenticatedRequest
  ): Promise<ProposalResponseDto> {
    return this.answer('update', { eventId }, input, request);
  }

  @Post('proposals/:proposalId/responses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cria a resposta do usuário autenticado para uma sugestão',
    description:
      'Quando esta resposta completa o aceite de todos os membros atuais do grupo, retorna `matched: true` e registra uma notificação `match` no grupo.',
  })
  @ApiParam({ name: 'proposalId', format: 'uuid' })
  @ApiBody(answerBody)
  @ApiCreatedResponse({ type: ProposalResponseDto })
  @ApiBadRequestResponse({ description: 'Identificador da proposta ou resposta inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo da proposta.' })
  @ApiNotFoundResponse({ description: 'Proposta não encontrada.' })
  @ApiConflictResponse({ description: 'O usuário já respondeu esta proposta.' })
  createForProposal(
    @Param('proposalId', new ParseUUIDPipe()) proposalId: string,
    @Body() input: ProposalAnswerDto,
    @Request() request: AuthenticatedRequest
  ): Promise<ProposalResponseDto> {
    return this.answer('create', { proposalId }, input, request);
  }

  @Patch('proposals/:proposalId/responses/me')
  @ApiOperation({
    summary: 'Altera a resposta do usuário autenticado para uma sugestão',
    description:
      'Trocar para `yes` pode completar o match; nesse caso retorna `matched: true` e registra uma notificação `match` no grupo.',
  })
  @ApiParam({ name: 'proposalId', format: 'uuid' })
  @ApiBody(answerBody)
  @ApiOkResponse({ type: ProposalResponseDto })
  @ApiBadRequestResponse({ description: 'Identificador da proposta ou resposta inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo da proposta.' })
  @ApiNotFoundResponse({ description: 'Proposta ou resposta do usuário não encontradas.' })
  updateForProposal(
    @Param('proposalId', new ParseUUIDPipe()) proposalId: string,
    @Body() input: ProposalAnswerDto,
    @Request() request: AuthenticatedRequest
  ): Promise<ProposalResponseDto> {
    return this.answer('update', { proposalId }, input, request);
  }

  private async answer(
    operation: 'create' | 'update',
    target: ProposalTarget,
    input: ProposalAnswerDto,
    request: AuthenticatedRequest
  ): Promise<ProposalResponseDto> {
    const userId = this.getUserId(request);
    const useCase = operation === 'create' ? this.createUseCase : this.updateUseCase;

    try {
      const result = await useCase.execute({ ...target, userId, answer: input.answer });
      return this.toResponse(result);
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

  private toResponse({ response, matched }: ProposalAnswerResult): ProposalResponseDto {
    return {
      id: response.id,
      proposalId: response.proposalId,
      userId: response.userId,
      answer: response.answer,
      createdAt: response.createdAt,
      matched,
    };
  }
}
