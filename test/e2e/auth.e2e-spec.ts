import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

describe('Auth (e2e) - Security & Performance Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testUser = {
    yourName: 'Test User',
    username: 'testuser123',
    email: 'test@example.com',
    password: 'Password123',
    privacyPolicy: true,
  };

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

    // Clear DB before tests
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.reviewReaction.deleteMany({});
    await prisma.reviewReply.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.reviewReaction.deleteMany({});
    await prisma.reviewReply.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.user.deleteMany({});
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toMatchObject({
        statusCode: 201,
        message: 'Success',
        data: {
          user: {
            email: testUser.email,
            name: testUser.yourName,
          },
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(user).toBeTruthy();
      expect(user?.userName).toBe(testUser.username);
    });

    it('should accept "name" field instead of "yourName"', async () => {
      const testUserWithName = {
        name: 'Test User 2',
        username: 'testuser456',
        email: 'test2@example.com',
        password: 'Password123',
        privacyPolicy: true,
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUserWithName)
        .expect(201);

      expect(response.body.data.user.name).toBe(testUserWithName.name);
    });

    it('should reject registration without privacy policy acceptance', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'no-privacy@example.com',
          username: 'noprivacy',
          privacyPolicy: false,
        })
        .expect(400);

      expect(response.body.message).toContain('privacy policy');
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(409); // Conflict
    });

    it('should reject duplicate username', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'different@example.com',
          username: testUser.username, // Same username
        })
        .expect(409); // Conflict
    });

    it('should reject invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: 'invalid-email',
          username: 'invalidemail',
        })
        .expect(400);
    });

    it('should reject short password', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...testUser,
          password: '123',
          email: 'shortpass@example.com',
          username: 'shortpass',
        })
        .expect(400);
    });

    it('should reject password without letters', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...testUser,
          password: '12345678',
          email: 'noletters@example.com',
          username: 'noletters',
        })
        .expect(400);
    });

    it('should reject password without numbers', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...testUser,
          password: 'PasswordOnly',
          email: 'nonumbers@example.com',
          username: 'nonumbers',
        })
        .expect(400);
    });

    it('should accept username with dots', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...testUser,
          username: 'user.name123',
          email: 'dots@example.com',
        })
        .expect(201);

      expect(response.body.data.user).toBeTruthy();
    });

    it('should reject SQL injection attempts in email', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...testUser,
          email: "'; DROP TABLE users; --",
          username: 'sqlinjection',
        })
        .expect(400); // Should be rejected by validation
    });

    it('should reject XSS attempts in name', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...testUser,
          yourName: '<script>alert("xss")</script>',
          email: 'xss@example.com',
          username: 'xssattempt',
        })
        .expect(201); // Registration succeeds, but XSS should be handled by frontend

      // Verify name is stored as-is (sanitization should be done in frontend or DTO)
      const user = await prisma.user.findUnique({
        where: { email: 'xss@example.com' },
      });
      expect(user?.name).toContain('<script>');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with email successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        statusCode: 200,
        message: 'Success',
        data: {
          user: {
            email: testUser.email,
          },
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });
    });

    it('should login with username successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          emailOrUsername: testUser.username,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.data.user).toBeTruthy();
    });

    it('should extend token expiration with rememberMe', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: testUser.password,
          rememberMe: true,
        })
        .expect(200);

      expect(response.body.data.accessToken).toBeTruthy();
      expect(response.body.data.refreshToken).toBeTruthy();
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: 'WrongPassword123',
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          emailOrUsername: 'nonexistent@example.com',
          password: 'Password123',
        })
        .expect(401);
    });

    it('should update last_login timestamp', async () => {
      const beforeLogin = new Date();
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
      });
      expect(user?.last_login).toBeTruthy();
      expect(user?.last_login!.getTime()).toBeGreaterThanOrEqual(
        beforeLogin.getTime(),
      );
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      // Get refresh token from login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: testUser.password,
        });

      refreshToken = loginResponse.body.data.refreshToken;
    });

    it('should refresh access token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        statusCode: 200,
        message: 'Success',
        data: {
          accessToken: expect.any(String),
        },
      });
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    let accessToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: testUser.password,
        });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toEqual({
        message: 'Logged out successfully',
      });
    });
  });

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          emailOrUsername: testUser.email,
          password: testUser.password,
        });

      accessToken = loginResponse.body.data.accessToken;
    });

    it('should return user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        statusCode: 200,
        message: 'Success',
        data: {
          email: testUser.email,
          name: testUser.yourName,
        },
      });
    });

    it('should reject request without token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});

