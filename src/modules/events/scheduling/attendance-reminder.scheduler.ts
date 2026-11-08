import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  ATTENDANCE_REMINDER_TIME_ZONE,
  SendAttendanceRemindersUseCase,
} from '../application/send-attendance-reminders.use-case';
import { DistributedTaskLock } from '../../../shared/scheduling/distributed-task-lock';

const ATTENDANCE_REMINDER_LOCK_KEY = 'attendance-confirmation-reminders';

@Injectable()
export class AttendanceReminderScheduler {
  private readonly logger = new Logger(AttendanceReminderScheduler.name);

  constructor(
    private readonly reminders: SendAttendanceRemindersUseCase,
    private readonly taskLock: DistributedTaskLock
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'attendance-confirmation-reminders',
    timeZone: ATTENDANCE_REMINDER_TIME_ZONE,
  })
  async handle(): Promise<void> {
    const execution = await this.taskLock.runExclusive(ATTENDANCE_REMINDER_LOCK_KEY, () =>
      this.reminders.execute()
    );

    if (!execution.acquired) {
      this.logger.log('Lembretes ignorados porque outra réplica já está executando a tarefa');
      return;
    }

    const result = execution.result;
    this.logger.log(
      `Lembretes de ${result.date}: ${result.notifications.sent} enviados, ${result.notifications.failed} falharam`
    );
  }
}
