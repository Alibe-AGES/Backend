import { Controller, Get, Request, UnauthorizedException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { AuthenticatedRequest } from './authenticated-user';
import { MockAuthenticatedUserResponseDto } from './dto/mock-authenticated-user-response.dto';

@ApiTags('Authentication - Mock')
@Controller('auth')
export class AuthController {
  /**
   * GET /auth/me
   * Exibe o usuário injetado temporariamente pelo mock de autenticação da Sprint 1.
   */
  @Get('me')
  @ApiOperation({ summary: '[Mock] Exibe o usuário atual da Sprint 1' })
  @ApiOkResponse({
    description: 'Identificador do usuário mockado.',
    type: MockAuthenticatedUserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'O mock de autenticação está desabilitado.' })
  getCurrentUser(@Request() request: AuthenticatedRequest): MockAuthenticatedUserResponseDto {
    if (!request.user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    // Exemplo para os próximos endpoints: o middleware adiciona o usuário na request.
    const userId = request.user.id;

    return { id: userId };
  }
}
