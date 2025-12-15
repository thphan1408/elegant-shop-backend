import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';

describe('Product (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    await prisma.product.deleteMany({}); // Reset test DB before
  });

  afterAll(async () => {
    await prisma.product.deleteMany({}); // Clean up after tests
    await app.close();
  });

  it('/api/products (GET) should return empty array', () => {
    return request(app.getHttpServer())
      .get('/api/products')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({
          data: [],
          total: 0,
          page: 1,
          limit: 10,
        });
      });
  });

  it('/api/products (POST) should create product with variants', async () => {
    const createDto = {
      name: 'Test Product',
      category: 'Electronics',
      measurement: '10x20 cm',
      description: 'Test description',
      variants: [
        {
          color: 'Red',
          sku: 'SKU001',
          price: 100,
          quantity: 10,
          image: 'image.jpg',
        },
      ],
    };

    const response = await request(app.getHttpServer())
      .post('/api/products')
      .send(createDto)
      .expect(201);

    expect(response.body).toMatchObject({
      name: 'Test Product',
      slug: 'test-product',
      category: 'Electronics',
      variants: expect.arrayContaining([
        expect.objectContaining({
          color: 'Red',
          sku: 'SKU001',
          price: 100,
        }),
      ]),
    });

    // Verify in database
    const product = await prisma.product.findUnique({
      where: { id: response.body.id },
      include: { variants: true },
    });
    expect(product).toBeTruthy();
    expect(product?.variants).toHaveLength(1);
  });

  it('/api/products/:id (GET) should return product by id', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'Get Test Product',
        slug: 'get-test-product',
        category: 'Fashion',
        measurement: 'M',
        description: 'Test',
        stars_evaluation: 0,
        variants: {
          create: {
            color: 'Blue',
            sku: 'SKU002',
            price: 50,
            quantity: 5,
            image: 'blue.jpg',
          },
        },
      },
      include: { variants: true },
    });

    const response = await request(app.getHttpServer())
      .get(`/api/products/${product.id}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: product.id,
      name: 'Get Test Product',
      variants: expect.arrayContaining([
        expect.objectContaining({ color: 'Blue' }),
      ]),
    });
    expect(response.body.views_count).toBeGreaterThan(0); // Should increment
  });

  it('/api/products/:id (GET) should return 404 for non-existent product', () => {
    return request(app.getHttpServer())
      .get('/api/products/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it('/api/products/:id (PATCH) should update product', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'Update Test',
        slug: 'update-test',
        category: 'Electronics',
        measurement: 'L',
        description: 'Original',
        stars_evaluation: 0,
        variants: {
          create: {
            color: 'Green',
            sku: 'SKU003',
            price: 75,
            quantity: 8,
            image: 'green.jpg',
          },
        },
      },
    });

    const updateDto = {
      name: 'Updated Product',
      description: 'Updated description',
    };

    const response = await request(app.getHttpServer())
      .patch(`/api/products/${product.id}`)
      .send(updateDto)
      .expect(200);

    expect(response.body).toMatchObject({
      name: 'Updated Product',
      slug: 'updated-product', // Slug should auto-update
      description: 'Updated description',
    });
  });

  it('/api/products/:id (DELETE) should soft delete product', async () => {
    const product = await prisma.product.create({
      data: {
        name: 'Delete Test',
        slug: 'delete-test',
        category: 'Electronics',
        measurement: 'M',
        description: 'To be deleted',
        stars_evaluation: 0,
        is_active: true,
      },
    });

    await request(app.getHttpServer())
      .delete(`/api/products/${product.id}`)
      .expect(200);

    // Verify soft delete (is_active = false)
    const deletedProduct = await prisma.product.findUnique({
      where: { id: product.id },
    });
    expect(deletedProduct).toBeTruthy();
    expect(deletedProduct?.is_active).toBe(false);

    // Verify product is not returned in active queries
    const response = await request(app.getHttpServer())
      .get('/api/products')
      .expect(200);
    expect(response.body.data).not.toContainEqual(
      expect.objectContaining({ id: product.id }),
    );
  });

  it('/api/products (GET) should filter by category', async () => {
    await prisma.product.createMany({
      data: [
        {
          name: 'Electronics Product',
          slug: 'electronics-product',
          category: 'Electronics',
          measurement: 'M',
          description: 'Test',
          stars_evaluation: 0,
        },
        {
          name: 'Fashion Product',
          slug: 'fashion-product',
          category: 'Fashion',
          measurement: 'L',
          description: 'Test',
          stars_evaluation: 0,
        },
      ],
    });

    const response = await request(app.getHttpServer())
      .get('/api/products?category=Electronics')
      .expect(200);

    expect(response.body.data.every((p) => p.category === 'Electronics')).toBe(
      true,
    );
  });

  it('/api/products (GET) should search in name and description', async () => {
    await prisma.product.create({
      data: {
        name: 'Laptop Computer',
        slug: 'laptop-computer',
        category: 'Electronics',
        measurement: 'M',
        description: 'High performance laptop',
        stars_evaluation: 0,
      },
    });

    const response = await request(app.getHttpServer())
      .get('/api/products?search=laptop')
      .expect(200);

    expect(response.body.data.length).toBeGreaterThan(0);
    expect(
      response.body.data.some(
        (p) =>
          p.name.toLowerCase().includes('laptop') ||
          p.description.toLowerCase().includes('laptop'),
      ),
    ).toBe(true);
  });
});
