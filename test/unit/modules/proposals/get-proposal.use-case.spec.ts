import { ProposalDto } from 'src/modules/proposals/http/dto/proposal-dto';
import { GetProposalByGroupUseCase } from '../../../../src/modules/proposals/application/get-proposals-by-group';
import { ProposalRepository } from '../../../../src/modules/proposals/domain/proposal.entity.repository';
import { ListGroupsUseCase } from 'src/modules/groups/application/list-groups.use-case';
import { GetGroupUseCase } from 'src/modules/groups/application/get-group.use-case';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const EVENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const GROUP_ID = '22222222-2222-4222-8222-222222222222';

const mockProposal: ProposalDto = {
  id: '66666666-6666-4666-8666-666666666666',
  createdAt: new Date('2026-10-14T18:55:48.552Z'),
  owner: {
    id: USER_ID,
    name: 'string',
    image: '/users/11111111-1111-4111-8111-111111111111/profile-picture',
  },
  event: {
    id: EVENT_ID,
    name: 'string',
    date: '2026-10-14',
    time: '21:00',
    image: 'string',
    budgetStart: '70.00',
    budgetEnd: '150.00',
    status: 'pending',
    groupId: GROUP_ID,
    location: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      description: 'string',
      manuallyCreated: true,
    },
    proposal: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      ownerId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    },
    createdAt: new Date('2026-10-14T18:55:48.552Z'),
    updatedAt: new Date('2026-10-14T18:55:48.552Z'),
  },
  location: {
    id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'string',
    manuallyCreated: true,
  },
  responses: {
    yes: 0,
    no: 0,
    pending: 0,
  },
  myAnswer: 'pending',
};

const mockGroup = {
  id: GROUP_ID,
  name: 'Grupo de Teste',
  profilePic: null,
  createdAt: new Date(),
  participants: [],
  nextEvent: null
};

describe('GetProposalByGroupUseCase', () => {
  let useCase: GetProposalByGroupUseCase;
  let proposalRepository: jest.Mocked<ProposalRepository>;
  let listGroupsUseCase: jest.Mocked<ListGroupsUseCase>;
  let getGroupUseCase: jest.Mocked<GetGroupUseCase>;

  beforeEach(() => {
    proposalRepository = {
      findProposalsByGroup: jest.fn(),
    } as unknown as jest.Mocked<ProposalRepository>;

    listGroupsUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ListGroupsUseCase>;

    getGroupUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetGroupUseCase>;

    useCase = new GetProposalByGroupUseCase(proposalRepository, listGroupsUseCase, getGroupUseCase);
    jest.resetAllMocks();
  });

  it('return proposal details when the user belongs to the group', async () => {
    getGroupUseCase.execute.mockResolvedValue(mockGroup);
    listGroupsUseCase.execute.mockResolvedValue([mockGroup]);
    proposalRepository.findProposalsByGroup.mockResolvedValue([mockProposal]);

    const result = await useCase.execute(GROUP_ID, USER_ID);

    expect(getGroupUseCase.execute).toHaveBeenCalledWith(GROUP_ID);
    expect(listGroupsUseCase.execute).toHaveBeenCalledWith(USER_ID);
    expect(proposalRepository.findProposalsByGroup).toHaveBeenCalledWith(GROUP_ID, USER_ID);
    expect(result).toEqual([mockProposal]);
  });

  it('denies access when the user does not belong to the group', async () => {
    getGroupUseCase.execute.mockResolvedValue(mockGroup);
    listGroupsUseCase.execute.mockResolvedValue([]);

    await expect(useCase.execute(GROUP_ID, 'unauthorized-user-id')).rejects.toThrow(
      ForbiddenException
    );

    expect(getGroupUseCase.execute).toHaveBeenCalledWith(GROUP_ID);
    expect(listGroupsUseCase.execute).toHaveBeenCalledWith('unauthorized-user-id');
    expect(proposalRepository.findProposalsByGroup).not.toHaveBeenCalled();
  });

  it('returns 401/Forbidden for an unauthenticated user or empty id', async () => {
    getGroupUseCase.execute.mockResolvedValue(mockGroup);
    listGroupsUseCase.execute.mockResolvedValue([]);

    await expect(useCase.execute(GROUP_ID, '')).rejects.toThrow(ForbiddenException);
  });

  it('return NotFoundException for an unexistent group', async () => {
    const nonExistentGroupId = 'non-existent-group-id';
    getGroupUseCase.execute.mockResolvedValue(null as any);

    await expect(useCase.execute(nonExistentGroupId, USER_ID)).rejects.toThrow(
      NotFoundException
    );

    expect(getGroupUseCase.execute).toHaveBeenCalledWith(nonExistentGroupId);
    expect(proposalRepository.findProposalsByGroup).not.toHaveBeenCalled();
  });
});