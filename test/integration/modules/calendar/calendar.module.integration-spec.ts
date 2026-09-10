import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { GetGroupCalendarUseCase } from '../../../../src/modules/calendar/application/get-group-calendar.use-case';
import { CalendarModule } from '../../../../src/modules/calendar/calendar.module';
import { CalendarRepository } from '../../../../src/modules/calendar/domain/calendar.repository';
import { CalendarController } from '../../../../src/modules/calendar/http/calendar.controller';
import { PrismaCalendarRepository } from '../../../../src/modules/calendar/persistence/prisma-calendar.repository';

describe('CalendarModule integration', () => {
  let module: TestingModule;
  const findUnique = jest.fn();

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [CalendarModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ group: { findUnique } })
      .compile();
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    findUnique.mockReset();
  });

  it('registers the controller, use case and Prisma repository', () => {
    expect(module.get(CalendarController)).toBeInstanceOf(CalendarController);
    expect(module.get(GetGroupCalendarUseCase)).toBeInstanceOf(GetGroupCalendarUseCase);
    expect(module.get(CalendarRepository)).toBeInstanceOf(PrismaCalendarRepository);
  });

  it('connects the use case to the Prisma adapter using the requested period', async () => {
    const groupId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const userId = '11111111-1111-4111-8111-111111111111';
    findUnique.mockResolvedValue({
      users: [{ userId }],
      events: [
        {
          id: 'event-id',
          timeslot: new Date('2026-05-22T18:00:00.000Z'),
          status: 'pending',
          proposals: [{ id: 'proposal-id' }],
        },
      ],
      availabilities: [
        {
          userId,
          date: new Date('2026-05-22T00:00:00.000Z'),
        },
      ],
    });

    const result = await module.get(GetGroupCalendarUseCase).execute({
      groupId,
      userId,
      month: 5,
      year: 2026,
    });

    expect(result).toEqual([
      {
        date: '2026-05-22',
        scheduledEventIds: [],
        proposalIds: ['proposal-id'],
        availableUserIds: [userId],
        completedEventIds: [],
        allUsersAvailable: true,
      },
    ]);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: groupId },
        select: expect.objectContaining({
          users: expect.any(Object),
          events: expect.objectContaining({
            where: {
              timeslot: {
                gte: new Date('2026-05-01T00:00:00.000Z'),
                lt: new Date('2026-06-01T00:00:00.000Z'),
              },
            },
          }),
          availabilities: expect.objectContaining({
            where: {
              date: {
                gte: new Date('2026-05-01T00:00:00.000Z'),
                lt: new Date('2026-06-01T00:00:00.000Z'),
              },
            },
            orderBy: { date: 'asc' },
            select: { userId: true, date: true },
          }),
        }),
      })
    );
  });
});
