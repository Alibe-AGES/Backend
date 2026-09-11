import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupApplication(app: INestApplication): void {
  setupCors(app);
  setupSwagger(app);
}

function setupCors(app: INestApplication): void {
  // Habilitado fora de produção para permitir chamadas do app Expo web em outra origem/porta.
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  app.enableCors();
}

function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Alibe API')
    .setDescription('Documentação interativa da API do Backend Alibe.')
    .setVersion('1.0')
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, documentFactory, {
    customSiteTitle: 'Alibe API Docs',
    jsonDocumentUrl: 'docs-json',
    swaggerOptions: {
      displayRequestDuration: true,
      persistAuthorization: true,
    },
  });
}
