import { GetExampleUseCase } from '../../../../src/modules/example/application/get-example.use-case';
import { Example } from '../../../../src/modules/example/domain/example.entity';
import { ExampleRepository } from '../../../../src/modules/example/domain/example.repository';

class FakeExampleRepository extends ExampleRepository {
  get(): Promise<Example> {
    return Promise.resolve(new Example({ message: 'Example module is working' }));
  }
}

describe('GetExampleUseCase', () => {
  it('returns the example provided by the repository', async () => {
    const useCase = new GetExampleUseCase(new FakeExampleRepository());

    await expect(useCase.execute()).resolves.toEqual({
      message: 'Example module is working',
    });
  });
});
