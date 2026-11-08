import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { setupApplication } from '../../../src/app.setup';
import { PrismaService } from '../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../src/infrastructure/storage/s3-client.provider';
import { ExampleRepository } from '../../../src/modules/example/domain/example.repository';
import { ObjectStorage } from '../../../src/shared/storage/object-storage';
import { InMemoryExampleRepository } from '../../helpers/in-memory-example.repository';
import { InMemoryObjectStorage } from '../../helpers/in-memory-object.storage';

describe('Health (e2e)', () => {
  let app: INestApplication;
  const queryRaw = jest.fn();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-local-media')
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: queryRaw })
      .overrideProvider(ExampleRepository)
      .useClass(InMemoryExampleRepository)
      .overrideProvider(ObjectStorage)
      .useClass(InMemoryObjectStorage)
      .compile();

    app = moduleFixture.createNestApplication({ bodyParser: false });
    setupApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    queryRaw.mockReset();
  });

  it('GET /health responds without authentication and without touching the database', async () => {
    await request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('GET /health/ready returns 200 when the database answers', async () => {
    queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    await request(app.getHttpServer()).get('/health/ready').expect(200).expect({ status: 'ok' });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('GET /health/ready returns 503 without leaking error details when the database fails', async () => {
    queryRaw.mockRejectedValue(new Error('connection refused to secret-host'));

    const response = await request(app.getHttpServer()).get('/health/ready').expect(503);
    expect(JSON.stringify(response.body)).not.toContain('secret-host');
  });
});
