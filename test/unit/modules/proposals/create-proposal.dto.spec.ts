import { CreateProposalDto } from '../../../../src/modules/proposals/http/dto/create-proposal.dto';

const body = {
  locationId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  name: 'Café',
};

describe('CreateProposalDto', () => {
  it('accepts a suggestion with only name and location', () => {
    expect(CreateProposalDto.schema.safeParse(body).success).toBe(true);
  });

  it.each([
    { date: '2026-10-17' },
    { time: '15:00' },
    { budgetStart: '30.00' },
    { budgetEnd: '60.00' },
  ])('rejects %p because day, time and budget belong to the event', (field) => {
    expect(CreateProposalDto.schema.safeParse({ ...body, ...field }).success).toBe(false);
  });
});
