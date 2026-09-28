import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { MonitoringModule } from './infrastructure/monitoring/monitoring.module';
import { ExampleModule } from './modules/example/example.module';
import { GroupsModule } from './modules/groups/groups.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EventsModule } from './modules/events/events.module';

@Module({
  imports: [
    AuthModule,
    ExampleModule,
    EventModule,
    MonitoringModule,
    GroupsModule,
    CalendarModule,
    AvailabilityModule,
    UsersModule,
    EventsModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
