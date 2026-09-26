import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { randomUUID } from "crypto";
import { AuthenticatedRequest } from "../../../../src/modules/auth/http/authenticated-user";
import { EventNotFoundError, GetEventUseCase } from "../../../../src/modules/event/application/get-event.use-case";
import { EventController } from "../../../../src/modules/event/http/event.controller";

describe('EventController', () => {
  let controller: EventController;
  let getEventUseCaseMock: { execute: jest.Mock };

  const userId = '11111111-1111-4111-8111-111111111111';
  const authenticatedRequest = {
    user: { id: userId },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    getEventUseCaseMock = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        {
          provide: GetEventUseCase,
          useValue: getEventUseCaseMock,
        },
      ],
    }).compile();

    // Correção do sinal de atribuição (= em vez de :)
    controller = module.get<EventController>(EventController);
  });

  it('Chama o useCase com o id de um Event não existente', async () => {
    getEventUseCaseMock.execute.mockRejectedValue(
      new EventNotFoundError('Evento não encontrado')
    );

    await expect(
      controller.get({ id: 'non-existent-id' } as any, authenticatedRequest)
    ).rejects.toThrow(NotFoundException);
  });

  it('Caso de sucesso para um input com id existente', async () => {
    const id = randomUUID();

    const event = {
      id: id,
      name: "Jantar de aniversário",
      date: "2026-10-15",
      time: "20:00",
      image: "https://example.com/events/jantar.jpg",
      budgetStart: "50.00",
      budgetEnd: "120.00",
      status: "pending",
      groupId: "33333333-3333-4333-8333-333333333333",
      location: {
        id: "44444444-4444-4444-8444-444444444444",
        description: "Rua dos Andradas, 1234, Porto Alegre",
        manuallyCreated: true,
      },
      proposal: {
        id: "55555555-5555-4555-8555-555555555555",
        owner: {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Ana Beatriz Silva",
          image: "https://example.com/users/ana.jpg",
        },
        responses: [
          {
            id: "66666666-6666-4666-8666-666666666666",
            answer: "yes",
            createdAt: "2026-09-22T18:30:00.000Z",
            user: {
              id: "11111111-1111-4111-8111-111111111111",
              name: "Ana Beatriz Silva",
              image: "https://example.com/users/ana.jpg",
            },
          },
        ],
        createdAt: "2026-09-22T18:30:00.000Z",
      },
      createdAt: "2026-09-22T18:30:00.000Z",
      updatedAt: "2026-09-23T14:00:00.000Z",
    };

    getEventUseCaseMock.execute.mockResolvedValue(event);

    const result = await controller.get(id as any, authenticatedRequest);

    expect(getEventUseCaseMock.execute).toHaveBeenCalledWith(id);
    expect(result).toBe(event);
  });
});