import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaExampleRepository } from '../../../../src/modules/example/persistence/prisma-example.repository';

describe('PrismaExampleRepository', () => {
  const create = jest.fn();
  const findUnique = jest.fn();
  const prisma = {
    example: { create, findUnique },
  } as unknown as PrismaService;
  const repository = new PrismaExampleRepository(prisma);

  beforeEach(() => {
    create.mockReset();
    findUnique.mockReset();
  });

  it('creates and maps an example', async () => {
    const data = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'Example image',
      imageKey: 'examples/550e8400-e29b-41d4-a716-446655440000/image.png',
    };
    const createdAt = new Date('2026-08-30T00:00:00.000Z');
    create.mockResolvedValue({ ...data, createdAt });

    const result = await repository.create(data);

    expect(create).toHaveBeenCalledWith({ data });
    expect(result).toEqual(expect.objectContaining({ ...data, createdAt }));
  });

  it('finds and maps an example', async () => {
    const row = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'Example image',
      imageKey: 'examples/550e8400-e29b-41d4-a716-446655440000/image.png',
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
    };
    findUnique.mockResolvedValue(row);

    await expect(repository.findById(row.id)).resolves.toEqual(expect.objectContaining(row));
    expect(findUnique).toHaveBeenCalledWith({ where: { id: row.id } });
  });

  it('returns null when the example does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(repository.findById('550e8400-e29b-41d4-a716-446655440000')).resolves.toBeNull();
  });
});
