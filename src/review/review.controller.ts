import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { UpdateReplyDto } from './dto/update-reply.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import type { User } from '@prisma/client';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create or update a review',
    description:
      'Create a new review or update existing one if user already reviewed this product (upsert logic). Requires authentication - only logged in users (USER, ADMIN, MODERATOR) can review. Guest users cannot create reviews.',
  })
  @ApiResponse({
    status: 201,
    description: 'Review created or updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - must be logged in' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Guest users cannot create reviews',
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  createOrUpdate(
    @Body() createReviewDto: CreateReviewDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.reviewService.createOrUpdateReview(
      createReviewDto,
      currentUser,
    );
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all reviews',
    description:
      'Get paginated list of reviews with optional filters by productId or userId',
  })
  @ApiResponse({ status: 200, description: 'List of reviews' })
  findAll(@Query() query: QueryReviewDto) {
    return this.reviewService.findAll(query);
  }

  @Get('users/:userId/count')
  @Public()
  @ApiOperation({
    summary: 'Count reviews by user',
    description: 'Get total number of reviews created by a user',
  })
  @ApiResponse({ status: 200, description: 'Review count' })
  countReviewsByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.reviewService.countReviewsByUser(userId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get review by ID' })
  @ApiResponse({ status: 200, description: 'Review details' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update review',
    description:
      'Update an existing review by ID. Users can only update their own reviews, admins can update any.',
  })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only update your own reviews',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @CurrentUser() currentUser?: User,
  ) {
    return this.reviewService.updateReview(id, updateReviewDto, currentUser);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete review',
    description:
      'Delete a review by ID. Admins can delete any review, users can only delete their own. Product rating will be recalculated automatically.',
  })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only delete your own reviews',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser?: User,
  ) {
    return this.reviewService.removeReview(id, currentUser);
  }

  // ========== Reactions Endpoints ==========

  @Post(':id/react')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute per user (strict rate limit)
  @ApiOperation({
    summary: 'React to a review (toggle behavior)',
    description:
      'Create, update, or toggle a reaction (like/dislike) to a review. Requires authentication. ' +
      'Toggle behavior: If clicking the same reaction type again (like → like or dislike → dislike), it will remove the reaction (toggle off). ' +
      'If clicking different reaction type (like → dislike or dislike → like), it will switch the reaction. ' +
      'Rate limited: 10 requests per minute per user. Debounced: 300ms between requests.',
  })
  @ApiResponse({
    status: 201,
    description: 'Reaction created, updated, or removed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Too many requests too quickly (debounced)',
  })
  @ApiResponse({ status: 404, description: 'Review not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - must be logged in' })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - rate limit exceeded',
  })
  reactToReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createReactionDto: CreateReactionDto,
    @CurrentUser() currentUser?: User,
  ) {
    return this.reviewService.createOrUpdateReaction(
      id,
      createReactionDto,
      currentUser,
    );
  }

  @Delete(':id/react')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove reaction from a review',
    description: 'Remove a reaction from a review. Requires authentication.',
  })
  @ApiResponse({ status: 200, description: 'Reaction removed successfully' })
  @ApiResponse({ status: 404, description: 'Review or reaction not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - must be logged in' })
  removeReaction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser?: User,
  ) {
    return this.reviewService.removeReaction(id, currentUser);
  }

  @Get(':id/reactions')
  @Public()
  @ApiOperation({
    summary: 'Get reactions count for a review',
    description: 'Get count of likes and dislikes for a review',
  })
  @ApiResponse({ status: 200, description: 'Reactions count' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  getReactionsCount(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewService.getReactionsCount(id);
  }

  // ========== Replies Endpoints ==========

  @Post(':id/replies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a reply to a review',
    description:
      'Create a reply to a review. Requires authentication. Can be a direct reply or a nested reply to another reply.',
  })
  @ApiResponse({ status: 201, description: 'Reply created successfully' })
  @ApiResponse({ status: 404, description: 'Review or parent reply not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - must be logged in' })
  createReply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createReplyDto: CreateReplyDto,
    @CurrentUser() currentUser?: User,
  ) {
    return this.reviewService.createReply(id, createReplyDto, currentUser);
  }

  @Get(':id/replies')
  @Public()
  @ApiOperation({
    summary: 'Get all replies for a review',
    description: 'Get all replies for a review in nested structure',
  })
  @ApiResponse({ status: 200, description: 'List of replies' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  findAllReplies(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewService.findAllReplies(id);
  }

  @Patch('replies/:replyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update a reply',
    description:
      'Update a reply by ID. Users can only update their own replies, admins can update any.',
  })
  @ApiResponse({ status: 200, description: 'Reply updated successfully' })
  @ApiResponse({ status: 404, description: 'Reply not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only update your own replies',
  })
  updateReply(
    @Param('replyId', ParseUUIDPipe) replyId: string,
    @Body() updateReplyDto: UpdateReplyDto,
    @CurrentUser() currentUser?: User,
  ) {
    return this.reviewService.updateReply(replyId, updateReplyDto, currentUser);
  }

  @Delete('replies/:replyId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a reply',
    description:
      'Delete a reply by ID. Admins can delete any reply, users can only delete their own. Nested replies will be cascade deleted.',
  })
  @ApiResponse({ status: 200, description: 'Reply deleted successfully' })
  @ApiResponse({ status: 404, description: 'Reply not found' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only delete your own replies',
  })
  removeReply(
    @Param('replyId', ParseUUIDPipe) replyId: string,
    @CurrentUser() currentUser?: User,
  ) {
    return this.reviewService.removeReply(replyId, currentUser);
  }
}
