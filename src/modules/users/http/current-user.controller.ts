import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Put,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import {
  CurrentUserNotFoundError,
  GetCurrentUserSummaryUseCase,
} from '../application/get-current-user-summary.use-case';
import {
  UpdateUserProfileUseCase,
  UserNotFoundForProfileUpdateError,
} from '../application/update-user-profile.use-case';
import { CurrentUserResponseDto } from './dto/current-user-response.dto';
import { UpdateUserProfileResponseDto } from './dto/update-user-profile-response.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@ApiTags('Users')
@ApiCookieAuth('better-auth')
@ApiBearerAuth('better-auth-bearer')
@Controller('api/users')
export class CurrentUserController {
  constructor(
    private readonly getCurrentUserSummary: GetCurrentUserSummaryUseCase,
    private readonly updateUserProfile: UpdateUserProfileUseCase
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtém o usuário autenticado e o resumo de eventos' })
  @ApiOkResponse({ type: CurrentUserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiNotFoundResponse({ description: 'Usuário autenticado não encontrado.' })
  async getMe(@Request() request: AuthenticatedRequest): Promise<CurrentUserResponseDto> {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    try {
      const summary = await this.getCurrentUserSummary.execute(userId);

      return {
        ...summary,
        profilePic: summary.profilePic ? `/users/${summary.id}/profile-picture` : null,
      };
    } catch (error) {
      if (error instanceof CurrentUserNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }

  @Put('me')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Atualiza o nome do usuário autenticado' })
  @ApiCreatedResponse({ type: UpdateUserProfileResponseDto })
  @ApiBadRequestResponse({ description: 'Nome ausente, vazio ou com mais de 100 caracteres.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  @ApiNotFoundResponse({ description: 'Usuário autenticado não encontrado.' })
  async updateMe(
    @Body() body: UpdateUserProfileDto,
    @Request() request: AuthenticatedRequest
  ): Promise<UpdateUserProfileResponseDto> {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    try {
      return await this.updateUserProfile.execute({ userId, name: body.name });
    } catch (error) {
      if (error instanceof UserNotFoundForProfileUpdateError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
