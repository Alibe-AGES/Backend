import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  PrometheusModule,
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';

import { MetricsService } from './metrics.service';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

@Module({
  imports: [PrometheusModule.register({ defaultMetrics: { enabled: true } })],

  providers: [
    MetricsService,
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    }),

    makeCounterProvider({
      name: 'http_errors_total',
      help: 'Total HTTP request errors',
      labelNames: ['method', 'route', 'status_code'],
    }),

    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration',
      labelNames: ['method', 'route'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    }),
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
  ],

  exports: [MetricsService],
})
export class MonitoringModule {}
