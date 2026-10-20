import { CreateProposalDto } from '../../../../src/modules/proposals/http/dto/create-proposal.dto';

const body = {
  locationId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  name: 'Café',
  date: '2026-10-17',
  time: '15:00',
};

describe('CreateProposalDto budget capacity', () => {
  describe.each(['budgetStart', 'budgetEnd'])('%s', (field) => {
    it.each([
      '0',
      '-0.00',
      '00030.123',
      '-1.25',
      '9'.repeat(35),
      '-' + '9'.repeat(35),
      '9'.repeat(35) + '.' + '9'.repeat(30),
      '-000' + '9'.repeat(35) + '.' + '9'.repeat(30),
      '0'.repeat(36) + '.01',
    ])('preserves valid decimal %s', (value) => {
      expect(CreateProposalDto.schema.parse({ ...body, [field]: value })[field]).toBe(value);
    });

    it.each([
      '1' + '0'.repeat(35),
      '-1' + '0'.repeat(35),
      '0001' + '0'.repeat(35) + '.01',
      '9'.repeat(36) + '.' + '9'.repeat(30),
      '0.' + '1'.repeat(31),
    ])('rejects decimal exceeding database capacity %s', (value) => {
      expect(CreateProposalDto.schema.safeParse({ ...body, [field]: value }).success).toBe(false);
    });
  });
});
