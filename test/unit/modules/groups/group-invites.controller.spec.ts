import { GoneException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GroupInvitesController } from '../../../../src/modules/groups/http/group-invites.controller';
import { GetOrCreateGroupInviteLinkUseCase } from '../../../../src/modules/groups/application/get-or-create-group-invite-link.use-case';
import {
  InviteLinkExpiredError,
  InviteLinkNotFoundError,
  JoinGroupByInviteUseCase,
} from '../../../../src/modules/groups/application/join-group-by-invite.use-case';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';

describe('GroupInvitesController', () => {
  let controller: GroupInvitesController;
  let getOrCreateGroupInviteLinkUseCaseMock: { execute: jest.Mock };
  let joinGroupByInviteUseCaseMock: { execute: jest.Mock };

  const TOKEN = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const USER_ID = '11111111-1111-4111-8111-111111111111';
  const authenticatedRequest = { user: { id: USER_ID } } as AuthenticatedRequest;

  beforeEach(async () => {
    getOrCreateGroupInviteLinkUseCaseMock = { execute: jest.fn() };
    joinGroupByInviteUseCaseMock = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupInvitesController],
      providers: [
        {
          provide: GetOrCreateGroupInviteLinkUseCase,
          useValue: getOrCreateGroupInviteLinkUseCaseMock,
        },
        {
          provide: JoinGroupByInviteUseCase,
          useValue: joinGroupByInviteUseCaseMock,
        },
      ],
    }).compile();

    controller = module.get(GroupInvitesController);
  });

  it('adds the authenticated user to the group and returns the result', async () => {
    const result = { token: TOKEN };
    joinGroupByInviteUseCaseMock.execute.mockResolvedValue(result);

    await expect(controller.join(TOKEN, authenticatedRequest)).resolves.toEqual(result);
    expect(joinGroupByInviteUseCaseMock.execute).toHaveBeenCalledWith(TOKEN, USER_ID);
  });

  it('rejects with 401 when there is no authenticated user', async () => {
    await expect(
      controller.join(TOKEN, { user: undefined } as AuthenticatedRequest)
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(joinGroupByInviteUseCaseMock.execute).not.toHaveBeenCalled();
  });

  it('rejects with 404 when the invite does not exist', async () => {
    joinGroupByInviteUseCaseMock.execute.mockRejectedValue(
      new InviteLinkNotFoundError('Convite não encontrado')
    );

    await expect(controller.join(TOKEN, authenticatedRequest)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('rejects with 410 when the invite has expired', async () => {
    joinGroupByInviteUseCaseMock.execute.mockRejectedValue(
      new InviteLinkExpiredError('Convite expirado')
    );

    await expect(controller.join(TOKEN, authenticatedRequest)).rejects.toBeInstanceOf(
      GoneException
    );
  });
});
