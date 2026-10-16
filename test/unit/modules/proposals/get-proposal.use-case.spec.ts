import { ProposalDto } from 'src/modules/proposals/http/dto/proposal-dto';
import { GetProposalByGroupUseCase } from '../../../../src/modules/proposals/application/get-proposals-by-group';
import { ProposalRepository } from '../../../../src/modules/proposals/domain/proposal.entity.repository';

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

describe('GetProposalByGroupUseCase', () => {
  let useCase: GetProposalByGroupUseCase;
  let proposalRepository: jest.Mocked<ProposalRepository>;

  beforeEach(() => {
    proposalRepository = {
      findProposalsByGroup: jest.fn(),
    } as unknown as jest.Mocked<ProposalRepository>;

    useCase = new GetProposalByGroupUseCase(proposalRepository);
    jest.resetAllMocks();
  });

  it('return proposal details when the user belongs to the group', async () => {
    proposalRepository.findProposalsByGroup.mockResolvedValue([mockProposal]);

    const result = await useCase.execute(GROUP_ID, USER_ID);

    expect(proposalRepository.findProposalsByGroup).toHaveBeenCalledWith(GROUP_ID, USER_ID);
    expect(result).toEqual([mockProposal]);
  });

  it('denies access when the user does not belong to the group', async () => {
    proposalRepository.findProposalsByGroup.mockResolvedValue([]);

    const result = await useCase.execute(GROUP_ID, 'unauthorized-user-id');

    expect(proposalRepository.findProposalsByGroup).toHaveBeenCalledWith(
      GROUP_ID,
      'unauthorized-user-id'
    );
    expect(result).toEqual([]);
  });

  it('returns 401 Unauthorized for a unauthenticated user', async () => {
    proposalRepository.findProposalsByGroup.mockResolvedValue([]);

    const result = await useCase.execute(GROUP_ID, '');

    expect(proposalRepository.findProposalsByGroup).toHaveBeenCalledWith(GROUP_ID, '');
    expect(result).toEqual([]);
  });

  it('return NotFoundException for an unexistent group', async () => {
    const nonExistentGroupId = 'non-existent-group-id';
    proposalRepository.findProposalsByGroup.mockResolvedValue([]);

    const result = await useCase.execute(nonExistentGroupId, USER_ID);
    expect(result).toEqual([]);
  });
});
