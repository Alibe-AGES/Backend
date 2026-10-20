import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';
import {
  CreateProposalUseCase,
  InvalidProposalCreationError,
} from '../../../../src/modules/proposals/application/create-proposal.use-case';
import { ProposalsController } from '../../../../src/modules/proposals/http/proposals.controller';

describe('ProposalsController error handling', () => {
  const input = {
    locationId: 'location-id',
    name: 'Café',
    date: '2026-10-17',
    time: '15:00',
  };
  const execute = jest.fn();
  const controller = new ProposalsController({ execute } as unknown as CreateProposalUseCase);

  beforeEach(() => jest.resetAllMocks());

  it.each([{}, { user: {} }])(
    'rejects a request without an authenticated user ID: %p',
    async (request) => {
      await expect(
        controller.create('group-id', input, request as AuthenticatedRequest)
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(execute).not.toHaveBeenCalled();
    }
  );

  it('maps application validation errors to HTTP 400', async () => {
    execute.mockRejectedValue(new InvalidProposalCreationError('Invalid input'));
    await expect(
      controller.create('group-id', input, { user: { id: 'user-id' } } as AuthenticatedRequest)
    ).rejects.toEqual(new BadRequestException('Invalid input'));
  });

  it('propagates unexpected failures without converting them to client errors', async () => {
    const failure = new Error('Database unavailable');
    execute.mockRejectedValue(failure);
    await expect(
      controller.create('group-id', input, { user: { id: 'user-id' } } as AuthenticatedRequest)
    ).rejects.toBe(failure);
  });
});
