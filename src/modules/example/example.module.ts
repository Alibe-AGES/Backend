import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { CreateExampleUseCase } from './application/create-example.use-case';
import { GetExampleImageUseCase } from './application/get-example-image.use-case';
import { GetExampleUseCase } from './application/get-example.use-case';
import { ExampleRepository } from './domain/example.repository';
import { ExampleController } from './http/example.controller';
import { PrismaExampleRepository } from './persistence/prisma-example.repository';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [ExampleController],
  providers: [
    CreateExampleUseCase,
    GetExampleUseCase,
    GetExampleImageUseCase,
    {
      provide: ExampleRepository,
      useClass: PrismaExampleRepository,
    },
  ],
})
export class ExampleModule {}
