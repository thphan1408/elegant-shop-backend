import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ProductModule } from 'src/product/product.module';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, ProductModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply same configuration as main.ts
    app.setGlobalPrefix('api');
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    
    await app.init();
  });

  it('/api (GET)', () => {
    // With global prefix 'api', the root route becomes '/api'
    return request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect((res) => {
        // Response is wrapped by TransformInterceptor
        expect(res.body).toMatchObject({
          statusCode: 200,
          message: 'Success',
          data: 'Hello World!',
        });
      });
  });

  it('/api/products (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/products')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 200,
          message: 'Success',
          data: {
            data: [],
            total: 0,
            page: 1,
            limit: 10,
          },
        });
      });
  });

  it('/api/products (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/products')
      .send({
        name: 'Test Product',
        category: 'Test Category',
        measurement: 'Unit',
        description: 'This is a test product',
        variants: [
          {
            color: 'Red',
            sku: 'TESTSKU1',
            price: 100,
            quantity: 10,
            image: 'test-image.jpg',
          },
        ],
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('statusCode');
        expect(res.body).toHaveProperty('message');
        expect(res.body).toHaveProperty('data');
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data).toHaveProperty('variants');
        expect((res.body.data as { variants: unknown[] }).variants.length).toBe(
          1,
        );
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
