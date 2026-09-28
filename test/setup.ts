type NodeResponse = {
  end(body?: string): void;
  setHeader(name: string, value: string | string[]): void;
  statusCode: number;
};

type NodeRequest = {
  method?: string;
  url?: string;
  headers?: {
    cookie?: string;
    authorization?: string;
  };
  on(event: 'data', listener: (chunk: Buffer) => void): void;
  on(event: 'end', listener: () => void): void;
};

jest.mock('@better-auth/expo', () => ({
  expo: () => ({ id: 'expo' }),
}));

jest.mock('@better-auth/prisma-adapter', () => ({
  prismaAdapter: () => () => ({}),
}));

jest.mock('better-auth', () => ({
  betterAuth: (options: Record<string, unknown>) => ({
    api: {
      getSession: async () =>
        process.env.MOCK_AUTH_ENABLED === 'false'
          ? null
          : {
              session: { id: 'test-session' },
              user: {
                id: process.env.MOCK_AUTH_USER_ID ?? '11111111-1111-4111-8111-111111111111',
              },
            },
    },
    options,
  }),
}));

jest.mock('better-auth/node', () => ({
  fromNodeHeaders: () => new Headers(),
  toNodeHandler: () => async (request: NodeRequest, response: NodeResponse) => {
    const path = request.url?.split('?')[0];

    if (request.method === 'GET' && path?.endsWith('/get-session')) {
      response.statusCode = 200;
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Content-Type', 'application/json');

      const hasValidCookie = request.headers?.cookie?.includes(
        'better-auth.session_token=valid-session-token'
      );
      const hasValidBearer = request.headers?.authorization === 'Bearer valid-session-token';

      if (!hasValidCookie && !hasValidBearer) {
        response.end('null');
        return;
      }

      response.end(
        JSON.stringify({
          session: {
            id: '2c058d88-11df-47bc-8603-c64af764f700',
            userId: '11111111-1111-4111-8111-111111111111',
            token: 'valid-session-token',
            expiresAt: '2026-09-28T18:30:00.000Z',
            createdAt: '2026-09-21T18:30:00.000Z',
            updatedAt: '2026-09-21T18:30:00.000Z',
            ipAddress: '192.168.0.10',
            userAgent: 'Alibe/1.0',
          },
          user: {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Ana Beatriz Silva',
            email: 'ana.silva@example.com',
            emailVerified: false,
            image: null,
            createdAt: '2026-09-01T12:00:00.000Z',
            updatedAt: '2026-09-21T18:30:00.000Z',
          },
        })
      );
      return;
    }

    if (request.method === 'POST' && path?.endsWith('/sign-up/email')) {
      const rawBody = await new Promise<string>((resolve) => {
        const chunks: Buffer[] = [];
        request.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      });

      let body: { name?: string; email?: string; password?: string };
      try {
        body = JSON.parse(rawBody) as typeof body;
      } catch {
        response.statusCode = 400;
        response.setHeader('Content-Type', 'application/json');
        response.end(
          JSON.stringify({ code: 'BAD_REQUEST', message: 'Invalid JSON in request body' })
        );
        return;
      }

      if (!body.email?.includes('@')) {
        response.statusCode = 400;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ code: 'INVALID_EMAIL', message: 'Invalid email' }));
        return;
      }

      if (!body.password || body.password.length < 8) {
        response.statusCode = 400;
        response.setHeader('Content-Type', 'application/json');
        response.end(
          JSON.stringify({ code: 'PASSWORD_TOO_SHORT', message: 'Password is too short' })
        );
        return;
      }

      if (body.password.length > 128) {
        response.statusCode = 400;
        response.setHeader('Content-Type', 'application/json');
        response.end(
          JSON.stringify({ code: 'PASSWORD_TOO_LONG', message: 'Password is too long' })
        );
        return;
      }

      const normalizedEmail = body.email.toLowerCase();
      const isExistingEmail = normalizedEmail === 'existing@example.com';

      response.statusCode = 200;
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Content-Type', 'application/json');
      response.end(
        JSON.stringify({
          token: null,
          user: {
            id: isExistingEmail
              ? '33333333-3333-4333-8333-333333333333'
              : '22222222-2222-4222-8222-222222222222',
            name: body.name,
            email: normalizedEmail,
            emailVerified: false,
            image: null,
            createdAt: '2026-09-23T12:00:00.000Z',
            updatedAt: '2026-09-23T12:00:00.000Z',
          },
        })
      );
      return;
    }

    if (request.method === 'POST' && path?.endsWith('/sign-in/email')) {
      const rawBody = await new Promise<string>((resolve) => {
        const chunks: Buffer[] = [];
        request.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      });

      let body: { email?: string; password?: string };
      try {
        body = JSON.parse(rawBody) as { email?: string; password?: string };
      } catch {
        response.statusCode = 400;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ code: 'INVALID_BODY', message: 'Invalid body' }));
        return;
      }

      if (body.email !== 'ana.silva@example.com' || body.password !== 'senha-segura') {
        response.statusCode = 401;
        response.setHeader('Content-Type', 'application/json');
        response.end(
          JSON.stringify({
            code: 'INVALID_EMAIL_OR_PASSWORD',
            message: 'Invalid email or password',
          })
        );
        return;
      }

      response.statusCode = 200;
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Content-Type', 'application/json');
      response.setHeader(
        'Set-Cookie',
        'better-auth.session_token=opaque-session-token; Path=/; HttpOnly; SameSite=Lax'
      );
      response.end(
        JSON.stringify({
          redirect: false,
          token: 'opaque-session-token',
          user: {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Ana Beatriz Silva',
            email: 'ana.silva@example.com',
            emailVerified: false,
            image: null,
            createdAt: '2026-09-01T12:00:00.000Z',
            updatedAt: '2026-09-21T18:30:00.000Z',
          },
        })
      );
      return;
    }

    response.statusCode = 200;
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json');
    response.end('null');
  },
}));

jest.mock('better-auth/plugins', () => ({
  createAuthMiddleware: (middleware: unknown) => middleware,
  bearer: () => ({ id: 'bearer' }),
}));
