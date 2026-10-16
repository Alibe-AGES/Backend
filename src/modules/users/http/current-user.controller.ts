import { Controller, Get, NotFoundException, Request, UnauthorizedException } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
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
import { CurrentUserResponseDto } from './dto/current-user-response.dto';

@ApiTags('Users')
@ApiCookieAuth('better-auth')
@ApiBearerAuth('better-auth-bearer')
@Controller('api/users')
export class CurrentUserController {
  constructor(private readonly getCurrentUserSummary: GetCurrentUserSummaryUseCase) {}

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
}
