jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../generated/prisma/client', () => ({
  PrismaClient: class {
    $connect(): Promise<void> {
      return Promise.resolve();
    }

    $disconnect(): Promise<void> {
      return Promise.resolve();
    }
  },
}));

import { PrismaService } from '../../../src/infrastructure/prisma/prisma.service';

describe('PrismaService', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it('requires DATABASE_URL during initialization', () => {
    delete process.env.DATABASE_URL;

    expect(() => new PrismaService()).toThrow('DATABASE_URL is required to initialize Prisma');
  });

  it('connects and disconnects with the NestJS module lifecycle', async () => {
    process.env.DATABASE_URL = 'postgresql://unused:unused@localhost:5432/unused';
    const service = new PrismaService();
    const connect = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    const disconnect = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
