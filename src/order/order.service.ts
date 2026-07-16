import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { OrderStatus, PaymentMethod, UserRole } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { NotificationService } from 'src/notification/notification.service';
import { EmailTemplateType } from 'src/notification/dto/send-email.dto';
import { CartService } from 'src/cart/cart.service';

/**
 * Tập con các trường của Order mà các email cần đến.
 * Dùng structural typing: truyền cả object order (giàu hơn) vào vẫn hợp lệ.
 */
type OrderEmailPayload = {
  orderNumber: string;
  status: OrderStatus;
  total: number;
  notes: string | null;
  guestEmail: string | null;
  guestName: string | null;
  user: { email: string; name: string | null } | null;
  items?: Array<{ productName: string; quantity: number; unitPrice: number }>;
};

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly cartService: CartService,
  ) {}

  /**
   * Checkout: create an order from the caller's server-side cart, then clear it.
   * Items come from the cart (not the client), so the request only carries
   * shipping/payment/guest info. Delegates to create() for stock re-validation,
   * price snapshotting, stock decrement and the confirmation email.
   * @param dto - Shipping/payment/guest data (no items)
   * @param currentUser - Authenticated user, if any
   * @param guestId - Guest cart id (X-Guest-Id header) for anonymous checkout
   * @throws BadRequestException if the cart is empty
   */
  async checkout(dto: CheckoutDto, currentUser?: User, guestId?: string) {
    const cart = await this.cartService.getCart(currentUser?.id, guestId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    const items = cart.items.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
    }));

    // Reuse the battle-tested create(): it re-checks stock inside a transaction,
    // so anything sold out since the item was added to the cart fails here and
    // no order (and no cart clear) happens — the customer keeps their cart.
    const order = await this.create({ ...dto, items }, currentUser);

    // Order committed successfully -> empty the cart. Best-effort: a failure to
    // clear must not fail the response, since the order already exists.
    try {
      await this.cartService.clearCart(currentUser?.id, guestId);
    } catch (error) {
      this.logger.warn(
        `Order ${order.orderNumber} placed but failed to clear cart: ${(error as Error).message}`,
      );
    }

    return order;
  }

  /**
   * Generate unique order number
   * Format: ORD-YYYYMMDD-XXX (where XXX is a random 3-digit number)
   * @returns Unique order number string
   */
  private generateOrderNumber(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${dateStr}-${random}`;
  }

  /**
   * Create a new order (supports both authenticated users and guests)
   * ADMIN and MODERATOR roles cannot create orders (they can only view products)
   * @param createOrderDto - Order data including items and shipping information
   * @param currentUser - Current authenticated user (optional for guest checkout)
   * @returns Created order with items and user information
   * @throws ForbiddenException if ADMIN/MODERATOR tries to create order
   * @throws BadRequestException if invalid data or insufficient stock
   * @throws NotFoundException if product variant not found
   */
  async create(createOrderDto: CreateOrderDto, currentUser?: User) {
    // ADMIN and MODERATOR cannot create orders - they are staff, not customers
    if (currentUser) {
      if (
        currentUser.role === UserRole.ADMIN ||
        currentUser.role === UserRole.MODERATOR
      ) {
        throw new ForbiddenException(
          'ADMIN and MODERATOR roles cannot create orders. Only USER and GUEST can place orders.',
        );
      }
    }

    // Determine the userId to use
    let userId: string | null = null;

    if (createOrderDto.userId) {
      // If userId is explicitly provided, validate it matches current user (unless admin)
      if (currentUser) {
        if (
          currentUser.role !== UserRole.ADMIN &&
          currentUser.id !== createOrderDto.userId
        ) {
          throw new ForbiddenException(
            'You can only create orders for yourself',
          );
        }
        userId = createOrderDto.userId;
      } else {
        throw new BadRequestException('Cannot specify userId for guest checkout');
      }
    } else if (currentUser) {
      // If no userId provided but user is authenticated, use current user's ID
      userId = currentUser.id;
    } else {
      // Guest checkout: email, name, phone are required
      if (!createOrderDto.guestEmail || !createOrderDto.guestName || !createOrderDto.guestPhone) {
        throw new BadRequestException(
          'Guest email, name, and phone are required for guest checkout',
        );
      }
    }

    // Validate items
    if (!createOrderDto.items || createOrderDto.items.length === 0) {
      throw new BadRequestException('Order must have at least one item');
    }

    // Start transaction
    const createdOrder = await this.prismaService.$transaction(async (tx) => {
      // Fetch all variants and validate
      const variantIds = createOrderDto.items.map((item) => item.variantId);
      const variants = await tx.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: { product: true },
      });

      if (variants.length !== variantIds.length) {
        throw new NotFoundException('One or more product variants not found');
      }

      // Validate stock and calculate prices
      const orderItems: Array<{
        variantId: string;
        productId: string;
        productName: string;
        variantColor: string;
        variantSize: string | null;
        sku: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
      }> = [];
      let subtotal = 0;

      for (const item of createOrderDto.items) {
        const variant = variants.find((v) => v.id === item.variantId);

        if (!variant) {
          throw new NotFoundException(`Variant ${item.variantId} not found`);
        }

        // Check stock
        if (variant.quantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for variant ${variant.sku}. Available: ${variant.quantity}, Requested: ${item.quantity}`,
          );
        }

        // Use sale price if available, otherwise regular price
        const unitPrice = variant.price_sale || variant.price;
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;

        orderItems.push({
          variantId: variant.id,
          productId: variant.productId,
          productName: variant.product.name,
          variantColor: variant.color,
          variantSize: variant.size,
          sku: variant.sku,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
        });

        // Decrease stock
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      // Calculate totals (simplified - adjust tax/shipping logic as needed)
      const tax = 0; // TODO: Calculate tax based on location
      const shippingFee = 0; // TODO: Calculate shipping based on location/weight
      const discount = 0; // TODO: Apply discount codes if needed
      const total = subtotal + tax + shippingFee - discount;

      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          userId: userId,
          guestEmail: userId ? null : createOrderDto.guestEmail,
          guestName: userId ? null : createOrderDto.guestName,
          guestPhone: userId ? null : createOrderDto.guestPhone,
          status: OrderStatus.PENDING,
          paymentMethod: createOrderDto.paymentMethod,
          paymentStatus: false,
          shippingName: createOrderDto.shippingName,
          shippingPhone: createOrderDto.shippingPhone,
          shippingAddress: createOrderDto.shippingAddress,
          shippingCity: createOrderDto.shippingCity || null,
          shippingState: createOrderDto.shippingState || null,
          shippingZip: createOrderDto.shippingZip || null,
          shippingCountry: createOrderDto.shippingCountry || 'Vietnam',
          subtotal,
          tax,
          shippingFee,
          discount,
          total,
          notes: createOrderDto.notes || null,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      images: true,
                    },
                  },
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      return order;
    });

    // Chỉ gửi email SAU khi transaction đã commit thành công (không gửi nếu rollback).
    this.dispatchOrderConfirmationEmail(createdOrder);

    return createdOrder;
  }

  /**
   * Get all orders with filters and pagination
   * @param query - Query parameters (page, limit, userId, status, etc.)
   * @param currentUser - Current authenticated user
   * @returns Paginated list of orders (users see only their orders, admins see all)
   */
  async findAll(query: QueryOrderDto, currentUser?: User) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.OrderWhereInput = {
      ...(query.userId && { userId: query.userId }),
      ...(query.guestEmail && { guestEmail: { contains: query.guestEmail, mode: 'insensitive' } }),
      ...(query.status && { status: query.status }),
      ...(query.paymentMethod && { paymentMethod: query.paymentMethod }),
      ...(query.paymentStatus !== undefined && { paymentStatus: query.paymentStatus }),
      ...(query.orderNumber && { orderNumber: { contains: query.orderNumber, mode: 'insensitive' } }),
    };

    // Non-admin users can only see their own orders
    if (currentUser && currentUser.role !== UserRole.ADMIN) {
      where.userId = currentUser.id;
    }

    const [orders, total] = await Promise.all([
      this.prismaService.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      images: true,
                    },
                  },
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prismaService.order.count({ where }),
    ]);

    return {
      data: orders,
      total,
      page,
      limit,
    };
  }

  /**
   * Get order by ID
   * @param id - Order ID (UUID)
   * @param currentUser - Current authenticated user
   * @returns Order details with items and user information
   * @throws NotFoundException if order not found
   * @throws ForbiddenException if user tries to view other user's order (unless admin)
   */
  async findOne(id: string, currentUser?: User) {
    const order = await this.prismaService.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Non-admin users can only view their own orders
    if (currentUser && currentUser.role !== UserRole.ADMIN) {
      if (order.userId !== currentUser.id) {
        throw new ForbiddenException('You can only view your own orders');
      }
    }

    return order;
  }

  /**
   * Get order by order number (public endpoint for order tracking)
   * @param orderNumber - Order number (format: ORD-YYYYMMDD-XXX)
   * @param currentUser - Current authenticated user (optional)
   * @returns Order details with items and user information
   * @throws NotFoundException if order not found
   * @throws ForbiddenException if user tries to view other user's order (unless admin)
   */
  async findByOrderNumber(orderNumber: string, currentUser?: User) {
    const order = await this.prismaService.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // For guest orders, allow access if they provide the email
    // For authenticated users, only allow if it's their order or they're admin
    if (currentUser) {
      if (currentUser.role !== UserRole.ADMIN && order.userId !== currentUser.id) {
        throw new ForbiddenException('You can only view your own orders');
      }
    }

    return order;
  }

  /**
   * Update order (admin only or owner for status updates)
   * @param id - Order ID (UUID)
   * @param updateOrderDto - Data to update (status, paymentStatus, trackingNumber, notes)
   * @param currentUser - Current authenticated user (required)
   * @returns Updated order with items and user information
   * @throws NotFoundException if order not found
   * @throws ForbiddenException if user doesn't have permission to update
   */
  async update(id: string, updateOrderDto: UpdateOrderDto, currentUser?: User) {
    const order = await this.prismaService.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Only admin can update orders, or user can update their own order status (limited)
    if (currentUser) {
      if (
        currentUser.role !== UserRole.ADMIN &&
        order.userId !== currentUser.id
      ) {
        throw new ForbiddenException('You can only update your own orders');
      }
    } else {
      throw new ForbiddenException('Authentication required to update orders');
    }

    // Prepare update data
    const updateData: Prisma.OrderUpdateInput = {
      ...(updateOrderDto.status && { status: updateOrderDto.status }),
      ...(updateOrderDto.paymentStatus !== undefined && {
        paymentStatus: updateOrderDto.paymentStatus,
        ...(updateOrderDto.paymentStatus && !order.paidAt && {
          paidAt: new Date(),
        }),
      }),
      ...(updateOrderDto.trackingNumber && {
        trackingNumber: updateOrderDto.trackingNumber,
      }),
      ...(updateOrderDto.notes && { notes: updateOrderDto.notes }),
      ...(updateOrderDto.status === OrderStatus.SHIPPED && !order.shippedAt && {
        shippedAt: new Date(),
      }),
      ...(updateOrderDto.status === OrderStatus.DELIVERED && !order.deliveredAt && {
        deliveredAt: new Date(),
      }),
    };

    const updatedOrder = await this.prismaService.order.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Chỉ báo khách khi trạng thái THỰC SỰ đổi (tránh spam khi chỉ sửa notes/tracking).
    if (updateOrderDto.status && updateOrderDto.status !== order.status) {
      this.dispatchOrderStatusUpdateEmail(updatedOrder);
    }

    return updatedOrder;
  }

  // ===== Helpers: gửi email theo sự kiện (fire-and-forget) =====

  /**
   * Xác định người nhận email của đơn hàng.
   * Đơn của user đã đăng nhập -> email tài khoản; đơn khách vãng lai -> guestEmail.
   * @returns { to, name } hoặc null nếu không có email để gửi.
   */
  private resolveOrderRecipient(
    order: OrderEmailPayload,
  ): { to: string; name?: string } | null {
    const to = order.user?.email ?? order.guestEmail;
    if (!to) {
      return null;
    }
    return { to, name: order.user?.name ?? order.guestName ?? undefined };
  }

  /**
   * Gửi email xác nhận đơn hàng. Không await, không để lỗi email làm hỏng luồng đặt hàng.
   */
  private dispatchOrderConfirmationEmail(order: OrderEmailPayload): void {
    const recipient = this.resolveOrderRecipient(order);
    if (!recipient) {
      return;
    }

    void this.notificationService
      .sendEmail({
        to: recipient.to,
        name: recipient.name,
        template: EmailTemplateType.ORDER_CONFIRMATION,
        context: {
          orderNumber: order.orderNumber,
          total: order.total,
          items: (order.items ?? []).map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.unitPrice,
          })),
        },
      })
      .catch((error: Error) => {
        this.logger.warn(
          `Failed to send order confirmation for ${order.orderNumber}: ${error.message}`,
        );
      });
  }

  /**
   * Gửi email thông báo cập nhật trạng thái đơn hàng (fire-and-forget).
   */
  private dispatchOrderStatusUpdateEmail(order: OrderEmailPayload): void {
    const recipient = this.resolveOrderRecipient(order);
    if (!recipient) {
      return;
    }

    void this.notificationService
      .sendEmail({
        to: recipient.to,
        name: recipient.name,
        template: EmailTemplateType.ORDER_STATUS_UPDATE,
        context: {
          orderNumber: order.orderNumber,
          status: order.status,
          notes: order.notes ?? undefined,
        },
      })
      .catch((error: Error) => {
        this.logger.warn(
          `Failed to send status update for ${order.orderNumber}: ${error.message}`,
        );
      });
  }
}

