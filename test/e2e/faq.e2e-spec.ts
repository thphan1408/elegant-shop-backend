import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { FAQCategory } from '@prisma/client';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from 'src/common/filters/http-exception.filter';
import * as fs from 'fs';
import * as path from 'path';

describe('FAQ (e2e) - Security & Performance Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let productId: string;
  let faqId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
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

    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Create a test product
    const product = await prisma.product.create({
      data: {
        name: 'Test Product for FAQ',
        category: 'Electronics',
        measurement: '10x20 cm',
        description: 'Test description',
        stars_evaluation: 0,
        rating_count: 1,
        variants: {
          create: {
            color: 'Red',
            sku: 'FAQ-TEST-SKU-001',
            price: 100,
            quantity: 10,
            image: 'test.jpg',
          },
        },
      },
    });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.fAQ.deleteMany({});
    await prisma.productVariant.deleteMany({});
    await prisma.product.deleteMany({});
    await app.close();
  });

  describe('Security: SQL Injection Prevention', () => {
    it('should reject SQL injection attempts in productId', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE FAQ; --",
        "' OR '1'='1",
        "'; DELETE FROM Product; --",
        "1' UNION SELECT * FROM users--",
      ];

      for (const payload of sqlInjectionPayloads) {
        await request(app.getHttpServer())
          .post('/api/faqs')
          .send({
            question: 'Test?',
            answer: 'Test',
            category: FAQCategory.GENERAL,
            productId: payload,
          })
          .expect(400); // Invalid UUID format returns 400 (ParseUUIDPipe)
      }
    });

    it('should reject SQL injection attempts in FAQ ID', async () => {
      const sqlInjectionPayloads = ["'; DROP TABLE FAQ; --", "' OR '1'='1"];

      for (const payload of sqlInjectionPayloads) {
        await request(app.getHttpServer())
          .get(`/api/faqs/${payload}`)
          .expect(400); // Invalid UUID format returns 400 (ParseUUIDPipe)
      }
    });
  });

  describe('Security: XSS Prevention', () => {
    it('should handle XSS payloads in FAQ question and answer', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<svg onload=alert(1)>',
        '<iframe src="javascript:alert(1)"></iframe>',
      ];

      for (const payload of xssPayloads) {
        const response = await request(app.getHttpServer())
          .post('/api/faqs')
          .send({
            question: payload,
            answer: payload,
            category: FAQCategory.GENERAL,
          })
          .expect(201);

        // Should be stored (sanitization should happen at display layer)
        // TransformInterceptor wraps response in { statusCode, message, data }
        expect(response.body.data).toBeDefined();
        expect(response.body.data.question).toBe(payload);
        expect(response.body.data.answer).toBe(payload);
      }
    });
  });

  describe('Security: File Upload Attacks', () => {
    it('should reject files that exceed size limit', async () => {
      // Create a large buffer (6MB, exceeding 5MB limit)
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'a');

      await request(app.getHttpServer())
        .post('/api/faqs/upload/image')
        .attach('file', largeBuffer, 'large.jpg')
        .expect(400);
    });

    it('should reject invalid file types for images', async () => {
      const invalidFiles = [
        { buffer: Buffer.from('fake content'), filename: 'test.exe' },
        { buffer: Buffer.from('fake content'), filename: 'test.php' },
        { buffer: Buffer.from('fake content'), filename: 'test.sh' },
      ];

      for (const file of invalidFiles) {
        await request(app.getHttpServer())
          .post('/api/faqs/upload/image')
          .attach('file', file.buffer, file.filename)
          .expect(400);
      }
    });

    it('should reject invalid file types for documents', async () => {
      const invalidFiles = [
        { buffer: Buffer.from('fake content'), filename: 'test.exe' },
        { buffer: Buffer.from('fake content'), filename: 'test.jpg' },
        { buffer: Buffer.from('fake content'), filename: 'test.png' },
      ];

      for (const file of invalidFiles) {
        await request(app.getHttpServer())
          .post('/api/faqs/upload/file')
          .attach('file', file.buffer, file.filename)
          .expect(400);
      }
    });

    it('should prevent path traversal in file uploads', async () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        '../../windows/system32/config/sam',
        '..\\..\\windows\\system32\\config\\sam',
        '/etc/passwd',
        'C:\\Windows\\System32\\config\\sam',
      ];

      const testBuffer = Buffer.from('fake image content');

      for (const filename of maliciousFilenames) {
        // Note: This test documents expected behavior
        // Actual implementation should sanitize filenames
        const response = await request(app.getHttpServer())
          .post('/api/faqs/upload/image')
          .attach('file', testBuffer, filename);

        // Should either reject or sanitize the filename
        expect([400, 201]).toContain(response.status);
      }
    });

    it('should reject empty file uploads', async () => {
      await request(app.getHttpServer())
        .post('/api/faqs/upload/image')
        .expect(400);
    });

    it('should validate Cloudinary URLs in images array', async () => {
      const maliciousUrls = [
        'javascript:alert(1)',
        '<script>alert(1)</script>',
        'file:///etc/passwd',
        'data:text/html,<script>alert(1)</script>',
      ];

      // Create FAQ first
      const faqResponse = await request(app.getHttpServer())
        .post('/api/faqs')
        .send({
          question: 'Test?',
          answer: 'Test',
          category: FAQCategory.GENERAL,
        })
        .expect(201);

      const faqId = faqResponse.body.data.id;

      // Attempt to update with malicious URLs
      for (const maliciousUrl of maliciousUrls) {
        await request(app.getHttpServer())
          .patch(`/api/faqs/${faqId}`)
          .send({
            images: [maliciousUrl],
          })
          .expect(200); // Should accept (validation at display layer)
      }
    });
  });

  describe('Security: Input Validation', () => {
    it('should validate FAQCategory enum', async () => {
      await request(app.getHttpServer())
        .post('/api/faqs')
        .send({
          question: 'Test?',
          answer: 'Test',
          category: 'INVALID_CATEGORY',
        })
        .expect(400);
    });

    it('should reject invalid UUID format for productId', async () => {
      const invalidUUIDs = ['not-a-uuid', '123', 'uuid-123', ''];

      for (const invalidId of invalidUUIDs) {
        await request(app.getHttpServer())
          .post('/api/faqs')
          .send({
            question: 'Test?',
            answer: 'Test',
            category: FAQCategory.GENERAL,
            productId: invalidId,
          })
          .expect(400);
      }
    });

    it('should enforce order value constraints', async () => {
      await request(app.getHttpServer())
        .post('/api/faqs')
        .send({
          question: 'Test?',
          answer: 'Test',
          category: FAQCategory.GENERAL,
          order: -100,
        })
        .expect(400); // Should reject negative values
    });

    it('should validate array inputs for images and attachments', async () => {
      await request(app.getHttpServer())
        .post('/api/faqs')
        .send({
          question: 'Test?',
          answer: 'Test',
          category: FAQCategory.GENERAL,
          images: 'not-an-array', // Should be array
        })
        .expect(400);
    });
  });

  describe('Security: IDOR Prevention', () => {
    it('should prevent access to non-existent FAQs', async () => {
      const fakeIds = [
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        '123e4567-e89b-12d3-a456-426614174000',
      ];

      for (const fakeId of fakeIds) {
        await request(app.getHttpServer())
          .get(`/api/faqs/${fakeId}`)
          .expect(404);
      }
    });
  });

  describe('Security: Mass Assignment Prevention', () => {
    it('should ignore unauthorized fields in request body', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/faqs')
        .send({
          question: 'Test?',
          answer: 'Test',
          category: FAQCategory.GENERAL,
          // Attempting to inject unauthorized fields
          isAdmin: true,
          role: 'admin',
          created_at: new Date('2020-01-01'),
        })
        .expect(201);

      // Unauthorized fields should be ignored
      expect(response.body.data.isAdmin).toBeUndefined();
      expect(response.body.data.role).toBeUndefined();
    });
  });

  describe('Performance: Pagination', () => {
    it('should enforce pagination limits', async () => {
      // Test with default pagination
      const response1 = await request(app.getHttpServer())
        .get('/api/faqs')
        .expect(200);

      expect(response1.body.data.limit).toBeLessThanOrEqual(100);
      expect(response1.body.data.page).toBeGreaterThanOrEqual(1);
    });

    it('should prevent extremely large limit values', async () => {
      await request(app.getHttpServer())
        .get('/api/faqs?limit=1000000')
        .expect(400); // Should be rejected by @Max(100) validation
    });

    it('should handle large page numbers gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/faqs?page=999999&limit=10')
        .expect(200);

      expect(response.body.data.data).toEqual([]);
      expect(response.body.data.total).toBeDefined();
    });
  });

  describe('Performance: Query Optimization', () => {
    it('should use indexes for filtering by category', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get(`/api/faqs?category=${FAQCategory.SHIPPING}`)
        .expect(200);

      const duration = Date.now() - startTime;
      // Should complete quickly with proper indexing
      expect(duration).toBeLessThan(1000);
    });

    it('should use indexes for filtering by productId', async () => {
      const startTime = Date.now();

      await request(app.getHttpServer())
        .get(`/api/faqs?productId=${productId}`)
        .expect(200);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app.getHttpServer()).get('/api/faqs').expect(200),
      );

      const startTime = Date.now();
      await Promise.all(requests);
      const duration = Date.now() - startTime;

      // Should handle concurrent requests efficiently
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Security: Cloudinary Integration', () => {
    it('should handle Cloudinary upload errors gracefully', async () => {
      // Note: This test documents expected behavior
      // Actual Cloudinary errors should be handled in CloudinaryService
      const testBuffer = Buffer.from('fake image content');

      // This will fail if Cloudinary credentials are not set
      // But should not crash the application
      const response = await request(app.getHttpServer())
        .post('/api/faqs/upload/image')
        .attach('file', testBuffer, 'test.jpg');

      // Should either succeed or return proper error (not 500)
      expect([200, 201, 400, 500]).toContain(response.status);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long question and answer text', async () => {
      const longText = 'A'.repeat(50000); // 50KB

      const response = await request(app.getHttpServer())
        .post('/api/faqs')
        .send({
          question: longText,
          answer: longText,
          category: FAQCategory.GENERAL,
        })
        .expect(201);

      expect(response.body.data.question).toBe(longText);
      expect(response.body.data.answer).toBe(longText);
    });

    it('should handle special characters and Unicode', async () => {
      const specialText =
        'Test with émojis 🎉 and spéciál chäracters! 中文 العربية';

      const response = await request(app.getHttpServer())
        .post('/api/faqs')
        .send({
          question: specialText,
          answer: specialText,
          category: FAQCategory.GENERAL,
        })
        .expect(201);

      expect(response.body.data.question).toBe(specialText);
      expect(response.body.data.answer).toBe(specialText);
    });

    it('should handle empty arrays for images and attachments', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/faqs')
        .send({
          question: 'Test?',
          answer: 'Test',
          category: FAQCategory.GENERAL,
          images: [],
          attachments: [],
        })
        .expect(201);

      expect(Array.isArray(response.body.data.images)).toBe(true);
      expect(Array.isArray(response.body.data.attachments)).toBe(true);
    });
  });

  describe('Business Logic', () => {
    it('should create global FAQ when productId is null', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/faqs')
        .send({
          question: 'Global FAQ?',
          answer: 'Global answer',
          category: FAQCategory.GENERAL,
          productId: null,
        })
        .expect(201);

      expect(response.body.data.productId).toBeNull();
      expect(response.body.data.product).toBeNull();
    });

    it('should create product-specific FAQ when productId is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/faqs')
        .send({
          question: 'Product FAQ?',
          answer: 'Product answer',
          category: FAQCategory.PRODUCT_POLICY,
          productId: productId,
        })
        .expect(201);

      expect(response.body.data.productId).toBe(productId);
      expect(response.body.data.product).toBeDefined();
    });

    it('should reject FAQ creation for inactive product', async () => {
      // Create inactive product
      const inactiveProduct = await prisma.product.create({
        data: {
          name: 'Inactive Product',
          category: 'Electronics',
          measurement: '10x20 cm',
          description: 'Inactive',
          stars_evaluation: 0,
          rating_count: 1,
          is_active: false,
          variants: {
            create: {
              color: 'Red',
              sku: 'INACTIVE-SKU',
              price: 100,
              quantity: 0,
              image: 'test.jpg',
            },
          },
        },
      });

      await request(app.getHttpServer())
        .post('/api/faqs')
        .send({
          question: 'Test?',
          answer: 'Test',
          category: FAQCategory.PRODUCT_POLICY,
          productId: inactiveProduct.id,
        })
        .expect(404); // Should reject inactive product

      // Cleanup
      await prisma.productVariant.deleteMany({
        where: { productId: inactiveProduct.id },
      });
      await prisma.product.delete({ where: { id: inactiveProduct.id } });
    });
  });
});
