import {
  GetOrCreateGroupInviteLinkUseCase,
  GroupInviteAccessDeniedError,
  GroupInviteGroupNotFoundError,
} from '../../../../src/modules/groups/application/get-or-create-group-invite-link.use-case';
import { GroupInviteLink } from '../../../../src/modules/groups/domain/group-invite-link.entity';
import { GroupRepository } from '../../../../src/modules/groups/domain/group.repository';

const groupId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const userId = '11111111-1111-4111-8111-111111111111';

describe('GetOrCreateGroupInviteLinkUseCase', () => {
  const findMembership = jest.fn();
  const findLatestInviteLinkByGroupId = jest.fn();
  const createInviteLink = jest.fn();
  const repository = {
    findMembership,
    findLatestInviteLinkByGroupId,
    createInviteLink,
  } as unknown as GroupRepository;
  const useCase = new GetOrCreateGroupInviteLinkUseCase(repository);

  beforeEach(() => {
    findMembership.mockReset();
    findLatestInviteLinkByGroupId.mockReset();
    createInviteLink.mockReset();
  });

  it('returns the current invite when the authenticated user belongs to the group', async () => {
    const invite = new GroupInviteLink({
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      token: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      validity: new Date('2099-09-21T12:00:00.000Z'),
      createdAt: new Date('2099-09-14T12:00:00.000Z'),
      groupId,
    });
    findMembership.mockResolvedValue(true);
    findLatestInviteLinkByGroupId.mockResolvedValue(invite);

    await expect(useCase.execute(groupId, userId)).resolves.toEqual({
      token: invite.token,
      expiresAt: invite.validity,
    });
    expect(findMembership).toHaveBeenCalledWith(groupId, userId);
    expect(createInviteLink).not.toHaveBeenCalled();
  });

  it('denies invite access when the authenticated user does not belong to the group', async () => {
    findMembership.mockResolvedValue(false);

    await expect(useCase.execute(groupId, userId)).rejects.toThrow(GroupInviteAccessDeniedError);
    expect(findLatestInviteLinkByGroupId).not.toHaveBeenCalled();
    expect(createInviteLink).not.toHaveBeenCalled();
  });

  it('reports a group that does not exist', async () => {
    findMembership.mockResolvedValue(null);

    await expect(useCase.execute(groupId, userId)).rejects.toThrow(GroupInviteGroupNotFoundError);
    expect(findLatestInviteLinkByGroupId).not.toHaveBeenCalled();
    expect(createInviteLink).not.toHaveBeenCalled();
  });
});
