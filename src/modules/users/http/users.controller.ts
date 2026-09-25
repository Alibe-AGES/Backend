import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Put,
  Request,
  StreamableFile,
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
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiPayloadTooLargeResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import {
  GetUserProfilePictureUseCase,
  UserImageAccessDeniedError,
  UserNotFoundError,
  UserProfilePictureNotFoundError,
} from '../application/get-user-profile-picture.use-case';
import {
  InvalidUserProfilePictureError,
  MAX_USER_PROFILE_PICTURE_SIZE_IN_BYTES,
  UpdateUserProfilePictureUseCase,
  UserNotFoundForProfilePictureError,
} from '../application/update-user-profile-picture.use-case';
import { UpdateUserProfilePictureResponseDto } from './dto/update-user-profile-picture-response.dto';

@ApiTags('Users')
@ApiCookieAuth('better-auth')
@ApiBearerAuth('better-auth-bearer')
@Controller('users')
export class UsersController {
  constructor(
    private readonly getUserProfilePicture: GetUserProfilePictureUseCase,
    private readonly updateUserProfilePicture: UpdateUserProfilePictureUseCase
  ) {}

  /**
   * PUT /users/me/profile-picture
   * Salva ou substitui a foto de perfil do usuário da sessão atual.
   */
  @Put('me/profile-picture')
  @UseInterceptors(
    FileInterceptor('profilePic', {
      limits: { fileSize: MAX_USER_PROFILE_PICTURE_SIZE_IN_BYTES },
    })
  )
  @ApiOperation({ summary: 'Salva ou substitui a foto do usuário autenticado' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['profilePic'],
      properties: {
        profilePic: {
          type: 'string',
          format: 'binary',
          description: 'Imagem JPEG, PNG ou WebP com no máximo 5 MB.',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Foto de perfil salva com sucesso.',
    type: UpdateUserProfilePictureResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Imagem ausente, vazia ou em formato inválido.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiNotFoundResponse({ description: 'Usuário autenticado não encontrado.' })
  @ApiPayloadTooLargeResponse({ description: 'A imagem ultrapassa o limite de 5 MB.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno ao salvar a imagem.' })
  async updateProfilePicture(
    @UploadedFile() profilePic: Express.Multer.File | undefined,
    @Request() request: AuthenticatedRequest
  ): Promise<UpdateUserProfilePictureResponseDto> {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    if (!profilePic) {
      throw new BadRequestException('A imagem é obrigatória');
    }

    try {
      return await this.updateUserProfilePicture.execute({
        userId,
        contentType: profilePic.mimetype,
        bytes: profilePic.buffer,
      });
    } catch (error) {
      if (error instanceof InvalidUserProfilePictureError) {
        throw new BadRequestException(error.message);
      }

      if (error instanceof UserNotFoundForProfilePictureError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  /**
   * GET /users/:userId/profile-picture
   * Entrega a própria foto ou a foto de alguém que compartilha um grupo com o usuário autenticado.
   */
  @Get(':userId/profile-picture')
  @Header('Cache-Control', 'private, max-age=300')
  @ApiOperation({
    summary: 'Obtém uma foto de perfil visível para o usuário autenticado',
  })
  @ApiParam({ name: 'userId', format: 'uuid' })
  @ApiProduces('image/png', 'image/jpeg', 'image/webp')
  @ApiOkResponse({
    description: 'Conteúdo binário da imagem.',
    content: { 'image/*': { schema: { type: 'string', format: 'binary' } } },
  })
  @ApiBadRequestResponse({ description: 'userId deve ser um UUID válido.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiForbiddenResponse({ description: 'Os usuários não compartilham nenhum grupo.' })
  @ApiNotFoundResponse({ description: 'Usuário ou imagem não encontrado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno ao consultar banco ou storage.' })
  async getProfilePicture(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Request() request: AuthenticatedRequest
  ): Promise<StreamableFile> {
    const requesterUserId = request.user?.id;

    if (!requesterUserId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    try {
      const image = await this.getUserProfilePicture.execute(userId, requesterUserId);

      return new StreamableFile(Buffer.from(image.bytes), {
        type: image.contentType,
        disposition: 'inline',
        length: image.bytes.byteLength,
      });
    } catch (error) {
      if (error instanceof UserImageAccessDeniedError) {
        throw new ForbiddenException(error.message);
      }

      if (error instanceof UserNotFoundError || error instanceof UserProfilePictureNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
