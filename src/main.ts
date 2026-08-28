import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApplication } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApplication(app);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
