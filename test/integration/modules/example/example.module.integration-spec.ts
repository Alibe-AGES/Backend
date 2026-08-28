import { Test, TestingModule } from '@nestjs/testing';

import { GetExampleUseCase } from '../../../../src/modules/example/application/get-example.use-case';
import { ExampleModule } from '../../../../src/modules/example/example.module';

describe('ExampleModule integration', () => {
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [ExampleModule],
    }).compile();
  });

  afterAll(async () => {
    await moduleFixture.close();
  });

  it('connects the use case and in-memory repository', async () => {
    const useCase = moduleFixture.get(GetExampleUseCase);

    await expect(useCase.execute()).resolves.toEqual({
      message: 'Example module is working',
    });
  });
});
