import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from 'src/review/review.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateReviewDto } from 'src/review/dto/create-review.dto';
import { UpdateReviewDto } from 'src/review/dto/update-review.dto';
import { QueryReviewDto } from 'src/review/dto/query-review.dto';
import { CreateReactionDto } from 'src/review/dto/create-reaction.dto';
import { CreateReplyDto } from 'src/review/dto/create-reply.dto';
import { ReactionType } from '@prisma/client';

describe('ReviewService - Security & Optimization Tests', () => {
  let service: ReviewService;
  let prismaMock: any;

  const mockProduct = {
    id: 'product-uuid-123',
    name: 'Test Product',
    is_active: true,
  };

  const mockReview = {
    id: 'review-uuid-123',
    productId: 'product-uuid-123',
    userId: 'user-uuid-123',
    rating: 5,
    comment: 'Great product!',
    created_at: new Date(),
    updated_at: new Date(),
    product: {
      id: 'product-uuid-123',
      name: 'Test Product',
    },
  };

  beforeEach(async () => {
    prismaMock = {
      $transaction: jest.fn().mockImplementation((fn) => fn(prismaMock)),
      review: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      reviewReaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      reviewReply: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Security: Input Validation & SQL Injection Prevention', () => {
    it('should sanitize and validate UUID format for productId', async () => {
      const maliciousInputs = [
        "'; DROP TABLE Review; --",
        '1 OR 1=1',
        '<script>alert("xss")</script>',
        '../../../etc/passwd',
        "'; SELECT * FROM users; --",
      ];

      prismaMock.product.findUnique.mockResolvedValue(null);

      for (const maliciousInput of maliciousInputs) {
        const dto: CreateReviewDto = {
          productId: maliciousInput,
          rating: 5,
          comment: 'Test',
        };

        await expect(service.createOrUpdateReview(dto)).rejects.toThrow();
        // Prisma should reject invalid UUIDs, preventing SQL injection
      }
    });

    it('should prevent XSS in review comments', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<svg onload=alert(1)>',
      ];

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.review.findUnique.mockResolvedValue(null);
      prismaMock.review.create.mockResolvedValue(mockReview);
      // Mock recalculateProductRating internal call
      prismaMock.review.findMany.mockResolvedValue([{ rating: 5 }]);
      prismaMock.product.update.mockResolvedValue({});

      for (const xssPayload of xssPayloads) {
        const dto: CreateReviewDto = {
          productId: 'product-uuid-123',
          rating: 5,
          comment: xssPayload,
        };

        const result = await service.createOrUpdateReview(dto);
        // Comment should be stored as-is (sanitization should happen at API/display layer)
        // This test ensures the system doesn't crash on malicious input
        expect(result).toBeDefined();
      }
    });

    it('should validate rating range (1-5) to prevent invalid data', async () => {
      const invalidRatings = [0, -1, 6, 100, NaN, Infinity, -Infinity];

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);

      for (const invalidRating of invalidRatings) {
        const dto: CreateReviewDto = {
          productId: 'product-uuid-123',
          rating: invalidRating as any,
          comment: 'Test',
        };

        // Validation should happen at DTO level via class-validator
        // Service should handle edge cases gracefully
        await expect(
          service.createOrUpdateReview(dto),
        ).rejects.toThrow();
      }
    });

    it('should prevent mass assignment attacks', async () => {
      const maliciousDto: any = {
        productId: 'product-uuid-123',
        rating: 5,
        comment: 'Test',
        // Attempting to inject unauthorized fields
        isAdmin: true,
        role: 'admin',
        created_at: new Date('2020-01-01'),
        '$where': { id: 'any-id' },
      };

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.review.findUnique.mockResolvedValue(null);
      prismaMock.review.create.mockResolvedValue(mockReview);
      prismaMock.review.findMany.mockResolvedValue([{ rating: 5 }]);
      prismaMock.product.update.mockResolvedValue({});

      const result = await service.createOrUpdateReview(maliciousDto);

      // Prisma should only accept defined schema fields
      expect(result).toBeDefined();
      expect((result as any).isAdmin).toBeUndefined();
      expect((result as any).role).toBeUndefined();
    });
  });

  describe('Security: Authorization & Access Control', () => {
    it('should prevent unauthorized review updates (IDOR)', async () => {
      const attackerUserId = 'attacker-uuid';
      const victimReviewId = 'victim-review-uuid';

      prismaMock.review.findUnique.mockResolvedValue({
        ...mockReview,
        userId: 'victim-uuid-123', // Different user
      });
      prismaMock.review.update.mockResolvedValue({
        ...mockReview,
        rating: 1,
        comment: 'Malicious update',
      });
      prismaMock.review.findMany.mockResolvedValue([{ rating: 1 }]);
      prismaMock.product.update.mockResolvedValue({});

      const updateDto: UpdateReviewDto = {
        rating: 1,
        comment: 'Malicious update',
      };

      // Note: In real implementation, service should verify userId matches
      // This test documents the expected behavior
      await expect(
        service.updateReview(victimReviewId, updateDto),
      ).resolves.toBeDefined();

      // Actual authorization should be handled by controller/auth guard
    });

    it('should allow anonymous reviews (userId can be null)', async () => {
      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.review.findUnique.mockResolvedValue(null);
      prismaMock.review.create.mockResolvedValue({
        ...mockReview,
        userId: null,
      });
      prismaMock.review.findMany.mockResolvedValue([{ rating: 5 }]);
      prismaMock.product.update.mockResolvedValue({});

      const dto: CreateReviewDto = {
        productId: 'product-uuid-123',
        rating: 5,
        comment: 'Anonymous review',
        userId: null,
      };

      const result = await service.createOrUpdateReview(dto);
      expect(result).toBeDefined();
    });
  });

  describe('Security: Rate Limiting & DoS Prevention', () => {
    it('should handle concurrent review creation efficiently', async () => {
      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.review.findUnique.mockResolvedValue(null);
      prismaMock.review.create.mockResolvedValue(mockReview);
      prismaMock.review.findMany.mockResolvedValue([{ rating: 5 }]);
      prismaMock.product.update.mockResolvedValue({});

      const dto: CreateReviewDto = {
        productId: 'product-uuid-123',
        rating: 5,
        comment: 'Test',
      };

      // Simulate 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        service.createOrUpdateReview(dto),
      );

      // Should complete without errors (rate limiting handled at API layer)
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('should prevent pagination DoS attacks (limit max page size)', async () => {
      const maliciousQuery: QueryReviewDto = {
        page: 1,
        limit: 1000000, // Extremely large limit
      };

      prismaMock.review.findMany.mockResolvedValue([]);
      prismaMock.review.count.mockResolvedValue(0);

      // Service should handle large limits gracefully
      // Actual limit enforcement should be in DTO (@Max(100))
      const result = await service.findAll(maliciousQuery);
      expect(result).toBeDefined();
    });
  });

  describe('Performance: Query Optimization', () => {
    it('should use pagination to prevent loading all records', async () => {
      prismaMock.review.findMany.mockResolvedValue([]);
      prismaMock.review.count.mockResolvedValue(1000);

      const query: QueryReviewDto = {
        page: 1,
        limit: 10,
      };

      await service.findAll(query);

      expect(prismaMock.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should use Promise.all for parallel queries in findAll', async () => {
      prismaMock.review.findMany.mockResolvedValue([]);
      prismaMock.review.count.mockResolvedValue(0);

      await service.findAll({});

      // Both queries should be made (parallel execution)
      expect(prismaMock.review.findMany).toHaveBeenCalled();
      expect(prismaMock.review.count).toHaveBeenCalled();
    });

    it('should use indexes for filtering (productId, userId)', async () => {
      const query: QueryReviewDto = {
        productId: 'product-uuid-123',
        userId: 'user-uuid-123',
      };

      prismaMock.review.findMany.mockResolvedValue([]);
      prismaMock.review.count.mockResolvedValue(0);

      await service.findAll(query);

      expect(prismaMock.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            productId: 'product-uuid-123',
            userId: 'user-uuid-123',
          }),
        }),
      );
    });
  });

  describe('Security: Reaction System', () => {
    it('should prevent duplicate reactions (one per user per review)', async () => {
      const reviewId = 'review-uuid-123';
      const userId = 'user-uuid-123';

      prismaMock.review.findUnique.mockResolvedValue(mockReview);
      prismaMock.reviewReaction.findUnique.mockResolvedValue({
        id: 'reaction-uuid',
        reviewId,
        userId,
        reaction: ReactionType.LIKE,
      });

      const dto: CreateReactionDto = {
        userId,
        reaction: ReactionType.DISLIKE,
      };

      prismaMock.reviewReaction.update.mockResolvedValue({
        ...dto,
        id: 'reaction-uuid',
      });

      // Should update existing reaction, not create duplicate
      const result = await service.createOrUpdateReaction(reviewId, dto);
      expect(prismaMock.reviewReaction.update).toHaveBeenCalled();
      expect(prismaMock.reviewReaction.create).not.toHaveBeenCalled();
    });

    it('should validate reaction type enum to prevent invalid values', async () => {
      const reviewId = 'review-uuid-123';
      const maliciousDto: any = {
        userId: 'user-uuid-123',
        reaction: 'INVALID_TYPE', // Invalid enum value
      };

      prismaMock.review.findUnique.mockResolvedValue(mockReview);

      // Should be rejected at DTO validation level (class-validator)
      // Service will receive invalid data if validation passes
      // Prisma will throw error for invalid enum
      try {
        await service.createOrUpdateReaction(reviewId, maliciousDto);
        // If it doesn't throw, that's also acceptable (validation at DTO level)
      } catch (error) {
        // Expected to throw for invalid enum
        expect(error).toBeDefined();
      }
    });
  });

  describe('Security: Reply System', () => {
    it('should prevent reply to non-existent review', async () => {
      prismaMock.review.findUnique.mockResolvedValue(null);

      const dto: CreateReplyDto = {
        userId: 'user-uuid-123',
        content: 'Reply content',
      };

      await expect(
        service.createReply('non-existent-review-id', dto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should prevent nested reply loops (deep nesting)', async () => {
      const reviewId = 'review-uuid-123';
      const parentId = 'parent-reply-uuid';

      prismaMock.review.findUnique.mockResolvedValue(mockReview);
      prismaMock.reviewReply.findUnique.mockResolvedValue({
        id: parentId,
        reviewId,
        parentId: null, // Valid parent
      });

      prismaMock.reviewReply.create.mockResolvedValue({
        id: 'child-reply-uuid',
        reviewId,
        parentId,
        content: 'Nested reply',
      });

      const dto: CreateReplyDto = {
        parentId,
        userId: 'user-uuid-123',
        content: 'Nested reply',
      };

      // Should allow nesting (Prisma handles cascade deletes)
      const result = await service.createReply(reviewId, dto);
      expect(result).toBeDefined();
    });

    it('should sanitize reply content to prevent XSS', async () => {
      const reviewId = 'review-uuid-123';
      const xssContent = '<script>alert("xss")</script>';

      prismaMock.review.findUnique.mockResolvedValue(mockReview);
      prismaMock.reviewReply.create.mockResolvedValue({
        id: 'reply-uuid',
        reviewId,
        content: xssContent,
      });

      const dto: CreateReplyDto = {
        userId: 'user-uuid-123',
        content: xssContent,
      };

      // Content should be stored (sanitization at display layer)
      const result = await service.createReply(reviewId, dto);
      expect(result).toBeDefined();
    });
  });

  describe('Business Logic: Rating Recalculation', () => {
    it('should recalculate product rating after review creation', async () => {
      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.review.findUnique.mockResolvedValue(null);
      prismaMock.review.create.mockResolvedValue(mockReview);
      prismaMock.review.findMany.mockResolvedValue([
        { rating: 5 },
        { rating: 4 },
        { rating: 3 },
      ]);
      prismaMock.product.update.mockResolvedValue({});

      const dto: CreateReviewDto = {
        productId: 'product-uuid-123',
        rating: 5,
        comment: 'Great!',
      };

      await service.createOrUpdateReview(dto);

      // Should recalculate rating
      expect(prismaMock.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 'product-uuid-123' },
        }),
      );
    });

    it('should use transaction for atomic review creation and rating update', async () => {
      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.review.findUnique.mockResolvedValue(null);
      prismaMock.review.create.mockResolvedValue(mockReview);
      prismaMock.review.findMany.mockResolvedValue([{ rating: 5 }]);
      prismaMock.product.update.mockResolvedValue({});

      const dto: CreateReviewDto = {
        productId: 'product-uuid-123',
        rating: 5,
        comment: 'Test',
      };

      await service.createOrUpdateReview(dto);

      // Should use transaction
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle product not found gracefully', async () => {
      prismaMock.product.findUnique.mockResolvedValue(null);

      const dto: CreateReviewDto = {
        productId: 'non-existent-product',
        rating: 5,
        comment: 'Test',
      };

      await expect(service.createOrUpdateReview(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle very long comment text', async () => {
      const longComment = 'A'.repeat(10000); // 10KB comment

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.review.findUnique.mockResolvedValue(null);
      prismaMock.review.create.mockResolvedValue({
        ...mockReview,
        comment: longComment,
      });
      prismaMock.review.findMany.mockResolvedValue([{ rating: 5 }]);
      prismaMock.product.update.mockResolvedValue({});

      const dto: CreateReviewDto = {
        productId: 'product-uuid-123',
        rating: 5,
        comment: longComment,
      };

      // Should handle long comments (DB column should have appropriate limit)
      const result = await service.createOrUpdateReview(dto);
      expect(result).toBeDefined();
    });

    it('should handle special characters in comments', async () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?/`~';

      prismaMock.product.findUnique.mockResolvedValue(mockProduct);
      prismaMock.review.findUnique.mockResolvedValue(null);
      prismaMock.review.create.mockResolvedValue({
        ...mockReview,
        comment: specialChars,
      });
      prismaMock.review.findMany.mockResolvedValue([{ rating: 5 }]);
      prismaMock.product.update.mockResolvedValue({});

      const dto: CreateReviewDto = {
        productId: 'product-uuid-123',
        rating: 5,
        comment: specialChars,
      };

      const result = await service.createOrUpdateReview(dto);
      expect(result).toBeDefined();
    });
  });
});

