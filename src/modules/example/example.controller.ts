import { Controller, Get } from '@nestjs/common';
import {
  GetExampleUseCase,
  GetExampleOutput,
} from './application/get-example.use-case';

@Controller('example')
export class ExampleController {
  constructor(private readonly getExample: GetExampleUseCase) {}

  @Get()
  get(): Promise<GetExampleOutput> {
    return this.getExample.execute();
  }
}
