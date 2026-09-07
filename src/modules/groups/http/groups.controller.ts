import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  StreamableFile,
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
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import {
  GetGroupProfilePictureUseCase,
  GroupImageAccessDeniedError,
  GroupNotFoundError,
  GroupProfilePictureNotFoundError,
} from '../application/get-group-profile-picture.use-case';
import { CreateGroupUseCase, InvalidGroupError } from '../application/create-group.use-case';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupDetailsResponseDto } from './dto/group-details-response.dto';
import { GroupListItemResponseDto } from './dto/group-list-item-response.dto';
import { GroupResponsePresenter } from './presenters/group-response.presenter';
import { ListGroupsUseCase } from '../application/list-groups.use-case';
import { Group } from '../domain/group.entity';

const MAX_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024;

@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly createGroupUseCase: CreateGroupUseCase,
    private readonly listGroupsUseCase: ListGroupsUseCase,
    private readonly getGroupProfilePictureUseCase: GetGroupProfilePictureUseCase
  ) {}
  /**
   * GET /groups
   * Lista os grupos mockados da tela inicial. Futuramente, o usuário será identificado pela
   * autenticação e a rota devolverá somente os grupos dos quais ele participa.
   */
  @Get()
  @ApiOperation({
    summary: 'Lista todos os grupos do usuário que será obtido pela autenticação',
  })
  @ApiOkResponse({
    description: 'Grupos listados com sucesso.',
    type: GroupListItemResponseDto,
    isArray: true,
  })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  async list(@Request() request: AuthenticatedRequest): Promise<GroupListItemResponseDto[]> {
    const groups = await this.listGroupsUseCase.execute(request.user?.id ?? '');

    return groups.map((group) => GroupResponsePresenter.toResponse(group));
  }

  /**
   * GET /groups/:groupId/profile-picture
   * Entrega a foto do grupo somente quando o usuário autenticado pertence a ele.
   */
  @Get(':groupId/profile-picture')
  @Header('Cache-Control', 'private, max-age=300')
  @ApiOperation({ summary: 'Obtém a foto de perfil de um grupo do usuário autenticado' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiProduces('image/png', 'image/jpeg', 'image/webp')
  @ApiOkResponse({
    description: 'Conteúdo binário da imagem.',
    content: { 'image/*': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiBadRequestResponse({ description: 'groupId deve ser um UUID válido.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo.' })
  @ApiNotFoundResponse({ description: 'Grupo ou imagem não encontrado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno ao consultar banco ou storage.' })
  async getProfilePicture(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Request() request: AuthenticatedRequest
  ): Promise<StreamableFile> {
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('Authenticated user not found');
    try {
      const image = await this.getGroupProfilePictureUseCase.execute(groupId, userId);
      return new StreamableFile(Buffer.from(image.bytes), {
        type: image.contentType,
        disposition: 'inline',
        length: image.bytes.byteLength,
      });
    } catch (error) {
      if (error instanceof GroupImageAccessDeniedError) {
        throw new ForbiddenException(error.message);
      }
      if (
        error instanceof GroupNotFoundError ||
        error instanceof GroupProfilePictureNotFoundError
      ) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }

  /**
   * GET /groups/:groupId
   * Retorna os dados do grupo, seus participantes e o próximo encontro mockado. Futuramente, o
   * acesso ao grupo será validado a partir do usuário autenticado.
   */
  @Get(':groupId')
  @ApiOperation({ summary: '[Mock] Obtém o grupo, seus participantes e o próximo encontro' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({
    description: 'Grupo encontrado e detalhado com sucesso.',
    type: GroupDetailsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'groupId deve ser um UUID válido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  getById(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Request() request: AuthenticatedRequest
  ): GroupDetailsResponseDto {
    // Disponível para a futura validação de acesso ao grupo.
    const userId = request.user?.id;
    void userId;

    return {
      id: groupId,
      name: 'Amigos da faculdade',
      profilePic: 'https://images.example.com/groups/faculdade.jpg',
      createdAt: new Date('2026-08-01T15:00:00.000Z'),
      participants: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'Ana Souza',
          profilePic: 'https://images.example.com/users/ana.jpg',
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Leonardo Silva',
          profilePic: null,
        },
      ],
      nextEvent: {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'Jantar da turma',
        timeslot: new Date('2026-09-05T20:00:00.000Z'),
        status: 'confirmed',
      },
    };
  }

  /**
   * POST /groups
   * Recebe name e profile_pic opcional via multipart/form-data e devolve o grupo mockado. Nesta etapa,
   * não persiste os dados nem armazena a imagem.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('profile_pic', { limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES } })
  )
  @ApiOperation({ summary: 'Cria um grupo com nome e foto de perfil opcional' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          minLength: 2,
          maxLength: 100,
          example: 'Amigos da faculdade',
        },
        profile_pic: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Grupo criado com sucesso.',
    type: GroupListItemResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Nome ausente ou fora dos limites permitidos.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  async create(
    @Body() input: CreateGroupDto,
    @UploadedFile() image: Express.Multer.File | null,
    @Request() request: AuthenticatedRequest
  ): Promise<GroupListItemResponseDto> {
    // Disponível para vincular o criador como participante do grupo.
    const userId = request.user?.id;
    void userId;

    try {
      const group = await this.createGroupUseCase.execute({
        creatorId: userId,
        name: input.name,
        image: image
          ? {
              originalName: image.originalname,
              contentType: image.mimetype,
              bytes: image.buffer,
            }
          : null,
      });

      return GroupResponsePresenter.toResponse(group);
    } catch (error) {
      if (error instanceof InvalidGroupError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}
