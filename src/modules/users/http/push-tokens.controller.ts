import {
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Put,
  Request,
  UnauthorizedException,
  Body,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import { RegisterPushTokenUseCase } from '../application/register-push-token.use-case';
import {
  PushTokenNotRegisteredError,
  SendTestPushNotificationUseCase,
} from '../application/send-test-push-notification.use-case';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@ApiTags('Users')
@ApiCookieAuth('better-auth')
@ApiBearerAuth('better-auth-bearer')
@Controller('api/users')
export class PushTokensController {
  constructor(
    private readonly registerPushToken: RegisterPushTokenUseCase,
    private readonly sendTestPushNotification: SendTestPushNotificationUseCase
  ) {}

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

  @Post('me/test-notification')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Enfileira uma notificação de teste para o usuário autenticado' })
  @ApiAcceptedResponse({ description: 'Notificação aceita pela fila para processamento.' })
  @ApiConflictResponse({ description: 'O usuário ainda não registrou um Expo Push Token.' })
  @ApiNotFoundResponse({ description: 'Endpoint de teste desabilitado neste ambiente.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  async sendTest(@Request() request: AuthenticatedRequest): Promise<void> {
    if (process.env.ENABLE_NOTIFICATION_TEST_ENDPOINT !== 'true') {
      throw new NotFoundException();
    }

    const userId = request.user?.id;

    if (!userId) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    try {
      await this.sendTestPushNotification.execute(userId);
    } catch (error) {
      if (error instanceof PushTokenNotRegisteredError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
