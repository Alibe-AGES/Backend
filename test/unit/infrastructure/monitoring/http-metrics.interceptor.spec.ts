import { CallHandler, ExecutionContext, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';

import { HttpMetricsInterceptor } from '../../../../src/infrastructure/monitoring/http-metrics.interceptor';
import { MetricsService } from '../../../../src/infrastructure/monitoring/metrics.service';

type ContextOptions = {
  type?: string;
  method?: string;
  path?: string;
  baseUrl?: string;
  routePath?: string;
  statusCode?: number;
};

describe('HttpMetricsInterceptor', () => {
  const metricsService = {
    incrementRequest: jest.fn(),
    incrementError: jest.fn(),
    observeDuration: jest.fn(),
  };

  const interceptor = new HttpMetricsInterceptor(metricsService as unknown as MetricsService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not record metrics for non-HTTP contexts', async () => {
    const next = createHandler(of('rpc-result'));

    await expect(
      firstValueFrom(interceptor.intercept(createContext({ type: 'rpc' }), next))
    ).resolves.toBe('rpc-result');

    expect(metricsService.incrementRequest).not.toHaveBeenCalled();
  });

  it('does not record the metrics endpoint itself', async () => {
    const next = createHandler(of('metrics'));

    await expect(
      firstValueFrom(interceptor.intercept(createContext({ path: '/metrics' }), next))
    ).resolves.toBe('metrics');

    expect(metricsService.incrementRequest).not.toHaveBeenCalled();
  });

  it('records a successful request using the matched route', async () => {
    const next = createHandler(of('ok'));
    const context = createContext({
      method: 'GET',
      path: '/example/1',
      baseUrl: '/example',
      routePath: '/:id',
      statusCode: 200,
    });

    await firstValueFrom(interceptor.intercept(context, next));

    expect(metricsService.incrementRequest).toHaveBeenCalledWith('GET', '/example/:id', 200);
    expect(metricsService.incrementError).not.toHaveBeenCalled();
    expect(metricsService.observeDuration).toHaveBeenCalledWith(
      'GET',
      '/example/:id',
      expect.any(Number)
    );
  });

  it('records the status from an HTTP exception', async () => {
    const error = new HttpException('invalid request', 422);
    const next = createHandler(throwError(() => error));
    const context = createContext({ method: 'POST', path: '/unknown' });

    await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toBe(error);

    expect(metricsService.incrementRequest).toHaveBeenCalledWith('POST', 'unmatched', 422);
    expect(metricsService.incrementError).toHaveBeenCalledWith('POST', 'unmatched', 422);
  });

  it('records status 500 for an unknown error', async () => {
    const error = new Error('unexpected error');
    const next = createHandler(throwError(() => error));
    const context = createContext({ method: 'GET', path: '/unknown' });

    await expect(firstValueFrom(interceptor.intercept(context, next))).rejects.toBe(error);

    expect(metricsService.incrementRequest).toHaveBeenCalledWith('GET', 'unmatched', 500);
    expect(metricsService.incrementError).toHaveBeenCalledWith('GET', 'unmatched', 500);
  });
});

function createHandler(result: Observable<unknown>): CallHandler {
  return {
    handle: jest.fn(() => result),
  };
}

function createContext(options: ContextOptions = {}): ExecutionContext {
  const request = {
    method: options.method ?? 'GET',
    path: options.path ?? '/example',
    baseUrl: options.baseUrl ?? '',
    route: options.routePath ? { path: options.routePath } : undefined,
  } as unknown as Request;

  const response = {
    statusCode: options.statusCode ?? 200,
  } as unknown as Response;

  return {
    getType: () => options.type ?? 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}
