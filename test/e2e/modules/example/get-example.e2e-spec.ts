import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../../../../src/app.module';
import { setupApplication } from '../../../../src/app.setup';

describe('ExampleController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApplication(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /example', async () => {
    await request(app.getHttpServer())
      .get('/example')
      .expect(200)
      .expect({ message: 'Example module is working' });
  });

  it('GET /docs-json', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);

    expect(response.body.info).toEqual(
      expect.objectContaining({ title: 'Alibe API', version: '1.0' })
    );
    expect(response.body.paths['/example'].get).toEqual(
      expect.objectContaining({ tags: ['Example'] })
    );
  });
});
