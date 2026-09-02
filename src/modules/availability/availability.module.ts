import { Module } from '@nestjs/common';
import { AvailabilityController } from './http/availability.controller';

@Module({
  controllers: [AvailabilityController],
})
export class AvailabilityModule {}
