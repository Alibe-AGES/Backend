import { Module } from '@nestjs/common';
import { AvailabilityController } from './http/availability.controller';
import { PrismaModule } from 'src/infrastructure/prisma/prisma.module';
import { CreateAvailabilityUseCase } from './application/create-availability.use-case';
import { AvailabilityRepository } from './domain/availability.repository';
import { PrismaAvailabilityRepository } from './persistence/prisma-availability.repository';

@Module({
  imports: [PrismaModule],
  controllers: [AvailabilityController],
  providers: [
    CreateAvailabilityUseCase,
    {
      provide: AvailabilityRepository,
      useClass: PrismaAvailabilityRepository
    },
  ]
})
export class AvailabilityModule {}
