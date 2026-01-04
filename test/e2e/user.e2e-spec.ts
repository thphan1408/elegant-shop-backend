import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('User (e2e) - Security & Performance Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let moderatorToken: string;
  let userToken: string;
  let adminUserId: string;
  let moderatorUserId: string;
  let regularUserId: string;

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
    await prisma.user.deleteMany({});

    // Create admin user
    const hashedPassword = await bcrypt.hash('Password123', 10);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        userName: 'admin',
        password: hashedPassword,
        name: 'Admin User',
        role: UserRole.ADMIN,
      },
    });
    adminUserId = admin.id;

    // Create moderator user
    const moderator = await prisma.user.create({
      data: {
        email: 'moderator@test.com',
        userName: 'moderator',
        password: hashedPassword,
        name: 'Moderator User',
        role: UserRole.MODERATOR,
      },
    });
    moderatorUserId = moderator.id;

    // Create regular user
    const user = await prisma.user.create({
      data: {
        email: 'user@test.com',
        userName: 'regularuser',
        password: hashedPassword,
        name: 'Regular User',
        role: UserRole.USER,
      },
    });
    regularUserId = user.id;

    // Login to get tokens
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        emailOrUsername: 'admin@test.com',
        password: 'Password123',
      });
    adminToken = adminLogin.body.data.accessToken;

    const moderatorLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        emailOrUsername: 'moderator@test.com',
        password: 'Password123',
      });
    moderatorToken = moderatorLogin.body.data.accessToken;

    const userLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        emailOrUsername: 'user@test.com',
        password: 'Password123',
      });
    userToken = userLogin.body.data.accessToken;
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

  describe('POST /api/users', () => {
    it('should create user as admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser@test.com',
          password: 'Password123',
          name: 'New User',
          userName: 'newuser',
        })
        .expect(201);

      expect(response.body.data.email).toBe('newuser@test.com');
    });

    it('should create user as moderator (USER role only)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          email: 'modcreated@test.com',
          password: 'Password123',
          name: 'Moderator Created User',
          userName: 'modcreated',
        })
        .expect(201);

      expect(response.body.data.email).toBe('modcreated@test.com');
      expect(response.body.data.role).toBe(UserRole.USER);
    });

    it('should reject moderator creating user with admin role', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          email: 'unauthorized@test.com',
          password: 'Password123',
          name: 'Unauthorized',
          role: UserRole.ADMIN,
        })
        .expect(403);
    });

    it('should reject moderator creating user with moderator role', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          email: 'unauthorized2@test.com',
          password: 'Password123',
          name: 'Unauthorized 2',
          role: UserRole.MODERATOR,
        })
        .expect(403);
    });

    it('should reject creation by regular user', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'unauthorized3@test.com',
          password: 'Password123',
          name: 'Unauthorized',
        })
        .expect(403);
    });

    it('should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'user@test.com', // Already exists
          password: 'Password123',
          name: 'Duplicate',
        })
        .expect(409);
    });
  });

  describe('GET /api/users', () => {
    it('should return list of users for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.data).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should return list of users for moderator', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      expect(response.body.data.data).toBeInstanceOf(Array);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should reject access by regular user', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return own profile for regular user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(regularUserId);
    });

    it('should return any user profile for admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(regularUserId);
    });

    it('should return any user profile for moderator', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(regularUserId);
    });

    it('should reject viewing other user profile by regular user', async () => {
      await request(app.getHttpServer())
        .get(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('should update own profile', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Updated Name');
    });

    it('should reject updating other user profile by regular user', async () => {
      await request(app.getHttpServer())
        .patch(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Hacked Name',
        })
        .expect(403);
    });

    it('should reject changing role by regular user', async () => {
      await request(app.getHttpServer())
        .patch(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          role: UserRole.ADMIN,
        })
        .expect(403);
    });

    it('should allow admin to update any user', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Admin Updated Name',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Admin Updated Name');
    });

    it('should allow moderator to update any user with allowed fields', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          name: 'Moderator Updated Name',
          phone: '+1234567890',
          address: '123 Test Street',
        })
        .expect(200);

      expect(response.body.data.name).toBe('Moderator Updated Name');
      expect(response.body.data.phone).toBe('+1234567890');
    });

    it('should reject moderator changing user role', async () => {
      await request(app.getHttpServer())
        .patch(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          role: UserRole.ADMIN,
        })
        .expect(403);
    });

    it('should reject moderator changing is_active status', async () => {
      await request(app.getHttpServer())
        .patch(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .send({
          is_active: false,
        })
        .expect(403);
    });

    it('should allow admin to change user role', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: UserRole.USER, // Keep as USER
        })
        .expect(200);

      expect(response.body.data.role).toBe(UserRole.USER);
    });
  });

  describe('DELETE /api/users/:id', () => {
    let testUserId: string;
    let testUserId2: string;

    beforeAll(async () => {
      // Create test users to delete
      const hashedPassword = await bcrypt.hash('Password123', 10);
      const testUser = await prisma.user.create({
        data: {
          email: 'todelete@test.com',
          userName: 'todelete',
          password: hashedPassword,
          name: 'To Delete',
        },
      });
      testUserId = testUser.id;

      const testUser2 = await prisma.user.create({
        data: {
          email: 'todelete2@test.com',
          userName: 'todelete2',
          password: hashedPassword,
          name: 'To Delete 2',
        },
      });
      testUserId2 = testUser2.id;
    });

    it('should delete user as admin', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.message).toBe('User deactivated successfully');

      // Verify user is deactivated (soft delete)
      const user = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(user?.is_active).toBe(false);
    });

    it('should reject deletion by moderator', async () => {
      await request(app.getHttpServer())
        .delete(`/api/users/${testUserId2}`)
        .set('Authorization', `Bearer ${moderatorToken}`)
        .expect(403);
    });

    it('should reject deletion by regular user', async () => {
      // Create another test user
      const hashedPassword = await bcrypt.hash('Password123', 10);
      const testUser = await prisma.user.create({
        data: {
          email: 'todelete3@test.com',
          userName: 'todelete3',
          password: hashedPassword,
          name: 'To Delete 3',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/users/${testUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should prevent admin from deleting themselves', async () => {
      await request(app.getHttpServer())
        .delete(`/api/users/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });
});
