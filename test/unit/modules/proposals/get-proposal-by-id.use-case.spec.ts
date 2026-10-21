import {
  GetProposalByIdUseCase,
  ProposalDetailsAccessDeniedError,
  ProposalDetailsNotFoundError,
} from '../../../../src/modules/proposals/application/get-proposal-by-id.use-case';
import { ProposalRepository } from '../../../../src/modules/proposals/domain/proposal.repository';

describe('GetProposalByIdUseCase', () => {
  const proposals = { findDetails: jest.fn() };
  const useCase = new GetProposalByIdUseCase(proposals as unknown as ProposalRepository);

  beforeEach(() => jest.resetAllMocks());

  it('returns the proposal to a group member', async () => {
    const proposal = { id: 'proposal-id' };
    proposals.findDetails.mockResolvedValue({ proposal, userIsMember: true });
    await expect(useCase.execute('proposal-id', 'user-id')).resolves.toBe(proposal);
    expect(proposals.findDetails).toHaveBeenCalledWith('proposal-id', 'user-id');
  });

  it('reports an unknown proposal', async () => {
    proposals.findDetails.mockResolvedValue(null);
    await expect(useCase.execute('proposal-id', 'user-id')).rejects.toBeInstanceOf(
      ProposalDetailsNotFoundError
    );
  });

  it('denies a user outside the group', async () => {
    proposals.findDetails.mockResolvedValue({ proposal: {}, userIsMember: false });
    await expect(useCase.execute('proposal-id', 'user-id')).rejects.toBeInstanceOf(
      ProposalDetailsAccessDeniedError
    );
  });
});
