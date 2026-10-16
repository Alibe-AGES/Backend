import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { CreateEventUseCase } from './application/create-event.use-case';
import { UpdateEventUseCase } from './application/update-event.use-case';
import { EventRepository } from './domain/event.repository';
import { EventController } from './http/event.controller';
import { PrismaEventRepository } from './persistence/prisma-event.repository';
import { GetEventUseCase } from './application/get-event.use-case';
import { GetEventImageUseCase } from './application/get-event-image.use-case';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [EventController],
  providers: [
    GetEventUseCase,
    GetEventImageUseCase,
    CreateEventUseCase,
    UpdateEventUseCase,
    {
      provide: EventRepository,
      useClass: PrismaEventRepository,
    },
  ],
})
export class EventsModule {}
