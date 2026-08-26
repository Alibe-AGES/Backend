import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupApplication(app: INestApplication): void {
  setupSwagger(app);
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
