import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { addBetterAuthOpenApiPaths } from './modules/auth/http/auth.openapi';

export function setupApplication(app: INestApplication): void {
  setupCors(app);
  setupSwagger(app);
}

function setupCors(app: INestApplication): void {
  const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: trustedOrigins,
    credentials: true,
  });
}

function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Alibe API')
    .setDescription('Documentação interativa da API do Backend Alibe.')
    .setVersion('1.0')
    .addCookieAuth('better-auth.session_token', undefined, 'better-auth')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Better Auth session token',
        description: 'Cole o token retornado por sign-in/email para testar pelo Swagger.',
      },
      'better-auth-bearer'
    )
    .build();

  const documentFactory = () =>
    addBetterAuthOpenApiPaths(SwaggerModule.createDocument(app, config));

  SwaggerModule.setup('docs', app, documentFactory, {
    customSiteTitle: 'Alibe API Docs',
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      displayRequestDuration: true,
      persistAuthorization: true,
    },
  });
}
