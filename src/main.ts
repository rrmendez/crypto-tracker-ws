import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { getWelcomeHtml } from './config/html-templates.config';
import {
  I18nValidationPipe,
  I18nValidationExceptionFilter,
  // I18nService,
} from 'nestjs-i18n';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from '@/common/filters';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración del I18nValidationPipe para validaciones traducidas
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      transform: true,
      stopAtFirstError: false,
    }),
  );

  // Filtro global para manejar excepciones de validación con i18n
  app.useGlobalFilters(
    new HttpExceptionFilter(app.get(ConfigService)), // Filtro personalizado para excepciones HTTP con códigos de error
    new I18nValidationExceptionFilter({
      // Filtro para excepciones de validación
      detailedErrors: false,
    }),
  );

  const enableSwagger = process.env.ENABLE_SWAGGER === 'true';
  const systemName = process.env.APP_NAME || 'Leht API';

  if (enableSwagger) {
    const config = new DocumentBuilder()
      .setTitle(systemName)
      .setDescription(`This is the API for the ${systemName}`)
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
        'access-token',
      )
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api', app, documentFactory, {
      jsonDocumentUrl: 'swagger/json',
    });
  }

  // Obter os origins de CORS
  const corsOrigins = process.env.ACCEPT_ORIGIN?.split(',') ?? [];

  console.log('CORS_ORIGINS: ', corsOrigins);

  // Configurar CORS
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'X-App-Environment',
      'X-2fa-Token',
      'X-Client-Type',
      'Accept-Language',
      'X-Firebase-AppCheck',
    ],
  });

  // Root route behavior based on Swagger availability
  const instance = app.getHttpAdapter().getInstance();
  const html = getWelcomeHtml(systemName);

  instance.get('/', (_req: any, res: any) => {
    if (enableSwagger) {
      res.redirect('/api');
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    }
  });

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
