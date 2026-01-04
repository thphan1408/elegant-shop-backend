import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from 'src/order/order.controller';
import { OrderService } from 'src/order/order.service';
import { CreateOrderDto } from 'src/order/dto/create-order.dto';
import { UpdateOrderDto } from 'src/order/dto/update-order.dto';
import { QueryOrderDto } from 'src/order/dto/query-order.dto';
import { OrderStatus, PaymentMethod, UserRole } from '@prisma/client';

describe('OrderController', () => {
  let controller: OrderController;
  let orderServiceMock: any;

  const mockOrder = {
    id: 'order-uuid-1',
    orderNumber: 'ORD-20240103-001',
    status: OrderStatus.PENDING,
    total: 200,
    items: [],
  };

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  beforeEach(async () => {
    orderServiceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByOrderNumber: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: orderServiceMock,
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
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
          variantId: 'variant-uuid-1',
          quantity: 2,
        },
      ],
    };

    it('should create order (guest checkout)', async () => {
      const guestOrderDto: CreateOrderDto = {
        ...createOrderDto,
        guestEmail: 'guest@example.com',
        guestName: 'Guest User',
        guestPhone: '+84123456789',
      };

      orderServiceMock.create.mockResolvedValue(mockOrder);

      const result = await controller.create(guestOrderDto);

      expect(orderServiceMock.create).toHaveBeenCalledWith(guestOrderDto, undefined);
      expect(result).toEqual(mockOrder);
    });

    it('should create order for authenticated user', async () => {
      orderServiceMock.create.mockResolvedValue(mockOrder);

      const result = await controller.create(createOrderDto, mockUser as any);

      expect(orderServiceMock.create).toHaveBeenCalledWith(createOrderDto, mockUser);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('findAll', () => {
    const query: QueryOrderDto = { page: 1, limit: 10 };

    it('should return list of orders', async () => {
      const mockResponse = {
        data: [mockOrder],
        total: 1,
        page: 1,
        limit: 10,
      };

      orderServiceMock.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(query, mockUser as any);

      expect(orderServiceMock.findAll).toHaveBeenCalledWith(query, mockUser);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findOne', () => {
    it('should return order by ID', async () => {
      orderServiceMock.findOne.mockResolvedValue(mockOrder);

      const result = await controller.findOne(mockOrder.id, mockUser as any);

      expect(orderServiceMock.findOne).toHaveBeenCalledWith(mockOrder.id, mockUser);
      expect(result).toEqual(mockOrder);
    });
  });

  describe('findByOrderNumber', () => {
    const orderNumber = 'ORD-20240103-001';

    it('should return order by order number (public)', async () => {
      orderServiceMock.findByOrderNumber.mockResolvedValue(mockOrder);

      const result = await controller.findByOrderNumber(orderNumber);

      expect(orderServiceMock.findByOrderNumber).toHaveBeenCalledWith(
        orderNumber,
        undefined,
      );
      expect(result).toEqual(mockOrder);
    });
  });

  describe('update', () => {
    const updateOrderDto: UpdateOrderDto = {
      status: OrderStatus.PROCESSING,
    };

    it('should update order', async () => {
      const updatedOrder = { ...mockOrder, status: OrderStatus.PROCESSING };
      orderServiceMock.update.mockResolvedValue(updatedOrder);

      const result = await controller.update(
        mockOrder.id,
        updateOrderDto,
        mockUser as any,
      );

      expect(orderServiceMock.update).toHaveBeenCalledWith(
        mockOrder.id,
        updateOrderDto,
        mockUser,
      );
      expect(result).toEqual(updatedOrder);
    });
  });
});

