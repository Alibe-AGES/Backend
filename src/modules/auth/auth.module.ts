import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common';
import { AuthController } from './http/auth.controller';
import { MockAuthenticationMiddleware } from './http/mock-authentication.middleware';

@Module({
  controllers: [AuthController],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(MockAuthenticationMiddleware)
      .exclude(
        { path: 'metrics', method: RequestMethod.ALL },
        { path: 'docs', method: RequestMethod.ALL },
        { path: 'docs/{*path}', method: RequestMethod.ALL },
        { path: 'docs-json', method: RequestMethod.ALL }
      )
      .forRoutes({
        path: '{*path}',
        method: RequestMethod.ALL,
      });
  }
}
