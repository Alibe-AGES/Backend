import { CreateProposalDto } from '../../../../src/modules/proposals/http/dto/create-proposal.dto';

const body = {
  externalId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
};

describe('CreateProposalDto', () => {
  it('accepts a Google Places suggestion with only externalId', () => {
    expect(CreateProposalDto.schema.safeParse(body).success).toBe(true);
  });

  it('accepts an internal locationId and a new manual location without a date', () => {
    expect(
      CreateProposalDto.schema.safeParse({
        locationId: '11111111-1111-4111-8111-111111111111',
      }).success
    ).toBe(true);
    expect(CreateProposalDto.schema.safeParse({ name: 'Manual' }).success).toBe(true);
  });

  it('rejects ambiguous selectors and accepts an empty manual location', () => {
    expect(
      CreateProposalDto.schema.safeParse({
        ...body,
        locationId: '11111111-1111-4111-8111-111111111111',
      }).success
    ).toBe(false);
    expect(CreateProposalDto.schema.safeParse({}).success).toBe(true);
  });

  it.each([{ time: '15:00' }, { budgetStart: '30.00' }, { budgetEnd: '60.00' }])(
    'rejects %p because day, time and budget belong to the event',
    (field) => {
      expect(CreateProposalDto.schema.safeParse({ ...body, ...field }).success).toBe(false);
    }
  );
});
