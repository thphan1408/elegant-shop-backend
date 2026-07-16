import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, UserRole } from '@prisma/client';
import type { User } from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UpdateReplyDto } from './dto/update-reply.dto';
import { ReactionType } from '@prisma/client';

/**
 * In-memory cache để debounce reaction requests
 * Key: `${userId}:${reviewId}`, Value: timestamp of last request
 */
interface ReactionCache {
  [key: string]: number;
}

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);
  // In-memory cache để debounce reaction requests (300ms debounce time)
  private readonly reactionCache: ReactionCache = {};
  private readonly REACTION_DEBOUNCE_MS = 300; // 300ms debounce - prevent rapid spam

  constructor(private readonly prismaService: PrismaService) {
    // Clean up cache every 5 minutes to prevent memory leak
    const cleanupInterval = setInterval(
      () => {
        const now = Date.now();
        const keys = Object.keys(this.reactionCache);
        let cleaned = 0;
        for (const key of keys) {
          if (now - this.reactionCache[key] > 60000) {
            // Remove entries older than 1 minute
            delete this.reactionCache[key];
            cleaned++;
          }
        }
        if (cleaned > 0) {
          this.logger.debug(
            `Cleaned up ${cleaned} expired reaction cache entries`,
          );
        }
      },
      5 * 60 * 1000,
    );
    // Don't let this housekeeping timer keep the process (or Jest) alive.
    cleanupInterval.unref();
  }

  /**
   * Create or update a review (upsert logic for Option 1: Single review per user per product)
   * If user already has a review for this product, update it instead of creating new one
   * @param createReviewDto - Review data (productId, rating, comment)
   * @param currentUser - Current authenticated user (required, must not be GUEST)
   * @returns Created or updated review with product info
   * @throws UnauthorizedException if user is not authenticated
   * @throws ForbiddenException if user is GUEST role (guests cannot review)
   * @throws NotFoundException if product not found or inactive
   */
  async createOrUpdateReview(
    createReviewDto: CreateReviewDto,
    currentUser: User,
  ) {
    // Ensure user is authenticated
    if (!currentUser) {
      throw new UnauthorizedException(
        'You must be logged in to create a review',
      );
    }

    // Guest users cannot create reviews - only USER, ADMIN, MODERATOR can
    if (currentUser.role === UserRole.GUEST) {
      throw new ForbiddenException(
        'Guest users cannot create reviews. Please login to review products.',
      );
    }
    // Verify product exists
    const product = await this.prismaService.product.findUnique({
      where: { id: createReviewDto.productId, is_active: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found or inactive');
    }

    // Use transaction to ensure atomicity
    return this.prismaService.$transaction(async (tx) => {
      // Use currentUser.id (authenticated user) instead of DTO userId
      const userId = currentUser.id;

      // Check if review already exists for this user-product combination
      const existingReview = await tx.review.findUnique({
        where: {
          productId_userId: {
            productId: createReviewDto.productId,
            userId: userId,
          },
        },
      });

      type ReviewWithProduct = Prisma.ReviewGetPayload<{
        include: {
          product: {
            select: {
              id: true;
              name: true;
            };
          };
        };
      }>;

      let review: ReviewWithProduct;
      if (existingReview) {
        // Update existing review
        review = await tx.review.update({
          where: { id: existingReview.id },
          data: {
            rating: createReviewDto.rating,
            comment: createReviewDto.comment ?? null,
            // updated_at is automatically updated by Prisma
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      } else {
        // Create new review (userId is required - from authenticated user)
        review = await tx.review.create({
          data: {
            productId: createReviewDto.productId,
            userId: userId, // Required - from authenticated user
            rating: createReviewDto.rating,
            comment: createReviewDto.comment ?? null,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });
      }

      // Recalculate product rating after review change
      await this.recalculateProductRating(createReviewDto.productId, tx);

      return review;
    });
  }

  /**
   * Get all reviews with pagination and filters
   * @param query - Query parameters (page, limit, productId, userId)
   * @returns Paginated list of reviews
   */
  async findAll(query: QueryReviewDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause conditionally
    const where: {
      productId?: string;
      userId?: string;
    } = {};

    if (query.productId) {
      where.productId = query.productId;
    }

    if (query.userId) {
      where.userId = query.userId;
    }

    const [reviews, total] = await Promise.all([
      this.prismaService.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' }, // Newest first
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              userName: true,
              name: true,
              avatar: true,
              created_at: true,
              updated_at: true,
            },
          },
        },
      }),
      this.prismaService.review.count({ where }),
    ]);

    return {
      data: reviews,
      total,
      page,
      limit,
    };
  }

  /**
   * Get review by ID
   * @param id - Review ID
   * @returns Review details with product info
   * @throws NotFoundException if review not found
   */
  async findOne(id: string) {
    const review = await this.prismaService.review.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            userName: true,
            name: true,
            avatar: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  /**
   * Update review by ID
   * @param id - Review ID to update
   * @param updateReviewDto - Data to update
   * @param currentUser - Current authenticated user (optional for admin)
   * @returns Updated review
   * @throws NotFoundException if review not found
   * @throws ForbiddenException if user tries to update someone else's review (unless admin)
   */
  async updateReview(
    id: string,
    updateReviewDto: UpdateReviewDto,
    currentUser?: User,
  ) {
    // Check if review exists
    const existingReview = await this.prismaService.review.findUnique({
      where: { id },
    });

    if (!existingReview) {
      throw new NotFoundException('Review not found');
    }

    // Authorization: Only admin or review owner can update
    if (currentUser) {
      if (
        currentUser.role !== UserRole.ADMIN &&
        existingReview.userId !== currentUser.id
      ) {
        throw new ForbiddenException('You can only update your own reviews');
      }
    }

    // Use transaction to ensure atomicity
    return this.prismaService.$transaction(async (tx) => {
      const review = await tx.review.update({
        where: { id },
        data: {
          ...(updateReviewDto.rating !== undefined && {
            rating: updateReviewDto.rating,
          }),
          ...(updateReviewDto.comment !== undefined && {
            comment: updateReviewDto.comment,
          }),
          // updated_at is automatically updated by Prisma
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Recalculate product rating after review update
      await this.recalculateProductRating(existingReview.productId, tx);

      return review;
    });
  }

  /**
   * Delete review by ID
   * @param id - Review ID to delete
   * @param currentUser - Current authenticated user (optional for admin)
   * @returns Success message
   * @throws NotFoundException if review not found
   * @throws ForbiddenException if user tries to delete someone else's review (unless admin)
   */
  async removeReview(id: string, currentUser?: User) {
    const review = await this.prismaService.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Authorization: Admin can delete any review, users can only delete their own
    if (currentUser) {
      if (
        currentUser.role !== UserRole.ADMIN &&
        review.userId !== currentUser.id
      ) {
        throw new ForbiddenException('You can only delete your own reviews');
      }
    }

    const productId = review.productId;

    // Use transaction to ensure atomicity
    return this.prismaService.$transaction(async (tx) => {
      await tx.review.delete({
        where: { id },
      });

      // Recalculate product rating after review deletion
      await this.recalculateProductRating(productId, tx);

      return { message: 'Review deleted successfully' };
    });
  }

  /**
   * Create, update, or toggle a reaction to a review (toggle logic)
   * Toggle behavior:
   * - If clicking the same reaction type again (like → like or dislike → dislike) → removes reaction (toggle off)
   * - If clicking different reaction type (like → dislike or dislike → like) → updates reaction (switches)
   * - If no existing reaction → creates new reaction
   * @param reviewId - Review ID to react to
   * @param createReactionDto - Reaction data (like/dislike)
   * @param currentUser - Current authenticated user (required for guests)
   * @returns Created/updated reaction, or removal message if toggled off
   * @throws NotFoundException if review not found
   * @throws UnauthorizedException if user is not authenticated (guests must login)
   */
  async createOrUpdateReaction(
    reviewId: string,
    createReactionDto: CreateReactionDto,
    currentUser?: User,
  ) {
    // Authorization: Guests must login to react
    if (!currentUser && !createReactionDto.userId) {
      throw new UnauthorizedException(
        'You must be logged in to react to reviews',
      );
    }

    // Use current user's ID if available, otherwise use DTO userId
    const userId = currentUser?.id || createReactionDto.userId;

    if (!userId) {
      throw new UnauthorizedException('User ID is required');
    }

    // Debouncing: Prevent rapid spam requests
    const cacheKey = `${userId}:${reviewId}`;
    const now = Date.now();
    const lastRequestTime = this.reactionCache[cacheKey];

    if (lastRequestTime && now - lastRequestTime < this.REACTION_DEBOUNCE_MS) {
      // Too soon - return cached result or reject
      this.logger.warn(
        `Reaction request debounced for user ${userId} on review ${reviewId} (last request ${now - lastRequestTime}ms ago)`,
      );
      throw new BadRequestException(
        'Please wait a moment before reacting again. Too many requests too quickly.',
      );
    }

    // Update cache timestamp
    this.reactionCache[cacheKey] = now;

    try {
      // Verify review exists (do this before transaction to save resources)
      const review = await this.prismaService.review.findUnique({
        where: { id: reviewId },
        select: { id: true }, // Only select id to reduce data transfer
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      // Use transaction to ensure atomicity and prevent race conditions
      return await this.prismaService.$transaction(
        async (tx) => {
          // Check if reaction already exists
          const existingReaction = await tx.reviewReaction.findUnique({
            where: {
              reviewId_userId: {
                reviewId,
                userId: userId,
              },
            },
          });

          type ReviewReactionType = Prisma.ReviewReactionGetPayload<
            Record<string, never>
          >;

          let reaction: ReviewReactionType | null;
          if (existingReaction) {
            // If clicking the same reaction type again → toggle off (remove reaction)
            if (existingReaction.reaction === createReactionDto.reaction) {
              // Remove reaction (toggle off)
              await tx.reviewReaction.delete({
                where: { id: existingReaction.id },
              });
              return {
                message: 'Reaction removed successfully',
                removed: true,
              };
            } else {
              // Different reaction type → update (like → dislike or dislike → like)
              reaction = await tx.reviewReaction.update({
                where: { id: existingReaction.id },
                data: {
                  reaction: createReactionDto.reaction,
                  // updated_at is automatically updated by Prisma
                },
              });
              return reaction;
            }
          } else {
            // Create new reaction (no existing reaction)
            reaction = await tx.reviewReaction.create({
              data: {
                reviewId,
                userId: userId,
                reaction: createReactionDto.reaction,
              },
            });
            return reaction;
          }
        },
        {
          // Transaction timeout: 5 seconds
          maxWait: 5000,
          timeout: 5000,
        },
      );
    } catch (error) {
      // Remove from cache on error so user can retry
      delete this.reactionCache[cacheKey];

      // Re-throw known exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Handle Prisma errors (race conditions, connection issues, etc.)
      this.logger.error(
        `Error creating/updating reaction for user ${userId} on review ${reviewId}: ${(error as Error).message}`,
        (error as Error).stack,
      );

      // Check for unique constraint violation (race condition)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Reaction already exists. Please try again.',
        );
      }

      // Handle transaction timeout
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new BadRequestException('Operation timed out. Please try again.');
      }

      // Generic error
      throw new BadRequestException(
        'Failed to process reaction. Please try again later.',
      );
    }
  }

  /**
   * Remove reaction from a review
   * @param reviewId - Review ID
   * @param currentUser - Current authenticated user (required)
   * @returns Success message
   * @throws NotFoundException if review or reaction not found
   * @throws UnauthorizedException if user is not authenticated
   */
  async removeReaction(reviewId: string, currentUser?: User) {
    // Verify review exists
    const review = await this.prismaService.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Authorization: Guests must login to remove reactions
    if (!currentUser) {
      throw new UnauthorizedException(
        'You must be logged in to remove reactions',
      );
    }

    const userId = currentUser.id;

    const reaction = await this.prismaService.reviewReaction.findUnique({
      where: {
        reviewId_userId: {
          reviewId,
          userId,
        },
      },
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    await this.prismaService.reviewReaction.delete({
      where: { id: reaction.id },
    });

    return { message: 'Reaction removed successfully' };
  }

  /**
   * Get reactions count for a review
   * @param reviewId - Review ID
   * @returns Object with likeCount, dislikeCount, and total
   * @throws NotFoundException if review not found
   */
  async getReactionsCount(reviewId: string) {
    // Verify review exists
    const review = await this.prismaService.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const [likeCount, dislikeCount, total] = await Promise.all([
      this.prismaService.reviewReaction.count({
        where: { reviewId, reaction: ReactionType.LIKE },
      }),
      this.prismaService.reviewReaction.count({
        where: { reviewId, reaction: ReactionType.DISLIKE },
      }),
      this.prismaService.reviewReaction.count({
        where: { reviewId },
      }),
    ]);

    return {
      likeCount,
      dislikeCount,
      total,
    };
  }

  /**
   * Create a reply to a review
   * @param reviewId - Review ID to reply to
   * @param createReplyDto - Reply data
   * @param currentUser - Current authenticated user (required for guests)
   * @returns Created reply
   * @throws NotFoundException if review or parent reply not found
   * @throws UnauthorizedException if user is not authenticated (guests must login)
   */
  async createReply(
    reviewId: string,
    createReplyDto: CreateReplyDto,
    currentUser?: User,
  ) {
    // Verify review exists
    const review = await this.prismaService.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Authorization: Guests must login to reply
    if (!currentUser && !createReplyDto.userId) {
      throw new UnauthorizedException(
        'You must be logged in to reply to reviews',
      );
    }

    // Use current user's ID if available, otherwise use DTO userId
    const userId = currentUser?.id || createReplyDto.userId;

    // If parentId is provided, verify parent reply exists and belongs to same review
    if (createReplyDto.parentId) {
      const parentReply = await this.prismaService.reviewReply.findUnique({
        where: { id: createReplyDto.parentId },
      });

      if (!parentReply) {
        throw new NotFoundException('Parent reply not found');
      }

      if (parentReply.reviewId !== reviewId) {
        throw new BadRequestException(
          'Parent reply does not belong to this review',
        );
      }
    }

    return this.prismaService.reviewReply.create({
      data: {
        reviewId,
        parentId: createReplyDto.parentId ?? null,
        userId: userId ?? null,
        content: createReplyDto.content,
      },
      include: {
        parent: {
          select: {
            id: true,
            content: true,
          },
        },
      },
    });
  }

  /**
   * Get all replies for a review (nested structure)
   * @param reviewId - Review ID
   * @returns Nested structure of replies with total count
   * @throws NotFoundException if review not found
   */
  async findAllReplies(reviewId: string) {
    // Verify review exists
    const review = await this.prismaService.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Get all replies for this review
    const replies = await this.prismaService.reviewReply.findMany({
      where: { reviewId },
      orderBy: { created_at: 'asc' },
      include: {
        replies: {
          orderBy: { created_at: 'asc' },
        },
      },
    });

    // Helper function to build nested structure recursively
    type NestedReply = Prisma.ReviewReplyGetPayload<Record<string, never>> & {
      replies: NestedReply[];
    };

    const buildNestedReplies = (parentId: string | null): NestedReply[] => {
      return replies
        .filter((reply) => reply.parentId === parentId)
        .map((reply) => ({
          ...reply,
          replies: buildNestedReplies(reply.id),
        }));
    };

    const nestedReplies = buildNestedReplies(null);

    return {
      data: nestedReplies,
      total: replies.length,
    };
  }

  /**
   * Update a reply
   * @param replyId - Reply ID to update
   * @param updateReplyDto - Data to update
   * @param currentUser - Current authenticated user (optional for admin)
   * @returns Updated reply
   * @throws NotFoundException if reply not found
   * @throws ForbiddenException if user tries to update someone else's reply (unless admin)
   */
  async updateReply(
    replyId: string,
    updateReplyDto: UpdateReplyDto,
    currentUser?: User,
  ) {
    const reply = await this.prismaService.reviewReply.findUnique({
      where: { id: replyId },
    });

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    // Authorization: Only admin or reply owner can update
    if (currentUser) {
      if (
        currentUser.role !== UserRole.ADMIN &&
        reply.userId !== currentUser.id
      ) {
        throw new ForbiddenException('You can only update your own replies');
      }
    }

    return this.prismaService.reviewReply.update({
      where: { id: replyId },
      data: {
        content: updateReplyDto.content,
        // updated_at is automatically updated by Prisma
      },
    });
  }

  /**
   * Delete a reply (cascade delete nested replies)
   * @param replyId - Reply ID to delete
   * @param currentUser - Current authenticated user (optional for admin)
   * @returns Success message
   * @throws NotFoundException if reply not found
   * @throws ForbiddenException if user tries to delete someone else's reply (unless admin)
   */
  async removeReply(replyId: string, currentUser?: User) {
    const reply = await this.prismaService.reviewReply.findUnique({
      where: { id: replyId },
    });

    if (!reply) {
      throw new NotFoundException('Reply not found');
    }

    // Authorization: Admin can delete any reply, users can only delete their own
    if (currentUser) {
      if (
        currentUser.role !== UserRole.ADMIN &&
        reply.userId !== currentUser.id
      ) {
        throw new ForbiddenException('You can only delete your own replies');
      }
    }

    // Cascade delete is handled by Prisma schema (onDelete: Cascade)
    await this.prismaService.reviewReply.delete({
      where: { id: replyId },
    });

    return { message: 'Reply deleted successfully' };
  }

  /**
   * Count reviews by user ID
   * @param userId - User ID to count reviews for
   * @returns Object with userId and reviewCount
   */
  async countReviewsByUser(userId: string) {
    const count = await this.prismaService.review.count({
      where: { userId },
    });

    return {
      userId,
      reviewCount: count,
    };
  }

  /**
   * Recalculate product rating (stars_evaluation and rating_count) based on all reviews
   * This is called after create/update/delete review operations
   * @param productId - Product ID to recalculate rating for
   * @param tx - Optional Prisma transaction client (for use within transactions)
   * @private
   */
  private async recalculateProductRating(
    productId: string,
    tx?: Prisma.TransactionClient, // Prisma transaction client or PrismaService
  ) {
    const prisma = tx || this.prismaService;

    // Get all reviews for this product
    const reviews = await prisma.review.findMany({
      where: { productId },
      select: { rating: true },
    });

    const reviewCount = reviews.length;
    const avgRating =
      reviewCount > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : 0;

    // Update product with new rating (round to 1 decimal place)
    await prisma.product.update({
      where: { id: productId },
      data: {
        stars_evaluation: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        rating_count: reviewCount || 1, // Minimum 1 to avoid division by zero in frontend
      },
    });
  }
}
