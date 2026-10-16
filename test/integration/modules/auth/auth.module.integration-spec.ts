import { AuthService } from '@thallesp/nestjs-better-auth';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { createAuth } from '../../../../src/modules/auth/auth.config';
import { AuthModule } from '../../../../src/modules/auth/auth.module';

describe('AuthModule integration', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it('configures Better Auth for credentials, Expo and the API auth base path', () => {
    const auth = module.get<AuthService<ReturnType<typeof createAuth>>>(AuthService).instance;

    expect(auth.options.basePath).toBe('/api/auth');
    expect(auth.options.emailAndPassword).toEqual(
      expect.objectContaining({
        enabled: true,
        autoSignIn: false,
        minPasswordLength: 8,
        maxPasswordLength: 128,
      })
    );
    expect(auth.options.user?.fields).toEqual({ image: 'profilePic' });
    expect(auth.options.plugins?.map((plugin) => plugin.id)).toEqual(
      expect.arrayContaining(['expo', 'bearer'])
    );
    expect(auth.options.advanced?.database).toEqual(
      expect.objectContaining({
        generateId: 'uuid',
        joins: true,
      })
    );
  });
});
