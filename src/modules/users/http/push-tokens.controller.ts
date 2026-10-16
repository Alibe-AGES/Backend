import {
  Controller,
  HttpCode,
  HttpStatus,
  Put,
  Request,
  UnauthorizedException,
  Body,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import { RegisterPushTokenUseCase } from '../application/register-push-token.use-case';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@ApiTags('Users')
@ApiCookieAuth('better-auth')
@ApiBearerAuth('better-auth-bearer')
@Controller('api/users')
export class PushTokensController {
  constructor(private readonly registerPushToken: RegisterPushTokenUseCase) {}

  @Put('me/push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Registra ou atualiza o token de push do dispositivo atual' })
  @ApiNoContentResponse({ description: 'Token associado ao usuário autenticado.' })
  @ApiBadRequestResponse({ description: 'Token do Expo Push Service inválido.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  async execute(
    @Body() body: RegisterPushTokenDto,
    @Request() request: AuthenticatedRequest
  ): Promise<void> {
    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    await this.registerPushToken.execute({ userId, token: body.token });
  }
}
