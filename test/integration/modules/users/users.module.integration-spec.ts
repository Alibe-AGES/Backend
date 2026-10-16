import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../src/infrastructure/prisma/prisma.service';
import { S3_BUCKET, S3_CLIENT } from '../../../../src/infrastructure/storage/s3-client.provider';
import { UsersController } from '../../../../src/modules/users/http/users.controller';
import { UsersModule } from '../../../../src/modules/users/users.module';
import { PushTokensController } from '../../../../src/modules/users/http/push-tokens.controller';
import { RegisterPushTokenUseCase } from '../../../../src/modules/users/application/register-push-token.use-case';

describe('UsersModule integration', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [UsersModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(S3_CLIENT)
      .useValue({ send: jest.fn() })
      .overrideProvider(S3_BUCKET)
      .useValue('test-bucket')
      .compile();
  });

  afterAll(async () => {
    await module.close();
  });

  it('registers the users controller', () => {
    expect(module.get(UsersController)).toBeInstanceOf(UsersController);
    expect(module.get(PushTokensController)).toBeInstanceOf(PushTokensController);
    expect(module.get(RegisterPushTokenUseCase)).toBeInstanceOf(RegisterPushTokenUseCase);
  });
});
