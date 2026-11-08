import { SendAttendanceRemindersUseCase } from '../../../../src/modules/events/application/send-attendance-reminders.use-case';
import { AttendanceReminderScheduler } from '../../../../src/modules/events/scheduling/attendance-reminder.scheduler';
import { DistributedTaskLock } from '../../../../src/shared/scheduling/distributed-task-lock';

describe('AttendanceReminderScheduler', () => {
  it('executes the attendance reminder use case after acquiring the distributed lock', async () => {
    const execute = jest.fn().mockResolvedValue({
      date: '2026-10-18',
      events: 1,
      notifications: { attempted: 2, sent: 2, failed: 0 },
    });
    const runExclusive = jest.fn().mockImplementation(async (_key, task) => ({
      acquired: true,
      result: await task(),
    }));
    const scheduler = new AttendanceReminderScheduler(
      { execute } as unknown as SendAttendanceRemindersUseCase,
      { runExclusive } as unknown as DistributedTaskLock
    );

    await scheduler.handle();

    expect(runExclusive).toHaveBeenCalledWith(
      'attendance-confirmation-reminders',
      expect.any(Function)
    );
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('does not execute when another replica holds the distributed lock', async () => {
    const execute = jest.fn();
    const runExclusive = jest.fn().mockResolvedValue({ acquired: false });
    const scheduler = new AttendanceReminderScheduler(
      { execute } as unknown as SendAttendanceRemindersUseCase,
      { runExclusive } as unknown as DistributedTaskLock
    );

    await scheduler.handle();

    expect(execute).not.toHaveBeenCalled();
  });
});
