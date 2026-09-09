import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Param, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import { CreateGroupUseCase, InvalidGroupError } from '../application/create-group.use-case';
import { GroupNotFoundError, GetGroupUseCase } from '../application/get-group.use-case';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupDetailsResponseDto } from './dto/group-details-response.dto';
import { GroupListItemResponseDto } from './dto/group-list-item-response.dto';
import { ListGroupsUseCase } from '../application/list-groups.use-case';
import { Group } from '../domain/group.entity';

const MAX_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024;

@ApiTags('Groups - Mock')
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly createGroupUseCase: CreateGroupUseCase,
    private readonly listGroupsUseCase: ListGroupsUseCase,
    private readonly getGroupUseCase: GetGroupUseCase
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
    return this.listGroupsUseCase.execute(request.user?.id ?? '');
  }

  /**
   * GET /groups/:groupId
   * Retorna os dados do grupo, seus participantes e o próximo encontro mockado. Futuramente, o
   * acesso ao grupo será validado a partir do usuário autenticado.
   */
  @Get(':groupId')
  @ApiOperation({ summary: 'Obtém o grupo, seus participantes e o próximo encontro' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiOkResponse({
    description: 'Grupo encontrado e detalhado com sucesso.',
    type: GroupDetailsResponseDto,
  })
  @ApiBadRequestResponse({ description: 'groupId deve ser um UUID válido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  async getById(
    @Param('groupId', new ParseUUIDPipe()) groupId: string
  ): Promise<GroupDetailsResponseDto> {
    try {
      return await this.getGroupUseCase.execute(groupId);
    } catch (error) {
      if (error instanceof GroupNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
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

      return this.toResponse(group);
    } catch (error) {
      if (error instanceof InvalidGroupError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private toResponse(group: Group): GroupListItemResponseDto {
    return {
      id: group.id,
      name: group.name,
      profilePic: group.profilePic ? `/group/${group.id}/image` : null,
      createdAt: group.createdAt,
    };
  }
}
