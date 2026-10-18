import { Module } from '@nestjs/common';
import { MessagingModule } from '../../infrastructure/messaging/messaging.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { StorageModule } from '../../infrastructure/storage/storage.module';
import { CreateEventUseCase } from './application/create-event.use-case';
import { UpdateEventUseCase } from './application/update-event.use-case';
import { EventRepository } from './domain/event.repository';
import { EventController } from './http/event.controller';
import { PrismaEventRepository } from './persistence/prisma-event.repository';
import { GetEventUseCase } from './application/get-event.use-case';
import { GetEventImageUseCase } from './application/get-event-image.use-case';
import { GroupPushNotificationService } from './application/group-push-notification.service';
import { SendAttendanceRemindersUseCase } from './application/send-attendance-reminders.use-case';
import { EventNotificationRepository } from './domain/event-notification.repository';
import { AttendanceReminderTestController } from './http/attendance-reminder-test.controller';
import { PrismaEventNotificationRepository } from './persistence/prisma-event-notification.repository';
import { AttendanceReminderScheduler } from './scheduling/attendance-reminder.scheduler';
import { GroupsModule } from '../groups/groups.module';
import { DistributedTaskLock } from '../../shared/scheduling/distributed-task-lock';
import { PrismaDistributedTaskLock } from '../../infrastructure/scheduling/prisma-distributed-task-lock';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [EventController],
  exports: [EventRepository],
  providers: [
    GetEventUseCase,
    GetEventImageUseCase,
    CreateEventUseCase,
    UpdateEventUseCase,
    GroupPushNotificationService,
    SendAttendanceRemindersUseCase,
    AttendanceReminderScheduler,
    {
      provide: DistributedTaskLock,
      useClass: PrismaDistributedTaskLock,
    },
    {
      provide: EventRepository,
      useClass: PrismaEventRepository,
    },
    {
      provide: EventNotificationRepository,
      useClass: PrismaEventNotificationRepository,
    },
  ],
})
export class EventsModule {}
