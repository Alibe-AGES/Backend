import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { GetGroupCalendarUseCase } from './application/get-group-calendar.use-case';
import { CalendarRepository } from './domain/calendar.repository';
import { CalendarController } from './http/calendar.controller';
import { PrismaCalendarRepository } from './persistence/prisma-calendar.repository';

@Module({
  imports: [PrismaModule],
  controllers: [CalendarController],
  providers: [
    GetGroupCalendarUseCase,
    {
      provide: CalendarRepository,
      useClass: PrismaCalendarRepository,
    },
  ],
})
export class CalendarModule {}
