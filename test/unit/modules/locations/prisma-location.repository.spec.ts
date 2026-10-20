import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaLocationRepository } from '../../../../src/modules/locations/persistence/prisma-location.repository';

describe('PrismaLocationRepository', () => {
  it('reuses catalog locations and creates only the missing ones', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'existing-id', externalId: 'place-1' }]);
    const createManyAndReturn = jest
      .fn()
      .mockResolvedValue([{ id: 'created-id', externalId: 'place-2' }]);
    const repository = new PrismaLocationRepository({
      location: { findMany, createManyAndReturn },
    } as unknown as PrismaService);

    const ids = await repository.ensureCatalogLocations([
      { externalId: 'place-1', description: 'Café', address: 'Rua A' },
      { externalId: 'place-2', description: 'Cinema', address: null },
    ]);

    expect(ids).toEqual(
      new Map([
        ['place-1', 'existing-id'],
        ['place-2', 'created-id'],
      ])
    );
    expect(findMany).toHaveBeenCalledWith({
      where: { externalId: { in: ['place-1', 'place-2'] }, manuallyCreated: false },
      select: { id: true, externalId: true },
    });
    expect(createManyAndReturn).toHaveBeenCalledWith({
      data: [
        { externalId: 'place-2', description: 'Cinema', address: null, manuallyCreated: false },
      ],
      select: { id: true, externalId: true },
    });
  });

  it('skips the database when there is nothing to register', async () => {
    const findMany = jest.fn();
    const repository = new PrismaLocationRepository({
      location: { findMany },
    } as unknown as PrismaService);

    await expect(repository.ensureCatalogLocations([])).resolves.toEqual(new Map());
    expect(findMany).not.toHaveBeenCalled();
  });

  it('does not create anything when all locations already exist', async () => {
    const createManyAndReturn = jest.fn();
    const repository = new PrismaLocationRepository({
      location: {
        findMany: jest.fn().mockResolvedValue([{ id: 'existing-id', externalId: 'place-1' }]),
        createManyAndReturn,
      },
    } as unknown as PrismaService);

    await repository.ensureCatalogLocations([
      { externalId: 'place-1', description: null, address: null },
    ]);
    expect(createManyAndReturn).not.toHaveBeenCalled();
  });

  it('finds a location by id selecting only the detail fields', async () => {
    const location = {
      id: '0b6f3c1e-8a2d-4f7b-9c1e-2d3f4a5b6c7d',
      externalId: 'place-1',
      description: 'Café',
      address: 'Rua A',
      manuallyCreated: false,
    };
    const findUnique = jest.fn().mockResolvedValue(location);
    const repository = new PrismaLocationRepository({
      location: { findUnique },
    } as unknown as PrismaService);

    await expect(repository.findById(location.id)).resolves.toEqual(location);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: location.id },
      select: {
        id: true,
        externalId: true,
        description: true,
        address: true,
        manuallyCreated: true,
      },
    });
  });
});
