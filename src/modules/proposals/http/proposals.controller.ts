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
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PlacesProviderUnavailableError } from '../../../shared/places/places-provider';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import {
  EventGroupAccessDeniedError,
  EventGroupNotFoundError,
} from '../../events/application/create-event.use-case';
import { EventLocationNotFoundError } from '../../events/domain/event.repository';
import {
  CreateProposalUseCase,
  InvalidProposalCreationError,
} from '../application/create-proposal.use-case';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { CreatedProposalResponseDto } from './dto/created-proposal-response.dto';
import { ProposalResponsePresenter } from './presenters/proposal-response.presenter';

@ApiTags('Proposals')
@ApiCookieAuth('better-auth')
@ApiBearerAuth('better-auth-bearer')
@Controller('api/groups/:groupId/proposals')
export class ProposalsController {
  constructor(private readonly createUseCase: CreateProposalUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Sugere um local do catálogo do Google Places como encontro do grupo' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiBody({ type: CreateProposalDto })
  @ApiCreatedResponse({ type: CreatedProposalResponseDto })
  @ApiBadRequestResponse({ description: 'Body ou identificador inválido.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo.' })
  @ApiNotFoundResponse({ description: 'Grupo ou localização não encontrado.' })
  @ApiServiceUnavailableResponse({ description: 'Serviço de locais indisponível.' })
  async create(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Body() input: CreateProposalDto,
    @Request() request: AuthenticatedRequest
  ): Promise<CreatedProposalResponseDto> {
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    try {
      const proposal = await this.createUseCase.execute({ ...input, groupId, userId });
      return ProposalResponsePresenter.toResponse(proposal);
    } catch (error) {
      if (error instanceof InvalidProposalCreationError) {
        throw new BadRequestException(error.message);
      }
      if (error instanceof EventGroupNotFoundError || error instanceof EventLocationNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof EventGroupAccessDeniedError) {
        throw new ForbiddenException(error.message);
      }
      if (error instanceof PlacesProviderUnavailableError) {
        throw new ServiceUnavailableException('Serviço de locais indisponível');
      }
      throw error;
    }
  }
}
