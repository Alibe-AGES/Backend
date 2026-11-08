import { GroupPushNotificationService } from '../../../../src/modules/events/application/group-push-notification.service';
import { SendAttendanceRemindersUseCase } from '../../../../src/modules/events/application/send-attendance-reminders.use-case';
import { EventNotificationRepository } from '../../../../src/modules/events/domain/event-notification.repository';

describe('SendAttendanceRemindersUseCase', () => {
  it('notifies unanswered members for pending events occurring on the São Paulo calendar day', async () => {
    const findAttendanceReminderCandidates = jest.fn().mockResolvedValue([
      {
        eventId: 'event-id',
        eventName: 'Cinema',
        groupId: 'group-id',
        recipients: [{ userId: 'user-id', pushToken: 'ExpoPushToken[token]' }],
      },
    ]);
    const sendToRecipients = jest.fn().mockResolvedValue({ attempted: 1, sent: 1, failed: 0 });
    const useCase = new SendAttendanceRemindersUseCase(
      { findAttendanceReminderCandidates } as unknown as EventNotificationRepository,
      { sendToRecipients } as unknown as GroupPushNotificationService
    );

    await expect(useCase.execute(new Date('2026-10-18T03:30:00.000Z'))).resolves.toEqual({
      date: '2026-10-18',
      events: 1,
      notifications: { attempted: 1, sent: 1, failed: 0 },
    });

    expect(findAttendanceReminderCandidates).toHaveBeenCalledWith(
      new Date('2026-10-18T00:00:00.000Z'),
      new Date('2026-10-19T00:00:00.000Z')
    );
    expect(sendToRecipients).toHaveBeenCalledWith(
      [{ userId: 'user-id', pushToken: 'ExpoPushToken[token]' }],
      {
        title: 'Confirme sua presença',
        body: 'Não esqueça de confirmar sua presença em Cinema, marcado para hoje.',
        data: { type: 'attendance_reminder', eventId: 'event-id', groupId: 'group-id' },
      }
    );
  });

  it('aggregates deliveries from multiple events', async () => {
    const findAttendanceReminderCandidates = jest.fn().mockResolvedValue([
      { eventId: 'event-1', eventName: 'Cinema', groupId: 'group', recipients: [] },
      { eventId: 'event-2', eventName: 'Café', groupId: 'group', recipients: [] },
    ]);
    const sendToRecipients = jest
      .fn()
      .mockResolvedValueOnce({ attempted: 2, sent: 2, failed: 0 })
      .mockResolvedValueOnce({ attempted: 3, sent: 2, failed: 1 });
    const useCase = new SendAttendanceRemindersUseCase(
      { findAttendanceReminderCandidates } as unknown as EventNotificationRepository,
      { sendToRecipients } as unknown as GroupPushNotificationService
    );

    await expect(useCase.execute(new Date('2026-10-18T12:00:00.000Z'))).resolves.toMatchObject({
      events: 2,
      notifications: { attempted: 5, sent: 4, failed: 1 },
    });
  });
});
