import { Module } from '@nestjs/common';
import { CalendarController } from './http/calendar.controller';

@Module({
  controllers: [CalendarController],
})
export class CalendarModule {}
