import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, catchError, finalize, throwError } from 'rxjs';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    if (request.path === '/metrics') {
      return next.handle();
    }

    const startedAt = process.hrtime.bigint();
    const method = request.method;
    const route = this.getRoute(request);
    let errorStatusCode: number | undefined;

    return next.handle().pipe(
      catchError((error: unknown) => {
        errorStatusCode = error instanceof HttpException ? error.getStatus() : 500;
        return throwError(() => error);
      }),
      finalize(() => {
        const durationInSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
        const statusCode = errorStatusCode ?? response.statusCode;

        this.metricsService.incrementRequest(method, route, statusCode);
        if (statusCode >= 400) {
          this.metricsService.incrementError(method, route, statusCode);
        }

        this.metricsService.observeDuration(method, route, durationInSeconds);
      })
    );
  }

  private getRoute(request: Request): string {
    return request.route?.path ? `${request.baseUrl}${request.route.path}` : 'unmatched';
  }
}
