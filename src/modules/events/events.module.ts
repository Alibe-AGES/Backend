import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { UpdateEventUseCase } from './application/update-event.use-case';
import { EventRepository } from './domain/event.repository';
import { EventController } from './http/event.controller';
import { PrismaEventRepository } from './persistence/prisma-event.repository';

@Module({
  imports: [PrismaModule],
  controllers: [EventController],
  providers: [
    UpdateEventUseCase,
    {
      provide: EventRepository,
      useClass: PrismaEventRepository,
    },
  ],
})
export class EventsModule {}
