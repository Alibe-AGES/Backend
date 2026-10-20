import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaLocationRepository } from '../../../../src/modules/locations/persistence/prisma-location.repository';

describe('PrismaLocationRepository', () => {
  it('finds a location by id selecting only the detail fields', async () => {
    const location = {
      id: '0b6f3c1e-8a2d-4f7b-9c1e-2d3f4a5b6c7d',
      externalId: null,
      description: 'Casa da Ana',
      address: null,
      manuallyCreated: true,
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
