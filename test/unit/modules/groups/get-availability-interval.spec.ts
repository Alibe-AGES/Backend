import {
  GetAvailabilityIntervalsUseCase,
  GroupNotFoundError,
} from '../../../../src/modules/groups/application/get-availability-intervals.use-case';
import { GroupRepository } from '../../../../src/modules/groups/domain/group.repository';
import { AvailabilitiesResponseDto } from '../../../../src/modules/groups/http/dto/get-availabilities-response.dto';

const userId = '11111111-1111-4111-8111-111111111111';
const GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DATE = '2026-09-26';

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

  it('Retorna as disponibilidades para um dado grupo', async () => {
    const mockAvailabilities: AvailabilitiesResponseDto = {
      date: DATE,
      users: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          image: null,
          name: 'John Doe',
          availableAllDay: false,
          intervals: [
            ['09:00', '12:00'],
            ['14:00', '18:00'],
          ],
        },
      ],
    };

    groups.findAvailabilitiesByDate.mockResolvedValue(mockAvailabilities);

    await expect(useCase.execute(GROUP_ID, DATE, userId)).resolves.toEqual(mockAvailabilities);
    expect(groups.findAvailabilitiesByDate).toHaveBeenCalledWith(GROUP_ID, DATE, userId);
  });

  it('reports a group that does not exist', async () => {
    groups.findAvailabilitiesByDate.mockRejectedValue(new GroupNotFoundError());

    await expect(useCase.execute(GROUP_ID, DATE, userId)).rejects.toBeInstanceOf(
      GroupNotFoundError
    );
    expect(groups.findAvailabilitiesByDate).toHaveBeenCalledWith(GROUP_ID, DATE, userId);
  });
});
