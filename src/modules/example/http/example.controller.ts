import { Controller, Get } from '@nestjs/common';
import { GetExampleOutput, GetExampleUseCase } from '../application/get-example.use-case';

@Controller('example')
export class ExampleController {
  constructor(private readonly getExampleUseCase: GetExampleUseCase) {}

  @Get()
  get(): Promise<GetExampleOutput> {
    return this.getExampleUseCase.execute();
  }
}
