import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaGroupRepository } from '../../../../src/modules/groups/persistence/prisma-group.repository';

describe('PrismaGroupRepository', () => {
  const create = jest.fn();
  const findUnique = jest.fn();
  const prisma = {
    group: { create, findUnique },
  } as unknown as PrismaService;
  const repository = new PrismaGroupRepository(prisma);

  beforeEach(() => {
    create.mockReset();
    findUnique.mockReset();
  });

  it('creates and maps a group', async () => {
    const createdAt = new Date('2026-08-30T00:00:00.000Z');
    const data = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Group of friends',
      profilePic: 'groups/550e8400-e29b-41d4-a716-446655440000/image.png',
      createdAt: createdAt,
    };

    create.mockResolvedValue({ ...data, createdAt });

    const result = await repository.create(data);

    expect(create).toHaveBeenCalledWith({ data });
    expect(result).toEqual(expect.objectContaining({ ...data, createdAt }));
  });

  it('finds and maps a group', async () => {
    const row = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'Group of friends',
      profilePic: 'groups/550e8400-e29b-41d4-a716-446655440000/image.png',
      createdAt: new Date('2026-08-30T00:00:00.000Z'),
    };
    findUnique.mockResolvedValue(row);

    await expect(repository.findById(row.id)).resolves.toEqual(expect.objectContaining(row));
    expect(findUnique).toHaveBeenCalledWith({ where: { id: row.id } });
  });

  it('returns null when group does not exist', async () => {
    findUnique.mockResolvedValue(null);

    await expect(repository.findById('550e8400-e29b-41d4-a716-446655440000')).resolves.toBeNull();
  });
});
