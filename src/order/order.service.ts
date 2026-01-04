import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { OrderStatus, PaymentMethod, UserRole } from '@prisma/client';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private readonly prismaService: PrismaService) {}

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
    return this.prismaService.$transaction(async (tx) => {
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

    return updatedOrder;
  }
}

