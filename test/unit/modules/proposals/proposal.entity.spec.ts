import { Proposal, ProposalProps } from '../../../../src/modules/proposals/domain/proposal.entity';

describe('Proposal Entity', () => {
  it('should successfully instantiate a proposal entity with correct properties', () => {
    const proposalData:ProposalProps = {
      id: '55555555-5555-4555-8555-555555555555',
      createdAt: new Date('2026-10-14T18:55:48.552Z'),
      eventId: '22222222-2222-4222-8222-222222222222',
      ownerId: '11111111-1111-4111-8111-111111111111',
    };

    const proposal = new Proposal(proposalData);

    expect(proposal).toBeDefined();
    expect(proposal.id).toBe(proposalData.id);
    expect(proposal.createdAt).toEqual(proposalData.createdAt);
    expect(proposal.eventId).toBe(proposalData.eventId);
    expect(proposal.ownerId).toBe(proposalData.ownerId);
  });
});