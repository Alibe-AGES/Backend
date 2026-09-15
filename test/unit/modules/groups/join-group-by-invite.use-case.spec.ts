import {
  InviteLinkExpiredError,
  InviteLinkNotFoundError,
  JoinGroupByInviteUseCase,
} from '../../../../src/modules/groups/application/join-group-by-invite.use-case';
import { GroupInviteLink } from '../../../../src/modules/groups/domain/group-invite-link.entity';
import { GroupRepository } from '../../../../src/modules/groups/domain/group.repository';

const TOKEN = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const GROUP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';

describe('JoinGroupByInviteUseCase', () => {
  let groups: jest.Mocked<GroupRepository>;
  let useCase: JoinGroupByInviteUseCase;

  beforeEach(() => {
    groups = {
      create: jest.fn(),
      findById: jest.fn(),
      findDetailsById: jest.fn(),
      findByUserId: jest.fn(),
      createInviteLink: jest.fn(),
      findLatestInviteLinkByGroupId: jest.fn(),
      findInviteLinkByToken: jest.fn(),
      addMember: jest.fn(),
      findProfilePictureAccess: jest.fn(),
    };
    useCase = new JoinGroupByInviteUseCase(groups);
  });

  it('adds the user to the group and returns the token when the invite is valid', async () => {
    const inviteLink = new GroupInviteLink({
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      token: TOKEN,
      validity: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      groupId: GROUP_ID,
    });
    groups.findInviteLinkByToken.mockResolvedValue(inviteLink);

    await expect(useCase.execute(TOKEN, USER_ID)).resolves.toEqual({
      token: TOKEN,
    });
    expect(groups.findInviteLinkByToken).toHaveBeenCalledWith(TOKEN);
    expect(groups.addMember).toHaveBeenCalledWith(GROUP_ID, USER_ID);
  });

  it('reports an invite that does not exist', async () => {
    groups.findInviteLinkByToken.mockResolvedValue(null);

    await expect(useCase.execute(TOKEN, USER_ID)).rejects.toBeInstanceOf(InviteLinkNotFoundError);
    expect(groups.addMember).not.toHaveBeenCalled();
  });

  it('reports an expired invite', async () => {
    const inviteLink = new GroupInviteLink({
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      token: TOKEN,
      validity: new Date(Date.now() - 1000),
      createdAt: new Date(),
      groupId: GROUP_ID,
    });
    groups.findInviteLinkByToken.mockResolvedValue(inviteLink);

    await expect(useCase.execute(TOKEN, USER_ID)).rejects.toBeInstanceOf(InviteLinkExpiredError);
    expect(groups.addMember).not.toHaveBeenCalled();
  });
});
