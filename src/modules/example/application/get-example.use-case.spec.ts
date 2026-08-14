import { Example } from '../domain/example.entity';
import { ExampleRepository } from '../domain/example.repository';
import { GetExampleUseCase } from './get-example.use-case';

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
