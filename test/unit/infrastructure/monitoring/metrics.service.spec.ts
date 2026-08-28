import { Counter, Histogram } from 'prom-client';

import { MetricsService } from '../../../../src/infrastructure/monitoring/metrics.service';

describe('MetricsService', () => {
  const httpRequests = { inc: jest.fn() } as unknown as Counter<string>;
  const httpErrors = { inc: jest.fn() } as unknown as Counter<string>;
  const httpDuration = { observe: jest.fn() } as unknown as Histogram<string>;

  const service = new MetricsService(httpRequests, httpErrors, httpDuration);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('increments the HTTP request counter with normalized labels', () => {
    service.incrementRequest('GET', '/example', 200);

    expect(httpRequests.inc).toHaveBeenCalledWith({
      method: 'GET',
      route: '/example',
      status_code: '200',
    });
  });

  it('increments the HTTP error counter with normalized labels', () => {
    service.incrementError('POST', '/example', 422);

    expect(httpErrors.inc).toHaveBeenCalledWith({
      method: 'POST',
      route: '/example',
      status_code: '422',
    });
  });

  it('observes request duration with method and route labels', () => {
    service.observeDuration('GET', '/example', 0.25);

    expect(httpDuration.observe).toHaveBeenCalledWith(
      {
        method: 'GET',
        route: '/example',
      },
      0.25
    );
  });
});
