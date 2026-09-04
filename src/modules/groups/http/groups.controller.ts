import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
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
import { randomUUID } from 'node:crypto';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import { CreateGroupUseCase, InvalidGroupError } from '../application/create-group.use-case';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupDetailsResponseDto } from './dto/group-details-response.dto';
import { GroupListItemResponseDto } from './dto/group-list-item-response.dto';
import { Group } from '../domain/group.entity';

const MAX_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024;

@ApiTags('Groups - Mock')
@Controller('groups')
export class GroupsController {
  constructor(private readonly createGroupUseCase: CreateGroupUseCase) {}
  /**
   * GET /groups
   * Lista os grupos mockados da tela inicial. Futuramente, o usuário será identificado pela
   * autenticação e a rota devolverá somente os grupos dos quais ele participa.
   */
  @Get()
  @ApiOperation({
    summary: '[Mock] Lista todos os grupos do usuário que será obtido pela autenticação',
  })
  @ApiOkResponse({
    description: 'Grupos listados com sucesso.',
    type: GroupListItemResponseDto,
    isArray: true,
  })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  list(@Request() request: AuthenticatedRequest): GroupListItemResponseDto[] {
    // Disponível para a futura consulta dos grupos pertencentes ao usuário.
    const userId = request.user?.id;
    void userId;

    return [
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        name: 'Amigos da faculdade',
        profilePic: 'https://images.example.com/groups/faculdade.jpg',
        createdAt: new Date('2026-08-01T15:00:00.000Z'),
      },
      {
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        name: 'Família',
        profilePic: null,
        createdAt: new Date('2026-07-20T18:30:00.000Z'),
      },
    ];
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
  @UseInterceptors(FileInterceptor('profile_pic', { limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES } }))
  @ApiOperation({ summary: '[Mock] Cria um grupo com nome e foto de perfil opcional' })
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
    @UploadedFile() image: Express.Multer.File | undefined,
    @Request() request: AuthenticatedRequest
  ): Promise<GroupListItemResponseDto> {
    // Disponível para vincular o criador como participante do grupo.
    const userId = request.user?.id;
    void userId;

    try {
      const group = await this.createGroupUseCase.execute({
        name: input.name,
        image: image ? {
          originalName: image.originalname,
          contentType: image.mimetype,
          bytes: image.buffer,
        } : undefined,
      });

      return this.toResponse(group);
    } catch (error) {
      if (error instanceof InvalidGroupError) {
        throw new BadRequestException(error.message);
      }
    }
  }

  private toResponse(group: Group): GroupListItemResponseDto {
    return {
      id: group.id,
      name: group.name,
      profilePic: `/group/${group.id}/image`,
      createdAt: group.createdAt,
    };
  }
}
