import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { PrismaLocationRepository } from '../../../../src/modules/locations/persistence/prisma-location.repository';

describe('PrismaLocationRepository', () => {
  it('finds a location by id selecting only the detail fields', async () => {
    const location = {
      id: '0b6f3c1e-8a2d-4f7b-9c1e-2d3f4a5b6c7d',
      externalId: null,
      name: 'Casa da Ana',
      description: 'Casa da Ana',
      address: null,
      openingHours: [],
      rating: null,
      phoneNumber: null,
      website: null,
      priceStart: null,
      priceEnd: null,
      priceCurrency: null,
      image: null,
      manuallyCreated: true,
    };
    const findUnique = jest.fn().mockResolvedValue(location);
    const repository = new PrismaLocationRepository({
      location: { findUnique },
    } as unknown as PrismaService);

    await expect(repository.findById(location.id)).resolves.toEqual({
      id: location.id,
      externalId: null,
      name: 'Casa da Ana',
      description: 'Casa da Ana',
      address: null,
      openingHours: [],
      rating: null,
      phoneNumber: null,
      website: null,
      priceRange: { start: null, end: null, currencyCode: null },
      image: null,
      manuallyCreated: true,
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: location.id },
      select: {
        id: true,
        externalId: true,
        name: true,
        description: true,
        address: true,
        openingHours: true,
        rating: true,
        phoneNumber: true,
        website: true,
        priceStart: true,
        priceEnd: true,
        priceCurrency: true,
        image: true,
        manuallyCreated: true,
      },
    });
  });
});
