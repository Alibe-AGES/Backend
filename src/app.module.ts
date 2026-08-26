import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { ExampleModule } from './modules/example/example.module';
import { MonitoringModule } from './infrastructure/monitoring/monitoring.module';

@Module({
  imports: [ExampleModule, MonitoringModule],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}
