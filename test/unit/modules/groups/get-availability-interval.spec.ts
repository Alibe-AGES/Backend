import {
  GetAvailabilityIntervalsUseCase,
  GroupNotFoundError,
  InvalidAvailabilityDateError,
} from '../../../../src/modules/groups/application/get-availability-intervals.use-case';
import {
  type GroupAvailabilitiesByDate,
  GroupRepository,
} from '../../../../src/modules/groups/domain/group.repository';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DATE = '2026-09-26';

const availabilities: GroupAvailabilitiesByDate = {
  date: DATE,
  users: [
    {
      id: USER_ID,
      profilePic: null,
      name: 'John Doe',
      availableAllDay: false,
      intervals: [
        ['09:00', '12:00'],
        ['14:00', '18:00'],
      ],
    },
  ],
};

describe('GetAvailabilityIntervalsUseCase', () => {
  let groups: jest.Mocked<GroupRepository>;
  let useCase: GetAvailabilityIntervalsUseCase;

  beforeEach(() => {
    groups = {
      create: jest.fn(),
      findById: jest.fn(),
      findDetailsById: jest.fn(),
      findByUserId: jest.fn(),
      findMembership: jest.fn(),
      createInviteLink: jest.fn(),
      findLatestInviteLinkByGroupId: jest.fn(),
      findInviteLinkByToken: jest.fn(),
      addMember: jest.fn(),
      findProfilePictureAccess: jest.fn(),
      findAvailabilitiesByDate: jest.fn(),
    };
    useCase = new GetAvailabilityIntervalsUseCase(groups);
  });

  it('returns the availability data for a valid date', async () => {
    groups.findAvailabilitiesByDate.mockResolvedValue(availabilities);

    await expect(useCase.execute(GROUP_ID, DATE, USER_ID)).resolves.toBe(availabilities);
    expect(groups.findAvailabilitiesByDate).toHaveBeenCalledWith(GROUP_ID, DATE, USER_ID);
  });

  it('reports a group that cannot be accessed', async () => {
    groups.findAvailabilitiesByDate.mockResolvedValue(null);

    await expect(useCase.execute(GROUP_ID, DATE, USER_ID)).rejects.toBeInstanceOf(
      GroupNotFoundError
    );
  });

  it.each(['2026/09/26', '2026-99-99', '2026-02-31'])(
    'rejects the invalid date %s before consulting the repository',
    async (date) => {
      await expect(useCase.execute(GROUP_ID, date, USER_ID)).rejects.toBeInstanceOf(
        InvalidAvailabilityDateError
      );
      expect(groups.findAvailabilitiesByDate).not.toHaveBeenCalled();
    }
  );
});
