import { PrismaModule } from '../../../src/infrastructure/prisma/prisma.module';
import { EventController } from './http/event.controller';
import { GetEventUseCase } from './application/get-event.use-case';
import { EventRepository } from './domain/event.repository';
import { PrismaEventRepository } from './persistence/prisma-event.repository';
import { Module } from '@nestjs/common';

@Module({
  imports: [PrismaModule],
  controllers: [EventController],
  providers: [
    GetEventUseCase,
    {
      provide: EventRepository,
      useClass: PrismaEventRepository,
    },
  ],
})
export class EventModule {}
