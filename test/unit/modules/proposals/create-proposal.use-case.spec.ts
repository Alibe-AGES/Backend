import {
  CreateProposalUseCase,
  InvalidProposalCreationError,
} from '../../../../src/modules/proposals/application/create-proposal.use-case';
import {
  EventGroupAccessDeniedError,
  EventGroupNotFoundError,
} from '../../../../src/modules/events/application/create-event.use-case';
import {
  EventLocationNotFoundError,
  EventRepository,
} from '../../../../src/modules/events/domain/event.repository';

const input = {
  groupId: '33333333-3333-4333-8333-333333333333',
  userId: '11111111-1111-4111-8111-111111111111',
  locationId: '44444444-4444-4444-8444-444444444444',
  name: '  Café de sábado  ',
  date: '2026-10-17',
  time: '15:00',
};

describe('CreateProposalUseCase', () => {
  const events = {
    findGroupMembership: jest.fn(),
    findLocationById: jest.fn(),
    createWithExistingLocation: jest.fn(),
  };
  const useCase = new CreateProposalUseCase(events as unknown as EventRepository);

  beforeEach(() => {
    jest.resetAllMocks();
    events.findGroupMembership.mockResolvedValue(true);
    events.findLocationById.mockResolvedValue({ id: input.locationId });
    events.createWithExistingLocation.mockResolvedValue({ id: 'proposal-id' });
  });

  it('trims the name, uses UTC, and creates a pending event with the authenticated owner answering yes', async () => {
    await expect(useCase.execute(input)).resolves.toEqual({ id: 'proposal-id' });
    expect(events.findGroupMembership).toHaveBeenCalledWith(input.groupId, input.userId);
    expect(events.findLocationById).toHaveBeenCalledWith(input.locationId);
    expect(events.createWithExistingLocation).toHaveBeenCalledWith({
      id: expect.any(String),
      groupId: input.groupId,
      ownerId: input.userId,
      locationId: input.locationId,
      name: 'Café de sábado',
      timeslot: new Date('2026-10-17T15:00:00.000Z'),
      image: null,
      budgetStart: null,
      budgetEnd: null,
      status: 'pending',
      ownerAnswer: 'yes',
      createdAt: expect.any(Date),
    });
  });

  it('preserves an independently supplied budget bound', async () => {
    await useCase.execute({ ...input, budgetEnd: '60.123' });
    expect(events.createWithExistingLocation).toHaveBeenCalledWith(
      expect.objectContaining({ budgetStart: null, budgetEnd: '60.123' })
    );
  });

  it.each([undefined, null, '', '   '])(
    'rejects invalid name %p before accessing persistence',
    async (name) => {
      await expect(useCase.execute({ ...input, name })).rejects.toBeInstanceOf(
        InvalidProposalCreationError
      );
      expect(events.findGroupMembership).not.toHaveBeenCalled();
      expect(events.createWithExistingLocation).not.toHaveBeenCalled();
    }
  );

  it.each(['date', 'time', 'locationId'] as const)('rejects missing %s', async (field) => {
    await expect(useCase.execute({ ...input, [field]: undefined })).rejects.toBeInstanceOf(
      InvalidProposalCreationError
    );
    expect(events.createWithExistingLocation).not.toHaveBeenCalled();
  });

  it.each([
    [null, EventGroupNotFoundError],
    [false, EventGroupAccessDeniedError],
  ])('rejects membership %p before looking up the location', async (membership, error) => {
    events.findGroupMembership.mockResolvedValue(membership);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(error);
    expect(events.findLocationById).not.toHaveBeenCalled();
    expect(events.createWithExistingLocation).not.toHaveBeenCalled();
  });

  it('rejects an unknown location without creating records', async () => {
    events.findLocationById.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(EventLocationNotFoundError);
    expect(events.createWithExistingLocation).not.toHaveBeenCalled();
  });

  it('propagates persistence failures', async () => {
    events.createWithExistingLocation.mockRejectedValue(new Error('database unavailable'));
    await expect(useCase.execute(input)).rejects.toThrow('database unavailable');
  });
});
