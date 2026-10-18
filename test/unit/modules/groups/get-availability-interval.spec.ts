import {
  GetAvailabilityIntervalsUseCase,
  GroupNotFoundError,
  InvalidAvailabilityDateError,
  AvailabilityAccessDeniedError,
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
    groups.findMembership.mockResolvedValue(true);
  });

  it('returns the availability data for a valid date', async () => {
    groups.findAvailabilitiesByDate.mockResolvedValue(availabilities);

    await expect(useCase.execute(GROUP_ID, DATE, USER_ID)).resolves.toEqual(availabilities);
    expect(groups.findAvailabilitiesByDate).toHaveBeenCalledWith(GROUP_ID, DATE, USER_ID);
  });

  it('reports a group that cannot be accessed', async () => {
    groups.findAvailabilitiesByDate.mockResolvedValue(null);

    await expect(useCase.execute(GROUP_ID, DATE, USER_ID)).rejects.toBeInstanceOf(
      GroupNotFoundError
    );
  });

  it.each(['2026/09/26', '2026-99-99', '2026-02-31', '', undefined, null, [DATE], { date: DATE }])(
    'rejects the invalid date %s before consulting the repository',
    async (date) => {
      await expect(useCase.execute(GROUP_ID, date, USER_ID)).rejects.toBeInstanceOf(
        InvalidAvailabilityDateError
      );
      expect(groups.findAvailabilitiesByDate).not.toHaveBeenCalled();
      expect(groups.findMembership).not.toHaveBeenCalled();
    }
  );

  it.each([
    [null, GroupNotFoundError],
    [false, AvailabilityAccessDeniedError],
  ])('rejects membership %p without reading availabilities', async (membership, error) => {
    groups.findMembership.mockResolvedValue(membership);
    await expect(useCase.execute(GROUP_ID, DATE, USER_ID)).rejects.toBeInstanceOf(error);
    expect(groups.findMembership).toHaveBeenCalledWith(GROUP_ID, USER_ID);
    expect(groups.findAvailabilitiesByDate).not.toHaveBeenCalled();
  });

  it.each([1, 2])(
    'moves the current user from index %s without reordering other members',
    async (index) => {
      const current = availabilities.users[0];
      const others = ['other-a', 'other-b'].map((id) => ({ ...current, id }));
      const users = [...others];
      users.splice(index, 0, current);
      const original = [...users];
      groups.findAvailabilitiesByDate.mockResolvedValue({ date: DATE, users });
      const result = await useCase.execute(GROUP_ID, DATE, USER_ID);
      expect(result.users.map((user) => user.id)).toEqual([USER_ID, 'other-a', 'other-b']);
      expect(users).toEqual(original);
    }
  );

  it('accepts a past date without applying the POST restriction', async () => {
    groups.findAvailabilitiesByDate.mockResolvedValue({ ...availabilities, date: '2000-02-29' });
    await expect(useCase.execute(GROUP_ID, '2000-02-29', USER_ID)).resolves.toMatchObject({
      date: '2000-02-29',
    });
  });
});
