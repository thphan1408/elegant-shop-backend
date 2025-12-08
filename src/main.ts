import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'; // Đảm bảo import này
import { WinstonModule } from 'nest-winston'; // Từ Winston setup
import { winstonConfig } from './configs/logger.config'; // Từ Winston

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig), // Từ commit 2
  });

  app.use(helmet());
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('3elegant. shop API')
    .setDescription('API documentation for 3elegant. shop backend')
    // .addBearerAuth({
    //   type: 'http',
    //   scheme: 'bearer',
    //   bearerFormat: 'JWT',
    //   in: 'header',
    //   name: 'Authorization',
    //   description: 'Enter your Bearer token',
    // })
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  app.enableCors({
    origin:
      process.env.NODE_ENV === 'production' ? 'https://localhost:3000' : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(process.env.PORT || 8080);
  console.log('Server is running on port:', process.env.PORT || 8080);
  console.log(
    'Swagger docs available at: http://localhost:' +
      (process.env.PORT || 8080) +
      '/api/docs',
  );
}

bootstrap();
