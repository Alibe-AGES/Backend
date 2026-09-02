import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { ExampleRepository } from '../../../../src/modules/example/domain/example.repository';
import { ObjectStorage } from '../../../../src/shared/storage/object-storage';
import { InMemoryExampleRepository } from '../../../helpers/in-memory-example.repository';
import { InMemoryObjectStorage } from '../../../helpers/in-memory-object.storage';

const MOCK_AUTHENTICATED_USER_ID = '11111111-1111-4111-8111-111111111111';

describe('Mock authentication endpoint (e2e)', () => {
  let app: INestApplication;
  let previousEnabled: string | undefined;
  let previousUserId: string | undefined;

  beforeAll(async () => {
    previousEnabled = process.env.MOCK_AUTH_ENABLED;
    previousUserId = process.env.MOCK_AUTH_USER_ID;
    process.env.MOCK_AUTH_ENABLED = 'true';
    process.env.MOCK_AUTH_USER_ID = MOCK_AUTHENTICATED_USER_ID;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('alibe-local-media')
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(ExampleRepository)
      .useClass(InMemoryExampleRepository)
      .overrideProvider(ObjectStorage)
      .useClass(InMemoryObjectStorage)
      .compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  afterEach(() => {
    process.env.MOCK_AUTH_ENABLED = 'true';
  });

  afterAll(async () => {
    await app.close();
    restoreEnvironment('MOCK_AUTH_ENABLED', previousEnabled);
    restoreEnvironment('MOCK_AUTH_USER_ID', previousUserId);
  });

  it('returns the user injected by the authentication mock', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(200).expect({
      id: MOCK_AUTHENTICATED_USER_ID,
    });
  });

  it('returns unauthorized when the authentication mock is disabled', async () => {
    process.env.MOCK_AUTH_ENABLED = 'false';

    await request(app.getHttpServer()).get('/auth/me').expect(401).expect({
      message: 'Authenticated user not found',
      error: 'Unauthorized',
      statusCode: 401,
    });
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
