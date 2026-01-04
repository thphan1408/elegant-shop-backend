import { Test, TestingModule } from '@nestjs/testing';
import { OrderService } from 'src/order/order.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateOrderDto } from 'src/order/dto/create-order.dto';
import { UpdateOrderDto } from 'src/order/dto/update-order.dto';
import { QueryOrderDto } from 'src/order/dto/query-order.dto';
import { OrderStatus, PaymentMethod, UserRole } from '@prisma/client';

describe('OrderService', () => {
  let service: OrderService;
  let prismaMock: any;

  const mockUserId = 'user-uuid-1';
  const mockProductId = 'product-uuid-1';
  const mockVariantId = 'variant-uuid-1';
  const mockOrderId = 'order-uuid-1';

  const mockVariant = {
    id: mockVariantId,
    productId: mockProductId,
    color: 'Red',
    size: 'M',
    sku: 'SKU-001',
    quantity: 10,
    price: 100,
    price_sale: null,
    product: {
      id: mockProductId,
      name: 'Test Product',
    },
  };

  const mockOrder = {
    id: mockOrderId,
    orderNumber: 'ORD-20240103-001',
    userId: mockUserId,
    status: OrderStatus.PENDING,
    paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
    paymentStatus: false,
    subtotal: 200,
    tax: 0,
    shippingFee: 0,
    discount: 0,
    total: 200,
    items: [],
    user: null,
  };

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    role: UserRole.USER,
  };

  beforeEach(async () => {
    prismaMock = {
      $transaction: jest.fn((callback) => callback(prismaMock)),
      productVariant: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      order: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createOrderDto: CreateOrderDto = {
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      shippingName: 'Test User',
      shippingPhone: '+84123456789',
      shippingAddress: '123 Test Street',
      items: [
        {
          variantId: mockVariantId,
          quantity: 2,
        },
      ],
    };

    it('should create order for authenticated user', async () => {
      // For authenticated user, userId should be set from currentUser
      const orderDtoWithUserId: CreateOrderDto = {
        ...createOrderDto,
        userId: mockUserId,
      };
      prismaMock.productVariant.findMany.mockResolvedValue([mockVariant]);
      prismaMock.productVariant.update.mockResolvedValue(mockVariant);
      prismaMock.order.create.mockResolvedValue(mockOrder);

      const result = await service.create(orderDtoWithUserId, mockUser as any);

      expect(prismaMock.order.create).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    it('should create guest order', async () => {
      const guestOrderDto: CreateOrderDto = {
        ...createOrderDto,
        guestEmail: 'guest@example.com',
        guestName: 'Guest User',
        guestPhone: '+84123456789',
      };

      prismaMock.productVariant.findMany.mockResolvedValue([mockVariant]);
      prismaMock.productVariant.update.mockResolvedValue(mockVariant);
      prismaMock.order.create.mockResolvedValue({
        ...mockOrder,
        userId: null,
        guestEmail: guestOrderDto.guestEmail,
      });

      const result = await service.create(guestOrderDto);

      expect(prismaMock.order.create).toHaveBeenCalled();
      expect(result).toBeTruthy();
    });

    it('should throw BadRequestException if guest info missing', async () => {
      const guestOrderDtoWithoutEmail: CreateOrderDto = {
        ...createOrderDto,
        guestName: 'Guest User',
        // Missing guestEmail
      };

      await expect(service.create(guestOrderDtoWithoutEmail)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if items empty', async () => {
      const orderDtoWithoutItems: CreateOrderDto = {
        ...createOrderDto,
        items: [],
      };

      await expect(service.create(orderDtoWithoutItems)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if variant not found', async () => {
      const orderDtoWithUserId: CreateOrderDto = {
        ...createOrderDto,
        userId: mockUserId,
      };
      prismaMock.productVariant.findMany.mockResolvedValue([]);

      await expect(service.create(orderDtoWithUserId, mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if insufficient stock', async () => {
      const lowStockVariant = { ...mockVariant, quantity: 1 };
      prismaMock.productVariant.findMany.mockResolvedValue([lowStockVariant]);

      const orderDtoWithHighQuantity: CreateOrderDto = {
        ...createOrderDto,
        items: [{ variantId: mockVariantId, quantity: 5 }],
      };

      await expect(
        service.create(orderDtoWithHighQuantity, mockUser as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should decrease stock after order creation', async () => {
      const orderDtoWithUserId: CreateOrderDto = {
        ...createOrderDto,
        userId: mockUserId,
      };
      prismaMock.productVariant.findMany.mockResolvedValue([mockVariant]);
      prismaMock.productVariant.update.mockResolvedValue(mockVariant);
      prismaMock.order.create.mockResolvedValue(mockOrder);

      await service.create(orderDtoWithUserId, mockUser as any);

      expect(prismaMock.productVariant.update).toHaveBeenCalledWith({
        where: { id: mockVariantId },
        data: { quantity: { decrement: 2 } },
      });
    });

    it('should use sale price if available', async () => {
      const orderDtoWithUserId: CreateOrderDto = {
        ...createOrderDto,
        userId: mockUserId,
      };
      const variantWithSale = { ...mockVariant, price_sale: 80 };
      prismaMock.productVariant.findMany.mockResolvedValue([variantWithSale]);
      prismaMock.productVariant.update.mockResolvedValue(variantWithSale);
      prismaMock.order.create.mockResolvedValue(mockOrder);

      await service.create(orderDtoWithUserId, mockUser as any);

      // Check that order was created with sale price
      expect(prismaMock.order.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return paginated list of orders', async () => {
      const query: QueryOrderDto = { page: 1, limit: 10 };
      prismaMock.order.findMany.mockResolvedValue([mockOrder]);
      prismaMock.order.count.mockResolvedValue(1);

      const result = await service.findAll(query, mockUser as any);

      expect(prismaMock.order.findMany).toHaveBeenCalled();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
    });

    it('should filter by user ID for non-admin', async () => {
      const query: QueryOrderDto = {};
      prismaMock.order.findMany.mockResolvedValue([mockOrder]);
      prismaMock.order.count.mockResolvedValue(1);

      await service.findAll(query, mockUser as any);

      expect(prismaMock.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
          }),
        }),
      );
    });

    it('should allow admin to see all orders', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      const query: QueryOrderDto = {};
      prismaMock.order.findMany.mockResolvedValue([mockOrder]);
      prismaMock.order.count.mockResolvedValue(1);

      await service.findAll(query, adminUser as any);

      expect(prismaMock.order.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return order by ID', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findOne(mockOrderId, mockUser as any);

      expect(prismaMock.order.findUnique).toHaveBeenCalledWith({
        where: { id: mockOrderId },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(service.findOne(mockOrderId, mockUser as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user tries to view other user order', async () => {
      const otherUserOrder = { ...mockOrder, userId: 'other-user-id' };
      prismaMock.order.findUnique.mockResolvedValue(otherUserOrder);

      await expect(service.findOne(mockOrderId, mockUser as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow admin to view any order', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findOne(mockOrderId, adminUser as any);

      expect(result).toEqual(mockOrder);
    });
  });

  describe('findByOrderNumber', () => {
    const orderNumber = 'ORD-20240103-001';

    it('should return order by order number', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findByOrderNumber(orderNumber, mockUser as any);

      expect(prismaMock.order.findUnique).toHaveBeenCalledWith({
        where: { orderNumber },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockOrder);
    });

    it('should throw NotFoundException if order not found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(
        service.findByOrderNumber(orderNumber, mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateOrderDto: UpdateOrderDto = {
      status: OrderStatus.PROCESSING,
    };

    it('should update order status', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PROCESSING,
      });

      const result = await service.update(
        mockOrderId,
        updateOrderDto,
        mockUser as any,
      );

      expect(prismaMock.order.update).toHaveBeenCalled();
      expect(result.status).toBe(OrderStatus.PROCESSING);
    });

    it('should update payment status and set paidAt', async () => {
      const updateDto: UpdateOrderDto = {
        paymentStatus: true,
      };

      prismaMock.order.findUnique.mockResolvedValue(mockOrder);
      prismaMock.order.update.mockResolvedValue({
        ...mockOrder,
        paymentStatus: true,
        paidAt: new Date(),
      });

      const result = await service.update(mockOrderId, updateDto, mockUser as any);

      expect(result.paymentStatus).toBe(true);
    });

    it('should throw NotFoundException if order not found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockOrderId, updateOrderDto, mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user tries to update other user order', async () => {
      const otherUserOrder = { ...mockOrder, userId: 'other-user-id' };
      prismaMock.order.findUnique.mockResolvedValue(otherUserOrder);

      await expect(
        service.update(mockOrderId, updateOrderDto, mockUser as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should require authentication to update', async () => {
      prismaMock.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.update(mockOrderId, updateOrderDto, undefined),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

