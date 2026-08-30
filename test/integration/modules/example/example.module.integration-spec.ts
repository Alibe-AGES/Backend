import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { CreateExampleUseCase } from '../../../../src/modules/example/application/create-example.use-case';
import { GetExampleUseCase } from '../../../../src/modules/example/application/get-example.use-case';
import { ExampleModule } from '../../../../src/modules/example/example.module';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

describe('ExampleModule integration', () => {
  let moduleFixture: TestingModule;
  const rows = new Map<
    string,
    {
      id: string;
      description: string;
      imageKey: string;
      createdAt: Date;
    }
  >();
  const prisma = {
    example: {
      create: jest.fn((input: { data: { id: string; description: string; imageKey: string } }) => {
        const row = {
          ...input.data,
          createdAt: new Date('2026-08-30T00:00:00.000Z'),
        };
        rows.set(row.id, row);
        return Promise.resolve(row);
      }),
      findUnique: jest.fn((input: { where: { id: string } }) =>
        Promise.resolve(rows.get(input.where.id) ?? null)
      ),
    },
  };

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [ExampleModule],
    })
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-local-media')
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ObjectStorage)
      .useClass(InMemoryObjectStorage)
      .compile();
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  it('connects use cases, Prisma repository and object storage', async () => {
    const createExample = moduleFixture.get(CreateExampleUseCase);
    const getExample = moduleFixture.get(GetExampleUseCase);
    const storage = moduleFixture.get(ObjectStorage);
    const bytes = Uint8Array.from([1, 2, 3]);

    const created = await createExample.execute({
      description: 'Integration example',
      image: {
        originalName: 'image.png',
        contentType: 'image/png',
        bytes,
      },
    });

    await expect(getExample.execute(created.id)).resolves.toEqual(created);
    await expect(storage.findByKey(created.imageKey)).resolves.toEqual({
      bytes,
      contentType: 'image/png',
    });
    expect(prisma.example.create).toHaveBeenCalledWith({
      data: {
        id: created.id,
        description: 'Integration example',
        imageKey: created.imageKey,
      },
    });
  });
});
