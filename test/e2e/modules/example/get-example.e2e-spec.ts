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

describe('ExampleController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
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

  afterAll(async () => {
    await app.close();
  });

  it('creates an example, reads its description and downloads its image', async () => {
    const image = Buffer.from([137, 80, 78, 71]);
    const creation = await request(app.getHttpServer())
      .post('/example')
      .field('description', 'E2E example')
      .attach('image', image, { filename: 'image.png', contentType: 'image/png' })
      .expect(201);

    expect(creation.body).toEqual(
      expect.objectContaining({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        description: 'E2E example',
        imageUrl: expect.stringMatching(/^\/example\/[0-9a-f-]{36}\/image$/),
        createdAt: '2026-08-30T00:00:00.000Z',
      })
    );

    await request(app.getHttpServer())
      .get(`/example/${creation.body.id}`)
      .expect(200)
      .expect(creation.body);

    const imageResponse = await request(app.getHttpServer())
      .get(creation.body.imageUrl)
      .expect('Content-Type', /image\/png/)
      .expect(200);

    expect(imageResponse.body).toEqual(image);
  });

  it('requires an image', async () => {
    await request(app.getHttpServer())
      .post('/example')
      .field('description', 'Missing image')
      .expect(400);
  });

  it('rejects a non-image upload', async () => {
    await request(app.getHttpServer())
      .post('/example')
      .field('description', 'Invalid image')
      .attach('image', Buffer.from('text'), {
        filename: 'file.txt',
        contentType: 'text/plain',
      })
      .expect(400);
  });

  it('returns 404 for a missing example and its image', async () => {
    const id = '550e8400-e29b-41d4-a716-446655440000';
    await request(app.getHttpServer()).get(`/example/${id}`).expect(404);
    await request(app.getHttpServer()).get(`/example/${id}/image`).expect(404);
  });

  it('GET /docs-json', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);

    expect(response.body.info).toEqual(
      expect.objectContaining({ title: 'Alibe API', version: '1.0' })
    );
    expect(response.body.paths['/example'].post).toBeDefined();
    expect(response.body.paths['/example/{id}'].get).toBeDefined();
    expect(response.body.paths['/example/{id}/image'].get).toBeDefined();
  });
});
