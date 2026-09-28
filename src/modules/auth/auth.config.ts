import { createRequire } from 'node:module';
import type * as ExpoModule from '@better-auth/expo';
import type * as PrismaAdapterModule from '@better-auth/prisma-adapter';
import type * as BetterAuthModule from 'better-auth';
import type * as BetterAuthPluginsModule from 'better-auth/plugins';
import type { PrismaService } from '../../infrastructure/prisma/prisma.service';

const TEST_AUTH_SECRET = 'alibe-test-only-secret-9d2c4f7a6b8e1f3c5a7d9b2e4f6a8c0d';
const TEST_AUTH_URL = 'http://localhost:3000';
const nodeRequire = createRequire(__filename);

const { expo } = nodeRequire('@better-auth/expo') as typeof ExpoModule;
const { prismaAdapter } = nodeRequire('@better-auth/prisma-adapter') as typeof PrismaAdapterModule;
const { betterAuth } = nodeRequire('better-auth') as typeof BetterAuthModule;
const { bearer } = nodeRequire('better-auth/plugins') as typeof BetterAuthPluginsModule;

export interface AuthEnvironment {
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
}

export function createAuth(prisma: PrismaService, environment = process.env) {
  const authEnvironment = readAuthEnvironment(environment);

  /**
   * Rotas nativas do Better Auth disponibilizadas sob `basePath`.
   *
   * Contratos cobertos por esta entrega:
   * - POST /api/auth/sign-in/email
   * - POST /api/auth/sign-up/email
   * - GET /api/auth/get-session
   *
   * Essas rotas pertencem ao handler do Better Auth e não a controllers Nest.
   */
  return betterAuth({
    secret: authEnvironment.secret,
    baseURL: authEnvironment.baseURL,
    basePath: '/api/auth',
    trustedOrigins: authEnvironment.trustedOrigins,
    database: prismaAdapter(prisma, {
      provider: 'postgresql',
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    advanced: {
      database: {
        generateId: 'uuid',
        joins: true,
      },
    },
    plugins: [expo(), bearer()],
  });
}

export function readAuthEnvironment(environment: NodeJS.ProcessEnv): AuthEnvironment {
  const isTest = environment.NODE_ENV === 'test';
  const secret = environment.BETTER_AUTH_SECRET?.trim() || (isTest ? TEST_AUTH_SECRET : '');
  const baseURL = environment.BETTER_AUTH_URL?.trim() || (isTest ? TEST_AUTH_URL : '');

  if (secret.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');
  }

  if (!baseURL) {
    throw new Error('BETTER_AUTH_URL is required');
  }

  let parsedBaseURL: URL;
  try {
    parsedBaseURL = new URL(baseURL);
  } catch {
    throw new Error('BETTER_AUTH_URL must be a valid absolute URL');
  }

  const trustedOrigins = (environment.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    secret,
    baseURL: parsedBaseURL.toString().replace(/\/$/, ''),
    trustedOrigins,
  };
}
