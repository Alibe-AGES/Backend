import { Test, TestingModule } from '@nestjs/testing';
import { GroupsModule } from '../../../../src/modules/groups/groups.module';
import { GroupInvitesController } from '../../../../src/modules/groups/http/group-invites.controller';
import { GroupsController } from '../../../../src/modules/groups/http/groups.controller';

describe('GroupsModule integration', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [GroupsModule],
    }).compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it('registers the mock controllers without application providers', () => {
    expect(module.get(GroupsController)).toBeInstanceOf(GroupsController);
    expect(module.get(GroupInvitesController)).toBeInstanceOf(GroupInvitesController);
  });

  it('reuses a valid invite and creates a new token after expiration', () => {
    const controller = module.get(GroupInvitesController);
    const groupId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const initialTime = new Date('2026-08-30T12:00:00.000Z').getTime();
    const now = jest.spyOn(Date, 'now').mockReturnValue(initialTime);

    const first = controller.getInviteLink(groupId);
    const current = controller.getInviteLink(groupId);

    expect(current.token).toBe(first.token);
    expect(first.expiresAt).toEqual(new Date('2026-09-06T12:00:00.000Z'));

    now.mockReturnValue(new Date('2026-09-07T12:00:00.000Z').getTime());
    const renewed = controller.getInviteLink(groupId);

    expect(renewed.token).not.toBe(first.token);
    now.mockRestore();
  });
});
