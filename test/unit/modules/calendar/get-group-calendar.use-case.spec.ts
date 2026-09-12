import {
  CalendarAccessDeniedError,
  CalendarGroupNotFoundError,
  GetGroupCalendarUseCase,
  InvalidCalendarPeriodError,
} from '../../../../src/modules/calendar/application/get-group-calendar.use-case';
import {
  CalendarRepository,
  type GroupCalendarData,
} from '../../../../src/modules/calendar/domain/calendar.repository';

const GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_USER_ID = '22222222-2222-4222-8222-222222222222';

describe('GetGroupCalendarUseCase', () => {
  let repository: jest.Mocked<CalendarRepository>;
  let useCase: GetGroupCalendarUseCase;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-08-10T12:00:00.000Z').getTime());
    repository = { findGroupCalendarData: jest.fn() };
    useCase = new GetGroupCalendarUseCase(repository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('groups events, proposals and member availabilities by day', async () => {
    const calendar: GroupCalendarData = {
      userIsMember: true,
      memberIds: [USER_ID, SECOND_USER_ID],
      events: [
        {
          id: 'event-completed',
          timeslot: new Date('2026-08-08T20:00:00.000Z'),
          status: 'confirmed',
          proposalIds: [],
        },
        {
          id: 'event-proposed',
          timeslot: new Date('2026-08-19T20:00:00.000Z'),
          status: 'pending',
          proposalIds: ['proposal-2', 'proposal-1'],
        },
        {
          id: 'event-scheduled',
          timeslot: new Date('2026-08-22T20:00:00.000Z'),
          status: 'confirmed',
          proposalIds: [],
        },
        {
          id: 'event-declined',
          timeslot: new Date('2026-08-23T20:00:00.000Z'),
          status: 'declined',
          proposalIds: ['ignored-proposal'],
        },
      ],
      availabilities: [
        { userId: USER_ID, date: new Date('2026-08-18T00:00:00.000Z') },
        { userId: USER_ID, date: new Date('2026-08-18T00:00:00.000Z') },
        { userId: SECOND_USER_ID, date: new Date('2026-08-18T00:00:00.000Z') },
        { userId: USER_ID, date: new Date('2026-08-22T00:00:00.000Z') },
        {
          userId: '33333333-3333-4333-8333-333333333333',
          date: new Date('2026-08-22T00:00:00.000Z'),
        },
      ],
    };
    repository.findGroupCalendarData.mockResolvedValue(calendar);

    await expect(
      useCase.execute({ groupId: GROUP_ID, userId: USER_ID, month: 8, year: 2026 })
    ).resolves.toEqual([
      {
        date: '2026-08-08',
        scheduledEventIds: [],
        proposalIds: [],
        availableUserIds: [],
        completedEventIds: ['event-completed'],
        allUsersAvailable: false,
      },
      {
        date: '2026-08-18',
        scheduledEventIds: [],
        proposalIds: [],
        availableUserIds: [USER_ID, SECOND_USER_ID],
        completedEventIds: [],
        allUsersAvailable: true,
      },
      {
        date: '2026-08-19',
        scheduledEventIds: [],
        proposalIds: ['proposal-1', 'proposal-2'],
        availableUserIds: [],
        completedEventIds: [],
        allUsersAvailable: false,
      },
      {
        date: '2026-08-22',
        scheduledEventIds: ['event-scheduled'],
        proposalIds: [],
        availableUserIds: [USER_ID],
        completedEventIds: [],
        allUsersAvailable: false,
      },
    ]);
    expect(repository.findGroupCalendarData).toHaveBeenCalledWith({
      groupId: GROUP_ID,
      userId: USER_ID,
      periodStart: new Date('2026-08-01T00:00:00.000Z'),
      periodEnd: new Date('2026-09-01T00:00:00.000Z'),
    });
  });

  it('returns an empty list when the month has no calendar information', async () => {
    repository.findGroupCalendarData.mockResolvedValue({
      userIsMember: true,
      memberIds: [USER_ID],
      events: [],
      availabilities: [],
    });

    await expect(
      useCase.execute({ groupId: GROUP_ID, userId: USER_ID, month: 8, year: 2026 })
    ).resolves.toEqual([]);
  });

  it('reports a group that does not exist', async () => {
    repository.findGroupCalendarData.mockResolvedValue(null);

    await expect(
      useCase.execute({ groupId: GROUP_ID, userId: USER_ID, month: 8, year: 2026 })
    ).rejects.toBeInstanceOf(CalendarGroupNotFoundError);
  });

  it('denies access when the user does not belong to the group', async () => {
    repository.findGroupCalendarData.mockResolvedValue({
      userIsMember: false,
      memberIds: [],
      events: [],
      availabilities: [],
    });

    await expect(
      useCase.execute({ groupId: GROUP_ID, userId: USER_ID, month: 8, year: 2026 })
    ).rejects.toBeInstanceOf(CalendarAccessDeniedError);
  });

  it.each([
    { month: 0, year: 2026 },
    { month: 13, year: 2026 },
    { month: 8.5, year: 2026 },
    { month: 8, year: 26 },
  ])('rejects an invalid calendar period: %o', async ({ month, year }) => {
    await expect(
      useCase.execute({ groupId: GROUP_ID, userId: USER_ID, month, year })
    ).rejects.toBeInstanceOf(InvalidCalendarPeriodError);
    expect(repository.findGroupCalendarData).not.toHaveBeenCalled();
  });
});
