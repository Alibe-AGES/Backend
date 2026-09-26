import { PrismaEventRepository } from '../../../../src/modules/event/persistence/prisma-event.repository';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';

describe('PrismaEventRepository', () => {
  const findById = jest.fn();
  let repository: PrismaEventRepository;
  let prismaService: PrismaService;
  const prisma = {
    event: { findById },
  } as unknown as PrismaService;

  beforeEach(() => {
    findById.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('finds an event', async () => {
    const mockEvent = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Jantar' };
    
    (prismaService.event.findFirst as jest.Mock).mockResolvedValue(mockEvent);

    await expect(repository.findById('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'))
      .resolves.toEqual(mockEvent);

    expect(prismaService.event.findFirst).toHaveBeenCalledWith({
      where: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
    });
  });

  it('returns null when the event does not exist', async () => {
    (prismaService.event.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(repository.findById('550e8400-e29b-41d4-a716-446655440000'))
      .resolves.toBeNull();
  });
});