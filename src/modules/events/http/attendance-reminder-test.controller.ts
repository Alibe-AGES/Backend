import {
  Controller,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../auth/http/authenticated-user';
import {
  type AttendanceReminderResult,
  SendAttendanceRemindersUseCase,
} from '../application/send-attendance-reminders.use-case';

@ApiTags('Notifications')
@ApiCookieAuth('better-auth')
@ApiBearerAuth('better-auth-bearer')
@Controller('api/notifications')
export class AttendanceReminderTestController {
  constructor(private readonly reminders: SendAttendanceRemindersUseCase) {}

  @Post('test/attendance-reminders')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Executa uma vez o processamento diário de lembretes' })
  @ApiAcceptedResponse({ description: 'Processamento executado para os encontros do dia atual.' })
  @ApiNotFoundResponse({ description: 'Endpoint de teste desabilitado neste ambiente.' })
  @ApiUnauthorizedResponse({ description: 'Usuário não autenticado.' })
  async execute(@Request() request: AuthenticatedRequest): Promise<AttendanceReminderResult> {
    if (process.env.ENABLE_NOTIFICATION_TEST_ENDPOINT !== 'true') {
      throw new NotFoundException();
    }

    if (!request.user?.id) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    return this.reminders.execute();
  }
}
