import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import type { User } from '@prisma/client';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  /**
   * Create a new order (supports guest checkout)
   * @param createOrderDto - Order data
   * @param currentUser - Current authenticated user (optional for guests)
   * @returns Created order
   */
  @Post()
  @Public() // Allow guest checkout
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new order',
    description:
      'Create an order. Supports authenticated USER role and guest checkout. ADMIN and MODERATOR roles cannot create orders. For guests, email, name, and phone are required.',
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data or insufficient stock' })
  @ApiResponse({ status: 403, description: 'Forbidden - ADMIN and MODERATOR cannot create orders' })
  @ApiResponse({ status: 404, description: 'Product variant not found' })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() currentUser?: User,
  ) {
    return this.orderService.create(createOrderDto, currentUser);
  }

  /**
   * Checkout: create an order from the caller's current cart, then clear it.
   * Items are read server-side from the cart, so the body only carries
   * shipping/payment (and guest) info — not the items list.
   * @param checkoutDto - Shipping/payment/guest data (no items)
   * @param currentUser - Current authenticated user (optional for guests)
   * @param guestId - Guest cart id (X-Guest-Id header) for anonymous checkout
   * @returns Created order
   */
  @Post('checkout')
  @Public() // Allow guest checkout from a guest cart
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader({
    name: 'X-Guest-Id',
    required: false,
    description:
      'Guest cart id used pre-auth. Ignored when a valid Bearer token is sent.',
  })
  @ApiOperation({
    summary: 'Checkout the current cart into an order',
    description:
      'Reads items from the caller cart (authenticated user or X-Guest-Id guest), creates the order, then clears the cart. Body carries only shipping/payment/guest info.',
  })
  @ApiResponse({ status: 201, description: 'Order created from cart' })
  @ApiResponse({
    status: 400,
    description: 'Cart is empty or insufficient stock',
  })
  @ApiResponse({ status: 404, description: 'Product variant not found' })
  checkout(
    @Body() checkoutDto: CheckoutDto,
    @CurrentUser() currentUser?: User,
    @Headers('x-guest-id') guestId?: string,
  ) {
    return this.orderService.checkout(checkoutDto, currentUser, guestId);
  }

  /**
   * Get all orders (authenticated users only)
   * @param query - Query parameters for filtering and pagination
   * @param currentUser - Current authenticated user
   * @returns Paginated list of orders
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all orders',
    description:
      'Get paginated list of orders. Users can only see their own orders. Admins can see all orders.',
  })
  @ApiResponse({ status: 200, description: 'List of orders' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: QueryOrderDto, @CurrentUser() currentUser?: User) {
    return this.orderService.findAll(query, currentUser);
  }

  /**
   * Get order by ID
   * @param id - Order ID (UUID)
   * @param currentUser - Current authenticated user
   * @returns Order details
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get order by ID',
    description: 'Users can only view their own orders. Admins can view any order.',
  })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser?: User,
  ) {
    return this.orderService.findOne(id, currentUser);
  }

  /**
   * Track order by order number (public endpoint)
   * @param orderNumber - Order number
   * @param currentUser - Current authenticated user (optional)
   * @returns Order details
   */
  @Get('track/:orderNumber')
  @Public() // Allow public order tracking
  @ApiOperation({
    summary: 'Track order by order number',
    description: 'Public endpoint to track order status by order number. Guests can track their orders.',
  })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findByOrderNumber(
    @Param('orderNumber') orderNumber: string,
    @CurrentUser() currentUser?: User,
  ) {
    return this.orderService.findByOrderNumber(orderNumber, currentUser);
  }

  /**
   * Update order
   * @param id - Order ID (UUID)
   * @param updateOrderDto - Data to update
   * @param currentUser - Current authenticated user
   * @returns Updated order
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update order',
    description: 'Update order status, payment status, tracking number, etc. Admin only or order owner.',
  })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.orderService.update(id, updateOrderDto, currentUser);
  }
}

