import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './authenticated-user';

export const DEFAULT_MOCK_AUTH_USER_ID = '11111111-1111-4111-8111-111111111111';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class MockAuthenticationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MockAuthenticationMiddleware.name);

  use(request: AuthenticatedRequest, _response: Response, next: NextFunction): void {
    if (!this.isEnabled()) {
      next();
      return;
    }

    const userId = process.env.MOCK_AUTH_USER_ID ?? DEFAULT_MOCK_AUTH_USER_ID;

    if (!UUID_PATTERN.test(userId)) {
      throw new Error('MOCK_AUTH_USER_ID must be a valid UUID');
    }

    request.user = { id: userId };
    this.logger.log(`${request.method} ${request.originalUrl} - userId=${userId}`);
    next();
  }

  private isEnabled(): boolean {
    const configuredValue = process.env.MOCK_AUTH_ENABLED;

    if (configuredValue !== undefined) {
      return configuredValue === 'true';
    }

    return process.env.NODE_ENV !== 'production';
  }
}
