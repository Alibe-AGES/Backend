import { readAuthEnvironment } from '../../../../src/modules/auth/auth.config';

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
    });
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
    });
  });
});
