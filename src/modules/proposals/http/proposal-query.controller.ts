import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
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
  GetProposalByIdUseCase,
  ProposalDetailsAccessDeniedError,
  ProposalDetailsNotFoundError,
} from '../application/get-proposal-by-id.use-case';
import type { ProposalDetails } from '../domain/proposal.repository';
import { ProposalDetailsResponseDto } from './dto/proposal-details-response.dto';

@ApiTags('Proposals')
@ApiCookieAuth('better-auth')
@ApiBearerAuth('better-auth-bearer')
@Controller('api/proposals')
export class ProposalQueryController {
  constructor(private readonly getProposalById: GetProposalByIdUseCase) {}

  @Get(':proposalId')
  @ApiOperation({ summary: 'Consulta uma proposta pelo ID' })
  @ApiParam({ name: 'proposalId', format: 'uuid' })
  @ApiOkResponse({ type: ProposalDetailsResponseDto })
  @ApiBadRequestResponse({ description: 'proposalId deve ser um UUID válido.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo da proposta.' })
  @ApiNotFoundResponse({ description: 'Proposta não encontrada.' })
  async findById(
    @Param('proposalId', new ParseUUIDPipe()) proposalId: string,
    @Request() request: AuthenticatedRequest
  ): Promise<ProposalDetailsResponseDto> {
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('Authenticated user not found');

    try {
      return this.toResponse(await this.getProposalById.execute(proposalId, userId));
    } catch (error) {
      if (error instanceof ProposalDetailsNotFoundError) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof ProposalDetailsAccessDeniedError) {
        throw new ForbiddenException(error.message);
      }
      throw error;
    }
  }

  private toResponse(proposal: ProposalDetails): ProposalDetailsResponseDto {
    return {
      id: proposal.id,
      type: proposal.type,
      groupId: proposal.groupId,
      eventId: proposal.eventId,
      name: proposal.name,
      createdAt: proposal.createdAt,
      matchedAt: proposal.matchedAt,
      matched: proposal.matchedAt !== null,
      owner: {
        id: proposal.owner.id,
        name: proposal.owner.name,
        image: proposal.owner.image ? `/users/${proposal.owner.id}/profile-picture` : null,
      },
      location: proposal.location
        ? {
            id: proposal.location.id,
            externalId: proposal.location.externalId,
            name: proposal.location.name,
            description: proposal.location.description,
            address: proposal.location.address,
            openingHours: proposal.location.openingHours,
            rating: proposal.location.rating,
            phoneNumber: proposal.location.phoneNumber,
            website: proposal.location.website,
            priceRange: proposal.location.priceRange,
            imageUrl: proposal.location.image
              ? `/api/locations/${proposal.location.id}/image`
              : null,
            manuallyCreated: proposal.location.manuallyCreated,
          }
        : null,
      myAnswer: proposal.myAnswer,
    };
  }
}
