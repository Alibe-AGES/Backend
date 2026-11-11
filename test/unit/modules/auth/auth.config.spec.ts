import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { createAuth, readAuthEnvironment } from '../../../../src/modules/auth/auth.config';

describe('Better Auth environment', () => {
  it('reads the API URL, secret and comma-separated trusted origins', () => {
    expect(
      readAuthEnvironment({
        BETTER_AUTH_SECRET: 'a-secure-test-secret-with-at-least-32-characters',
        BETTER_AUTH_URL: 'https://api.alibe.example/',
        BETTER_AUTH_TRUSTED_ORIGINS: 'alibe://, https://app.alibe.example ,',
      })
    ).toEqual({
      secret: 'a-secure-test-secret-with-at-least-32-characters',
      baseURL: 'https://api.alibe.example',
      trustedOrigins: ['alibe://', 'https://app.alibe.example'],
      google: null,
    });
  });

  it('reads the Google OAuth client when both credentials are configured', () => {
    expect(
      readAuthEnvironment({
        NODE_ENV: 'test',
        GOOGLE_CLIENT_ID: ' google-client-id.apps.googleusercontent.com ',
        GOOGLE_CLIENT_SECRET: ' google-client-secret ',
      }).google
    ).toEqual({
      clientId: 'google-client-id.apps.googleusercontent.com',
      clientSecret: 'google-client-secret',
    });
  });

  it.each([
    { GOOGLE_CLIENT_ID: 'google-client-id.apps.googleusercontent.com' },
    { GOOGLE_CLIENT_SECRET: 'google-client-secret' },
  ])('rejects a partial Google OAuth configuration', (googleEnvironment) => {
    expect(() => readAuthEnvironment({ NODE_ENV: 'test', ...googleEnvironment })).toThrow(
      'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together'
    );
  });

  it('rejects a missing or short secret outside tests', () => {
    expect(() =>
      readAuthEnvironment({
        NODE_ENV: 'production',
        BETTER_AUTH_URL: 'https://api.alibe.example',
        BETTER_AUTH_SECRET: 'short',
      })
    ).toThrow('BETTER_AUTH_SECRET must contain at least 32 characters');
  });

  it('rejects an invalid API URL', () => {
    expect(() =>
      readAuthEnvironment({
        BETTER_AUTH_SECRET: 'a-secure-test-secret-with-at-least-32-characters',
        BETTER_AUTH_URL: 'not-a-url',
      })
    ).toThrow('BETTER_AUTH_URL must be a valid absolute URL');
  });

  it('uses isolated defaults only in the test environment', () => {
    expect(readAuthEnvironment({ NODE_ENV: 'test' })).toEqual({
      secret: expect.any(String),
      baseURL: 'http://localhost:3000',
      trustedOrigins: [],
      google: null,
    });
  });
});

describe('Better Auth social providers', () => {
  const prisma = {} as PrismaService;

  it('enables Google sign-in without importing the Google picture as an S3 key', () => {
    const auth = createAuth(prisma, {
      NODE_ENV: 'test',
      GOOGLE_CLIENT_ID: 'google-client-id.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'google-client-secret',
    });
    const google = auth.options.socialProviders.google;

    expect(google).toEqual(
      expect.objectContaining({
        clientId: 'google-client-id.apps.googleusercontent.com',
        clientSecret: 'google-client-secret',
        prompt: 'select_account',
      })
    );
    expect(google.mapProfileToUser()).toEqual({ image: undefined });
  });

  it('keeps only email and password sign-in when Google is not configured', () => {
    const auth = createAuth(prisma, { NODE_ENV: 'test' });

    expect(auth.options.socialProviders).toEqual({});
  });
});
