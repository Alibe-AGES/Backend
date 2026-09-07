import {
  Controller,
  ForbiddenException,
  Get,
  Header,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Request,
  StreamableFile,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
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
  GetUserProfilePictureUseCase,
  UserImageAccessDeniedError,
  UserNotFoundError,
  UserProfilePictureNotFoundError,
} from '../application/get-user-profile-picture.use-case';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly getUserProfilePicture: GetUserProfilePictureUseCase) {}

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
