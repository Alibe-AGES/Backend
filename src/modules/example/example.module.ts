import { Module } from '@nestjs/common';
import { GetExampleUseCase } from './application/get-example.use-case';
import { ExampleRepository } from './domain/example.repository';
import { ExampleController } from './example.controller';
import { InMemoryExampleRepository } from './persistence/in-memory-example.repository';

@Module({
  controllers: [ExampleController],
  providers: [
    GetExampleUseCase,
    {
      provide: ExampleRepository,
      useClass: InMemoryExampleRepository,
    },
  ],
})
export class ExampleModule {}
