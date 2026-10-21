import {
  ActiveProposalsAccessDeniedError,
  ActiveProposalsGroupNotFoundError,
  ListActiveProposalsUseCase,
} from '../../../../src/modules/proposals/application/list-active-proposals.use-case';
import { ProposalRepository } from '../../../../src/modules/proposals/domain/proposal.repository';

describe('ListActiveProposalsUseCase', () => {
  const proposals = { findGroupMembership: jest.fn(), findActiveSuggestions: jest.fn() };
  const useCase = new ListActiveProposalsUseCase(proposals as unknown as ProposalRepository);

  beforeEach(() => jest.resetAllMocks());

  it('lists the active suggestions of a group the user belongs to', async () => {
    const active = [{ id: 'proposal-id' }];
    proposals.findGroupMembership.mockResolvedValue(true);
    proposals.findActiveSuggestions.mockResolvedValue(active);

    await expect(useCase.execute('group-id', 'user-id')).resolves.toBe(active);
    expect(proposals.findGroupMembership).toHaveBeenCalledWith('group-id', 'user-id');
    expect(proposals.findActiveSuggestions).toHaveBeenCalledWith('group-id', 'user-id');
  });

  it('reports an unknown group', async () => {
    proposals.findGroupMembership.mockResolvedValue(null);

    await expect(useCase.execute('group-id', 'user-id')).rejects.toBeInstanceOf(
      ActiveProposalsGroupNotFoundError
    );
    expect(proposals.findActiveSuggestions).not.toHaveBeenCalled();
  });

  it('denies a user outside the group', async () => {
    proposals.findGroupMembership.mockResolvedValue(false);

    await expect(useCase.execute('group-id', 'user-id')).rejects.toBeInstanceOf(
      ActiveProposalsAccessDeniedError
    );
    expect(proposals.findActiveSuggestions).not.toHaveBeenCalled();
  });
});
