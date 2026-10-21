import {
  CreateEventUseCase,
  EventGroupAccessDeniedError,
  EventGroupNotFoundError,
  EventLocationNotFoundError,
  InvalidEventCreationError,
  type CreateEventInput,
} from '../../../../src/modules/events/application/create-event.use-case';
import { InMemoryEventRepository } from '../../../helpers/in-memory-event.repository';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';
import { GroupPushNotificationService } from '../../../../src/modules/events/application/group-push-notification.service';

const GROUP_ID = '33333333-3333-4333-8333-333333333333';
const OWNER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '99999999-9999-4999-8999-999999999999';
const PNG_BYTES = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const validInput: CreateEventInput = {
  groupId: GROUP_ID,
  userId: OWNER_ID,
  name: 'Jantar de aniversário',
  date: '2026-10-15',
  time: '20:00',
  location: 'Rua dos Andradas, 1234, Porto Alegre',
  budgetStart: '50.00',
  budgetEnd: '120.00',
};

describe('CreateEventUseCase', () => {
  let events: InMemoryEventRepository;
  let storage: InMemoryObjectStorage;
  let useCase: CreateEventUseCase;
  let groupNotifications: jest.Mocked<GroupPushNotificationService>;

  beforeEach(() => {
    events = new InMemoryEventRepository();
    storage = new InMemoryObjectStorage();
    events.setGroupMembers(GROUP_ID, [OWNER_ID]);
    groupNotifications = {
      sendToGroup: jest.fn().mockResolvedValue({ attempted: 1, sent: 1, failed: 0 }),
      sendToRecipients: jest.fn(),
    } as unknown as jest.Mocked<GroupPushNotificationService>;
    useCase = new CreateEventUseCase(events, storage, groupNotifications);
  });

  it('creates a pending event with a manual location and the owner answering yes', async () => {
    const createSpy = jest.spyOn(events, 'create');

    const { event, ownerResponse } = await useCase.execute(validInput);

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: GROUP_ID,
        ownerId: OWNER_ID,
        name: 'Jantar de aniversário',
        timeslot: new Date('2026-10-15T20:00:00.000Z'),
        location: {
          kind: 'new',
          id: expect.any(String),
          address: 'Rua dos Andradas, 1234, Porto Alegre',
          image: null,
        },
        image: null,
        budgetStart: '50.00',
        budgetEnd: '120.00',
        status: 'pending',
        ownerAnswer: 'yes',
        createdAt: expect.any(Date),
        notification: {
          type: 'createdEvent',
          message:
            '${user:11111111-1111-4111-8111-111111111111} criou o evento "Jantar de aniversário" para o dia 15/10/2026 às 20:00.',
          createdAt: expect.any(Date),
        },
      })
    );
    expect(event.status).toBe('pending');
    expect(event.location.manuallyCreated).toBe(true);
    expect(ownerResponse).toMatchObject({ userId: OWNER_ID, answer: 'yes' });
    expect(groupNotifications.sendToGroup).toHaveBeenCalledWith(
      GROUP_ID,
      {
        title: 'Novo encontro no grupo',
        body: 'O evento "Jantar de aniversário" foi criado para o dia 15/10/2026 às 20:00.',
        data: { type: 'new_event', eventId: event.id, groupId: GROUP_ID },
      },
      OWNER_ID
    );
  });

  it('defaults optional budgets to null', async () => {
    const { event } = await useCase.execute({
      ...validInput,
      budgetStart: undefined,
      budgetEnd: undefined,
    });

    expect(event.budgetStart).toBeNull();
    expect(event.budgetEnd).toBeNull();
  });

  it.each(['name', 'date', 'time', 'location'] as const)(
    'rejects a request without %s',
    async (field) => {
      await expect(useCase.execute({ ...validInput, [field]: undefined })).rejects.toThrow(
        new InvalidEventCreationError(
          'Nome, dia, horário e locationId ou endereço são obrigatórios'
        )
      );
    }
  );

  it('rejects blank name and location', async () => {
    await expect(
      useCase.execute({ ...validInput, name: '   ', location: ' ' })
    ).rejects.toBeInstanceOf(InvalidEventCreationError);
  });

  it('reports a missing group', async () => {
    await expect(
      useCase.execute({ ...validInput, groupId: '77777777-7777-4777-8777-777777777777' })
    ).rejects.toThrow(new EventGroupNotFoundError('Grupo não encontrado'));
  });

  it('denies a user who does not belong to the group', async () => {
    await expect(useCase.execute({ ...validInput, userId: OTHER_USER_ID })).rejects.toThrow(
      new EventGroupAccessDeniedError('O usuário não pertence a este grupo')
    );
  });

  it('stores the uploaded image under the new location id', async () => {
    const { event } = await useCase.execute({
      ...validInput,
      image: { originalName: 'event.png', contentType: 'image/png', bytes: PNG_BYTES },
    });

    expect(event.image).toMatch(/^locations\/[0-9a-f-]{36}\/images\/[0-9a-f-]{36}\.png$/i);
    await expect(storage.findByKey(event.image!)).resolves.toEqual({
      bytes: PNG_BYTES,
      contentType: 'image/png',
    });
  });

  it('reuses a saved location and inherits its image and price range', async () => {
    const locationId = '44444444-4444-4444-8444-444444444444';
    events.setLocation({
      id: locationId,
      image: `locations/${locationId}/images/place.png`,
      priceStart: '30.00',
      priceEnd: '70.00',
      description: 'Local do Google',
      manuallyCreated: false,
    });

    const { event } = await useCase.execute({
      ...validInput,
      location: undefined,
      locationId,
      budgetStart: undefined,
      budgetEnd: undefined,
    });

    expect(event.location).toMatchObject({ id: locationId, manuallyCreated: false });
    expect(event.image).toBe(`locations/${locationId}/images/place.png`);
    expect(event.budgetStart).toBe('30.00');
    expect(event.budgetEnd).toBe('70.00');
  });

  it('rejects an unknown locationId', async () => {
    await expect(
      useCase.execute({
        ...validInput,
        location: undefined,
        locationId: '44444444-4444-4444-8444-444444444444',
      })
    ).rejects.toBeInstanceOf(EventLocationNotFoundError);
  });

  it.each([
    { originalName: 'event.png', contentType: 'text/plain', bytes: PNG_BYTES },
    { originalName: 'event.txt', contentType: 'image/png', bytes: PNG_BYTES },
  ])('rejects an upload with invalid content type or extension', async (image) => {
    const saveSpy = jest.spyOn(storage, 'save');

    await expect(useCase.execute({ ...validInput, image })).rejects.toBeInstanceOf(
      InvalidEventCreationError
    );
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('removes the stored image when database persistence fails', async () => {
    const deleteSpy = jest.spyOn(storage, 'delete');
    jest.spyOn(events, 'create').mockRejectedValue(new Error('database unavailable'));

    await expect(
      useCase.execute({
        ...validInput,
        image: { originalName: 'event.png', contentType: 'image/png', bytes: PNG_BYTES },
      })
    ).rejects.toThrow('database unavailable');

    const imageKey = deleteSpy.mock.calls[0][0];
    await expect(storage.findByKey(imageKey)).resolves.toBeNull();
    expect(groupNotifications.sendToGroup).not.toHaveBeenCalled();
  });

  it('keeps a persisted event when notification recipient lookup fails', async () => {
    groupNotifications.sendToGroup.mockRejectedValue(new Error('database unavailable'));

    await expect(useCase.execute(validInput)).resolves.toHaveProperty('event.id');
  });
});
