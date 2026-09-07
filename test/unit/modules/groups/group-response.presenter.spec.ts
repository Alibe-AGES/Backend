import { GroupResponsePresenter } from '../../../../src/modules/groups/http/presenters/group-response.presenter';

describe('GroupResponsePresenter', () => {
  const groupId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

  it('replaces the storage key with the API profile picture route', () => {
    expect(
      GroupResponsePresenter.toListItem({
        id: groupId,
        name: 'Amigos da faculdade',
        profilePic: `groups/${groupId}/image.png`,
        createdAt: new Date('2026-08-01T15:00:00.000Z'),
      })
    ).toEqual({
      id: groupId,
      name: 'Amigos da faculdade',
      profilePic: `/groups/${groupId}/profile-picture`,
      createdAt: new Date('2026-08-01T15:00:00.000Z'),
    });
  });

  it('keeps profilePic null when the group has no image', () => {
    expect(GroupResponsePresenter.profilePictureUrl(groupId, null)).toBeNull();
  });
});
