import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { GroupsModule } from '../../../../src/modules/groups/groups.module';
import type { AuthenticatedRequest } from '../../../../src/modules/auth/http/authenticated-user';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';
import { InMemoryObjectStorage } from '../../../../test/helpers/in-memory-object.storage';

const authenticatedRequest = {
  user: { id: '11111111-1111-4111-8111-111111111111' },
} as AuthenticatedRequest;

describe('EventModule integration', () => {
  let module: TestingModule;
  const findUnique = jest.fn();
  const prisma = {
    group: { findUnique },
  } as unknown as PrismaService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [GroupsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(ObjectStorage)
      .useClass(InMemoryObjectStorage)
      .compile();
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(() => {
    findUnique.mockReset();
  });

  describe('EventController', () => {
    it('', async () => {
      
    });
  });
});
