import { Injectable } from '@nestjs/common';
import { EventNotificationRepository } from '../domain/event-notification.repository';
import { GroupPushNotificationService } from './group-push-notification.service';

export const ATTENDANCE_REMINDER_TIME_ZONE = 'America/Sao_Paulo';

export interface AttendanceReminderResult {
  date: string;
  events: number;
  notifications: {
    attempted: number;
    sent: number;
    failed: number;
  };
}

@Injectable()
export class SendAttendanceRemindersUseCase {
  constructor(
    private readonly eventNotifications: EventNotificationRepository,
    private readonly groupNotifications: GroupPushNotificationService
  ) {}

  async execute(now = new Date()): Promise<AttendanceReminderResult> {
    const { date, start, end } = getCalendarDayRange(now, ATTENDANCE_REMINDER_TIME_ZONE);
    const candidates = await this.eventNotifications.findAttendanceReminderCandidates(start, end);

    const summary: AttendanceReminderResult = {
      date,
      events: candidates.length,
      notifications: { attempted: 0, sent: 0, failed: 0 },
    };

    for (const candidate of candidates) {
      try {
        const delivery = await this.groupNotifications.sendToRecipients(candidate.recipients, {
          title: 'Confirme sua presença',
          body: `Não esqueça de confirmar sua presença em ${candidate.eventName}, marcado para hoje.`,
          data: {
            type: 'attendance_reminder',
            eventId: candidate.eventId,
            groupId: candidate.groupId,
          },
        });

        summary.notifications.attempted += delivery.attempted;
        summary.notifications.sent += delivery.sent;
        summary.notifications.failed += delivery.failed;
      } catch {
        summary.notifications.attempted += candidate.recipients.length;
        summary.notifications.failed += candidate.recipients.length;
      }
    }

    return summary;
  }
}

function getCalendarDayRange(
  instant: Date,
  timeZone: string
): { date: string; start: Date; end: Date } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  const startTimestamp = Date.UTC(year, month - 1, day);
  const date = `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

  return {
    date,
    start: new Date(startTimestamp),
    end: new Date(startTimestamp + 24 * 60 * 60 * 1000),
  };
}
