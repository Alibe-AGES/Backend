import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';
import {
  CreateProposalUseCase,
  InvalidProposalCreationError,
} from '../../../../src/modules/proposals/application/create-proposal.use-case';
import {
  ActiveProposalsAccessDeniedError,
  ActiveProposalsGroupNotFoundError,
  ListActiveProposalsUseCase,
} from '../../../../src/modules/proposals/application/list-active-proposals.use-case';
import { ProposalsController } from '../../../../src/modules/proposals/http/proposals.controller';
import { PlacesProviderUnavailableError } from '../../../../src/shared/places/places-provider';

describe('ProposalsController error handling', () => {
  const input = {
    externalId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  };
  const execute = jest.fn();
  const listActive = jest.fn();
  const controller = new ProposalsController(
    { execute } as unknown as CreateProposalUseCase,
    { execute: listActive } as unknown as ListActiveProposalsUseCase
  );

  beforeEach(() => jest.resetAllMocks());

  it.each([{}, { user: {} }])(
    'rejects a request without an authenticated user ID: %p',
    async (request) => {
      await expect(
        controller.create('group-id', input, undefined, request as AuthenticatedRequest)
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(execute).not.toHaveBeenCalled();
    }
  );

  it('maps application validation errors to HTTP 400', async () => {
    execute.mockRejectedValue(new InvalidProposalCreationError('Invalid input'));
    await expect(
      controller.create('group-id', input, undefined, {
        user: { id: 'user-id' },
      } as AuthenticatedRequest)
    ).rejects.toEqual(new BadRequestException('Invalid input'));
  });

  it('maps an unavailable places provider to HTTP 503', async () => {
    execute.mockRejectedValue(new PlacesProviderUnavailableError('down'));
    await expect(
      controller.create('group-id', input, undefined, {
        user: { id: 'user-id' },
      } as AuthenticatedRequest)
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('propagates unexpected failures without converting them to client errors', async () => {
    const failure = new Error('Database unavailable');
    execute.mockRejectedValue(failure);
    await expect(
      controller.create('group-id', input, undefined, {
        user: { id: 'user-id' },
      } as AuthenticatedRequest)
    ).rejects.toBe(failure);
  });

  describe('listActive', () => {
    const request = { user: { id: 'user-id' } } as AuthenticatedRequest;

    it.each([{}, { user: {} }])(
      'rejects a request without an authenticated user ID: %p',
      async (req) => {
        await expect(
          controller.listActive('group-id', req as AuthenticatedRequest)
        ).rejects.toBeInstanceOf(UnauthorizedException);
        expect(listActive).not.toHaveBeenCalled();
      }
    );

    it.each([
      [new ActiveProposalsGroupNotFoundError('Grupo não encontrado'), NotFoundException],
      [new ActiveProposalsAccessDeniedError('Fora do grupo'), ForbiddenException],
    ])('maps %p to the matching HTTP error', async (failure, httpError) => {
      listActive.mockRejectedValue(failure);
      await expect(controller.listActive('group-id', request)).rejects.toBeInstanceOf(httpError);
    });

    it('propagates unexpected failures', async () => {
      const failure = new Error('Database unavailable');
      listActive.mockRejectedValue(failure);
      await expect(controller.listActive('group-id', request)).rejects.toBe(failure);
    });
  });
});
