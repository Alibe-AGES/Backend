import {
  isProposalMatch,
  proposalMatchNotificationMessage,
} from '../../../../src/modules/proposals/domain/proposal-match';

const ANA = '11111111-1111-4111-8111-111111111111';
const BRUNO = '22222222-2222-4222-8222-222222222222';
const CAIO = '33333333-3333-4333-8333-333333333333';

describe('isProposalMatch', () => {
  const state = {
    type: 'suggestion' as const,
    matchedAt: null,
    memberIds: [ANA, BRUNO, CAIO],
    acceptedUserIds: [ANA, BRUNO, CAIO],
  };

  it('matches a suggestion accepted by every current group member', () => {
    expect(isProposalMatch(state)).toBe(true);
  });

  it('ignores acceptances from users who are no longer members', () => {
    expect(isProposalMatch({ ...state, memberIds: [ANA, BRUNO] })).toBe(true);
  });

  it('does not match while a member has not accepted', () => {
    expect(isProposalMatch({ ...state, acceptedUserIds: [ANA, BRUNO] })).toBe(false);
  });

  it('requires a newly joined member to accept as well', () => {
    expect(isProposalMatch({ ...state, memberIds: [ANA, BRUNO, CAIO, 'new-member'] })).toBe(false);
  });

  it('never matches a proposal that belongs to an event', () => {
    expect(isProposalMatch({ ...state, type: 'event' })).toBe(false);
  });

  it('matches only once', () => {
    expect(isProposalMatch({ ...state, matchedAt: new Date('2026-10-20T12:00:00.000Z') })).toBe(
      false
    );
  });

  it('does not match a group without members', () => {
    expect(isProposalMatch({ ...state, memberIds: [], acceptedUserIds: [] })).toBe(false);
  });
});

describe('proposalMatchNotificationMessage', () => {
  it('names the suggestion', () => {
    expect(proposalMatchNotificationMessage('Café de sábado')).toBe(
      'Deu match! Todo o grupo aceitou a sugestão "Café de sábado".'
    );
  });

  it('works without a name', () => {
    expect(proposalMatchNotificationMessage(null)).toBe(
      'Deu match! Todo o grupo aceitou a sugestão.'
    );
  });

  it('shortens long names so the message fits the 255-character column', () => {
    const message = proposalMatchNotificationMessage('x'.repeat(1000));

    expect(message.length).toBeLessThanOrEqual(255);
    expect(message).toContain('…"');
  });
});
