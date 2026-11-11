import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Patch,
  ForbiddenException,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Put,
  Request,
  StreamableFile,
  UnauthorizedException,
  UploadedFile,
  UseInterceptors,
  Query,
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
  ApiNoContentResponse,
  ApiPayloadTooLargeResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import { UpdateGroupUseCase } from '../application/update-group.use-case';
import { RemoveGroupMemberUseCase } from '../application/remove-group-member.use-case';
import {
  GroupMembershipNotFoundError,
  LeaveGroupUseCase,
} from '../application/leave-group.use-case';
import { GroupManagementError } from '../domain/group.repository';
import { UpdateGroupDto } from './dto/update-group.dto';
import {
  GetGroupProfilePictureUseCase,
  GroupImageAccessDeniedError,
  GroupNotFoundError as ProfileGroupNotFoundError,
  GroupProfilePictureNotFoundError,
} from '../application/get-group-profile-picture.use-case';
import { CreateGroupUseCase, InvalidGroupError } from '../application/create-group.use-case';
import { GroupNotFoundError, GetGroupUseCase } from '../application/get-group.use-case';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupDetailsResponseDto } from './dto/group-details-response.dto';
import { GroupListItemResponseDto } from './dto/group-list-item-response.dto';
import { GroupResponsePresenter } from './presenters/group-response.presenter';
import { ListGroupsUseCase } from '../application/list-groups.use-case';
import { GetAvailabilitiesQueryDto } from './dto/get-availabilities-query.dto';
import { AvailabilitiesResponseDto } from './dto/get-availabilities-response.dto';
import {
  GetAvailabilityIntervalsUseCase,
  GroupNotFoundError as AvailabilityGroupNotFoundError,
  InvalidAvailabilityDateError,
  AvailabilityAccessDeniedError,
} from '../application/get-availability-intervals.use-case';

const MAX_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024;

@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
  constructor(
    private readonly createGroupUseCase: CreateGroupUseCase,
    private readonly getGroupUseCase: GetGroupUseCase,
    private readonly getGroupProfilePictureUseCase: GetGroupProfilePictureUseCase,
    private readonly listGroupsUseCase: ListGroupsUseCase,
    private readonly getAvailabilityIntervalsUseCase: GetAvailabilityIntervalsUseCase,
    private readonly updateGroupUseCase: UpdateGroupUseCase,
    private readonly removeGroupMemberUseCase: RemoveGroupMemberUseCase,
    private readonly leaveGroupUseCase: LeaveGroupUseCase
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
        error instanceof ProfileGroupNotFoundError ||
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
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('Authenticated user not found');

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

  @Patch(':groupId')
  @UseInterceptors(
    FileInterceptor('profile_pic', { limits: { fileSize: MAX_IMAGE_SIZE_IN_BYTES } })
  )
  @ApiOperation({ summary: 'Edita nome e imagem do grupo, somente pelo owner' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 100 },
        profile_pic: { type: 'string', format: 'binary' },
        removeProfilePicture: { type: 'boolean', description: 'Remove a imagem sem substituí-la.' },
      },
    },
  })
  @ApiOkResponse({ description: 'Grupo atualizado.', type: GroupListItemResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos ou nenhuma alteração informada.' })
  @ApiPayloadTooLargeResponse({ description: 'Imagem maior que 5 MB.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'Somente o owner pode editar.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  async update(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Body() input: UpdateGroupDto,
    @UploadedFile() image: Express.Multer.File | undefined,
    @Request() request: AuthenticatedRequest
  ): Promise<GroupListItemResponseDto> {
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('Authenticated user not found');
    try {
      const group = await this.updateGroupUseCase.execute({
        ...input,
        groupId,
        userId,
        image: image
          ? { originalName: image.originalname, contentType: image.mimetype, bytes: image.buffer }
          : undefined,
      });
      return GroupResponsePresenter.toResponse(group);
    } catch (error) {
      if (error instanceof InvalidGroupError) throw new BadRequestException(error.message);
      this.rethrowManagementError(error);
    }
  }

  @Delete(':groupId/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um participante; o owner pode remover a si mesmo' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiNoContentResponse({
    description:
      'Participante removido. Se necessário, outro owner é sorteado; grupo vazio é preservado.',
  })
  @ApiBadRequestResponse({ description: 'UUID inválido.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'Somente o owner pode remover participantes.' })
  @ApiNotFoundResponse({ description: 'Grupo ou participante não encontrado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  async removeMember(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Param('userId', new ParseUUIDPipe()) memberId: string,
    @Request() request: AuthenticatedRequest
  ): Promise<void> {
    const ownerId = request.user?.id;
    if (!ownerId) throw new UnauthorizedException('Authenticated user not found');
    try {
      await this.removeGroupMemberUseCase.execute(groupId, memberId, ownerId);
    } catch (error) {
      this.rethrowManagementError(error);
    }
  }

  @Put(':groupId/leave')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Remove o usuário autenticado do grupo' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiCreatedResponse({ description: 'Participação removida com sucesso. Resposta sem corpo.' })
  @ApiBadRequestResponse({
    description: 'UUID inválido, grupo inexistente ou usuário sem vínculo.',
  })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  async leave(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Request() request: AuthenticatedRequest
  ): Promise<void> {
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('Authenticated user not found');

    try {
      await this.leaveGroupUseCase.execute(groupId, userId);
    } catch (error) {
      if (error instanceof GroupMembershipNotFoundError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private rethrowManagementError(error: unknown): never {
    if (error instanceof GroupManagementError) {
      if (error.reason === 'forbidden') throw new ForbiddenException(error.message);
      throw new NotFoundException(error.message);
    }
    throw error;
  }

  @Get(':groupId/availabilities')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtém os intervalos de disponibilidades para um dia específico' })
  @ApiParam({ name: 'groupId', format: 'uuid' })
  @ApiQuery({ name: 'date', required: true, type: String, format: 'date', example: '2026-09-05' })
  @ApiOkResponse({
    description: 'Intervalos encontrados.',
    type: AvailabilitiesResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'groupId ou date inválido; date deve ser uma data única YYYY-MM-DD.',
  })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'O usuário não pertence ao grupo.' })
  @ApiNotFoundResponse({ description: 'Grupo não encontrado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno inesperado.' })
  async getAvailabilities(
    @Param('groupId', new ParseUUIDPipe()) groupId: string,
    @Query() { date }: GetAvailabilitiesQueryDto,
    @Request() request: AuthenticatedRequest
  ): Promise<AvailabilitiesResponseDto> {
    const userId = request.user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    // Express may keep bracket notation as literal keys instead of nested objects.
    if (Object.keys(request.query ?? {}).some((key) => key.startsWith('date['))) {
      throw new BadRequestException('date deve ser uma data única YYYY-MM-DD');
    }

    try {
      const availabilities = await this.getAvailabilityIntervalsUseCase.execute(
        groupId,
        date,
        userId
      );

      return {
        date: availabilities.date,
        users: availabilities.users.map((user) => ({
          id: user.id,
          name: user.name,
          image: user.profilePic ? `/users/${user.id}/profile-picture` : null,
          isCurrentUser: user.id === userId,
          availableAllDay: user.availableAllDay,
          intervals: user.intervals,
        })),
      };
    } catch (error) {
      if (error instanceof InvalidAvailabilityDateError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof AvailabilityGroupNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof AvailabilityAccessDeniedError) {
        throw new ForbiddenException(error.message);
      }

      throw error;
    }
  }
}
