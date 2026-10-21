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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
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
import { ProposalLocationNotFoundError } from '../domain/proposal.repository';
import {
  CreateProposalUseCase,
  InvalidProposalCreationError,
} from '../application/create-proposal.use-case';
import { CreateProposalDto } from './dto/create-proposal.dto';
import { CreatedProposalResponseDto } from './dto/created-proposal-response.dto';
import { ProposalResponsePresenter } from './presenters/proposal-response.presenter';

const MAX_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024;

@ApiTags('Proposals')
@ApiCookieAuth('better-auth')
@ApiBearerAuth('better-auth-bearer')
@Controller('api/groups/:groupId/proposals')
export class ProposalsController {
  constructor(private readonly createUseCase: CreateProposalUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES } }))
  @ApiOperation({
    summary: 'Cria uma sugestão de local para o grupo',
    description:
      'Aceita locationId para reutilizar um local salvo, externalId para buscar os detalhes no Google Places, ou os campos opcionais name, address, description e image para criar um local manual. Nenhum evento é criado.',
  })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          example: 'Restaurante Penne',
          description: 'Nome opcional do local manual.',
        },
        locationId: { type: 'string', format: 'uuid' },
        externalId: { type: 'string', example: 'ChIJN1t_tDeuEmsRUsoyG83frY4' },
        description: { type: 'string' },
        address: { type: 'string', example: 'Rua Mariante, 154 - Porto Alegre - RS' },
        image: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ type: CreatedProposalResponseDto })
  @ApiBadRequestResponse({ description: 'Body ou identificador inválido.' })
  @ApiPayloadTooLargeResponse({ description: 'A imagem ultrapassa o limite de 5 MB.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo.' })
  @ApiNotFoundResponse({ description: 'Grupo ou localização não encontrado.' })
  @ApiServiceUnavailableResponse({ description: 'Serviço de locais indisponível.' })
  async create(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Body() input: CreateProposalDto,
    @UploadedFile() image: Express.Multer.File | undefined,
    @Request() request: AuthenticatedRequest
  ): Promise<CreatedProposalResponseDto> {
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }
    try {
      const proposal = await this.createUseCase.execute({
        ...input,
        groupId,
        userId,
        image: image && {
          originalName: image.originalname,
          contentType: image.mimetype,
          bytes: image.buffer,
        },
      });
      return ProposalResponsePresenter.toResponse(proposal);
    } catch (error) {
      if (error instanceof InvalidProposalCreationError) {
        throw new BadRequestException(error.message);
      }
      if (
        error instanceof EventGroupNotFoundError ||
        error instanceof ProposalLocationNotFoundError
      ) {
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
