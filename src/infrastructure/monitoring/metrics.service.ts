import { Injectable } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly httpRequests: Counter<string>,

    @InjectMetric('http_errors_total')
    private readonly httpErrors: Counter<string>,

    @InjectMetric('http_request_duration_seconds')
    private readonly httpDuration: Histogram<string>
  ) {}

  incrementRequest(method: string, route: string, statusCode: number): void {
    this.httpRequests.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
  }

  incrementError(method: string, route: string, statusCode: number): void {
    this.httpErrors.inc({
      method,
      route,
      status_code: statusCode.toString(),
    });
  }

  observeDuration(method: string, route: string, durationSeconds: number): void {
    this.httpDuration.observe(
      {
        method,
        route,
      },
      durationSeconds
    );
  }
}
