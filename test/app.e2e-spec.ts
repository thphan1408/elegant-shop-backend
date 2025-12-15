import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ProductModule } from 'src/product/product.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, ProductModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/api/products (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/products')
      .expect(200)
      .expect({ data: [], total: 0, page: 1, limit: 10 });
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
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('variants');
        expect((res.body as { variants: unknown[] }).variants.length).toBe(1);
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
