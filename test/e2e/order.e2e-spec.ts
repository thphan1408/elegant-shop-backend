import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { OrderStatus, PaymentMethod, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('Order (e2e) - Security & Performance Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let userId: string;
  let productId: string;
  let variantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same configuration as main.ts
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Clear DB
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.reviewReaction.deleteMany({});
    await prisma.reviewReply.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.productVariant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});

    // Create user
    const hashedPassword = await bcrypt.hash('Password123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'orderuser@test.com',
        userName: 'orderuser',
        password: hashedPassword,
        name: 'Order User',
        role: UserRole.USER,
      },
    });
    userId = user.id;

    // Create product and variant
    const product = await prisma.product.create({
      data: {
        name: 'Test Product for Order',
        category: 'Electronics',
        measurement: '10x20 cm',
        description: 'Test description',
        stars_evaluation: 0,
        rating_count: 1,
        variants: {
          create: {
            color: 'Red',
            sku: 'ORDER-SKU-001',
            price: 100,
            quantity: 10,
            image: 'test.jpg',
          },
        },
      },
      include: { variants: true },
    });
    productId = product.id;
    variantId = product.variants[0].id;

    // Login to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        emailOrUsername: 'orderuser@test.com',
        password: 'Password123',
      });
    userToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.reviewReaction.deleteMany({});
    await prisma.reviewReply.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.productVariant.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.user.deleteMany({});
    await app.close();
  });

  describe('POST /api/orders (Guest Checkout)', () => {
    it('should create guest order successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
          guestEmail: 'guest@test.com',
          guestName: 'Guest User',
          guestPhone: '+84123456789',
          shippingName: 'Guest User',
          shippingPhone: '+84123456789',
          shippingAddress: '123 Guest Street',
          items: [
            {
              variantId: variantId,
              quantity: 2,
            },
          ],
        })
        .expect(201);

      expect(response.body.data).toHaveProperty('orderNumber');
      expect(response.body.data.guestEmail).toBe('guest@test.com');
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.total).toBe(200); // 2 * 100
    });

    it('should reject guest order without guest info', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
          shippingName: 'Guest User',
          shippingPhone: '+84123456789',
          shippingAddress: '123 Guest Street',
          items: [{ variantId: variantId, quantity: 1 }],
        })
        .expect(400);
    });

    it('should reject order with empty items', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
          guestEmail: 'guest2@test.com',
          guestName: 'Guest User 2',
          guestPhone: '+84123456789',
          shippingName: 'Guest User 2',
          shippingPhone: '+84123456789',
          shippingAddress: '123 Guest Street',
          items: [],
        })
        .expect(400);
    });

    it('should reject order with insufficient stock', async () => {
      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
          guestEmail: 'guest3@test.com',
          guestName: 'Guest User 3',
          guestPhone: '+84123456789',
          shippingName: 'Guest User 3',
          shippingPhone: '+84123456789',
          shippingAddress: '123 Guest Street',
          items: [{ variantId: variantId, quantity: 1000 }], // More than available
        })
        .expect(400);
    });

    it('should decrease stock after order creation', async () => {
      const initialVariant = await prisma.productVariant.findUnique({
        where: { id: variantId },
      });
      const initialQuantity = initialVariant!.quantity;

      await request(app.getHttpServer())
        .post('/api/orders')
        .send({
          paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
          guestEmail: 'stocktest@test.com',
          guestName: 'Stock Test',
          guestPhone: '+84123456789',
          shippingName: 'Stock Test',
          shippingPhone: '+84123456789',
          shippingAddress: '123 Test Street',
          items: [{ variantId: variantId, quantity: 1 }],
        })
        .expect(201);

      const updatedVariant = await prisma.productVariant.findUnique({
        where: { id: variantId },
      });
      expect(updatedVariant!.quantity).toBe(initialQuantity - 1);
    });
  });

  describe('POST /api/orders (Authenticated User)', () => {
    let orderId: string;

    it('should create order for authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          shippingName: 'Order User',
          shippingPhone: '+84123456789',
          shippingAddress: '123 User Street',
          items: [
            {
              variantId: variantId,
              quantity: 1,
            },
          ],
        })
        .expect(201);

      expect(response.body.data.userId).toBe(userId);
      expect(response.body.data.orderNumber).toBeTruthy();
      orderId = response.body.data.id;
    });
  });

  describe('GET /api/orders', () => {
    it('should return user orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.data).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should reject access without authentication', async () => {
      await request(app.getHttpServer()).get('/api/orders').expect(401);
    });
  });

  describe('GET /api/orders/:id', () => {
    let userOrderId: string;

    beforeAll(async () => {
      // Create an order for the user
      const order = await prisma.order.create({
        data: {
          orderNumber: 'ORD-TEST-001',
          userId: userId,
          status: OrderStatus.PENDING,
          paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
          paymentStatus: false,
          shippingName: 'Test User',
          shippingPhone: '+84123456789',
          shippingAddress: '123 Test Street',
          subtotal: 100,
          tax: 0,
          shippingFee: 0,
          discount: 0,
          total: 100,
        },
      });
      userOrderId = order.id;
    });

    it('should return order by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/orders/${userOrderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(userOrderId);
    });

    it('should reject viewing other user order', async () => {
      // Create order for different user
      const otherUser = await prisma.user.create({
        data: {
          email: 'other@test.com',
          userName: 'otheruser',
          password: await bcrypt.hash('Password123', 10),
          name: 'Other User',
        },
      });

      const otherOrder = await prisma.order.create({
        data: {
          orderNumber: 'ORD-OTHER-001',
          userId: otherUser.id,
          status: OrderStatus.PENDING,
          paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
          paymentStatus: false,
          shippingName: 'Other User',
          shippingPhone: '+84123456789',
          shippingAddress: '123 Other Street',
          subtotal: 100,
          tax: 0,
          shippingFee: 0,
          discount: 0,
          total: 100,
        },
      });

      await request(app.getHttpServer())
        .get(`/api/orders/${otherOrder.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/orders/track/:orderNumber (Public)', () => {
    let orderNumber: string;

    beforeAll(async () => {
      const order = await prisma.order.create({
        data: {
          orderNumber: 'ORD-TRACK-001',
          userId: userId,
          status: OrderStatus.PENDING,
          paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
          paymentStatus: false,
          shippingName: 'Track User',
          shippingPhone: '+84123456789',
          shippingAddress: '123 Track Street',
          subtotal: 100,
          tax: 0,
          shippingFee: 0,
          discount: 0,
          total: 100,
        },
      });
      orderNumber = order.orderNumber;
    });

    it('should track order by order number (public)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/orders/track/${orderNumber}`)
        .expect(200);

      expect(response.body.data.orderNumber).toBe(orderNumber);
    });

    it('should return 404 for non-existent order number', async () => {
      await request(app.getHttpServer())
        .get('/api/orders/track/ORD-NONEXISTENT')
        .expect(404);
    });
  });

  describe('PATCH /api/orders/:id', () => {
    let orderId: string;

    beforeAll(async () => {
      const order = await prisma.order.create({
        data: {
          orderNumber: 'ORD-UPDATE-001',
          userId: userId,
          status: OrderStatus.PENDING,
          paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
          paymentStatus: false,
          shippingName: 'Update User',
          shippingPhone: '+84123456789',
          shippingAddress: '123 Update Street',
          subtotal: 100,
          tax: 0,
          shippingFee: 0,
          discount: 0,
          total: 100,
        },
      });
      orderId = order.id;
    });

    it('should update order status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: OrderStatus.PROCESSING,
        })
        .expect(200);

      expect(response.body.data.status).toBe(OrderStatus.PROCESSING);
    });

    it('should update payment status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          paymentStatus: true,
        })
        .expect(200);

      expect(response.body.data.paymentStatus).toBe(true);
    });

    it('should reject update without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}`)
        .send({ status: OrderStatus.PROCESSING })
        .expect(401);
    });
  });
});

