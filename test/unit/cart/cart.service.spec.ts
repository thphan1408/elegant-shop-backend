import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from 'src/cart/cart.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AddCartItemDto } from 'src/cart/dto/add-cart-item.dto';
import { UpdateCartItemDto } from 'src/cart/dto/update-cart-item.dto';
import { UserRole } from '@prisma/client';

describe('CartService', () => {
  let service: CartService;
  let prismaMock: any;

  const mockUserId = 'user-uuid-1';
  const mockGuestId = 'guest-uuid-1';
  const mockCartId = 'cart-uuid-1';
  const mockVariantId = 'variant-uuid-1';
  const mockItemId = 'item-uuid-1';

  const mockVariant = {
    id: mockVariantId,
    productId: 'product-uuid-1',
    color: 'Red',
    size: 'M',
    sku: 'SKU-001',
    quantity: 10,
    price: 100,
    price_sale: null,
    product: { id: 'product-uuid-1', name: 'Test Product', images: [] },
  };

  const mockCart = {
    id: mockCartId,
    userId: mockUserId,
    guestId: null,
  };

  const mockGuestCart = {
    id: 'guest-cart-uuid-1',
    userId: null,
    guestId: mockGuestId,
  };

  const mockCartItem = {
    id: mockItemId,
    cartId: mockCartId,
    variantId: mockVariantId,
    quantity: 2,
    variant: mockVariant,
  };

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    role: UserRole.USER,
  };

  beforeEach(async () => {
    prismaMock = {
      cart: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      cartItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      productVariant: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should return an empty cart when there is no identity', async () => {
      const result = await service.getCart(undefined, undefined);

      expect(result).toEqual({
        id: null,
        userId: null,
        guestId: null,
        items: [],
        subtotal: 0,
        itemCount: 0,
      });
      expect(prismaMock.cart.findUnique).not.toHaveBeenCalled();
    });

    it('should return an empty cart when none exists yet for the identity', async () => {
      prismaMock.cart.findUnique.mockResolvedValue(null);

      const result = await service.getCart(mockUserId, undefined);

      expect(result.items).toEqual([]);
      expect(result.subtotal).toBe(0);
    });

    it('should compute subtotal and itemCount from live variant prices', async () => {
      prismaMock.cart.findUnique.mockResolvedValue(mockCart);
      prismaMock.cartItem.findMany.mockResolvedValue([mockCartItem]);

      const result = await service.getCart(mockUserId, undefined);

      expect(result.itemCount).toBe(2);
      expect(result.subtotal).toBe(200);
      expect(result.items[0].unitPrice).toBe(100);
    });

    it('should use sale price when available', async () => {
      const saleItem = {
        ...mockCartItem,
        variant: { ...mockVariant, price_sale: 80 },
      };
      prismaMock.cart.findUnique.mockResolvedValue(mockCart);
      prismaMock.cartItem.findMany.mockResolvedValue([saleItem]);

      const result = await service.getCart(mockUserId, undefined);

      expect(result.items[0].unitPrice).toBe(80);
      expect(result.subtotal).toBe(160);
    });
  });

  describe('addItem', () => {
    const dto: AddCartItemDto = { variantId: mockVariantId, quantity: 2 };

    it('should throw BadRequestException when neither user nor guest identity is given', async () => {
      await expect(service.addItem(dto, undefined, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create the cart and add a new item', async () => {
      prismaMock.cart.findUnique.mockResolvedValue(null);
      prismaMock.cart.create.mockResolvedValue(mockCart);
      prismaMock.productVariant.findUnique.mockResolvedValue(mockVariant);
      prismaMock.cartItem.findUnique.mockResolvedValue(null);
      prismaMock.cartItem.upsert.mockResolvedValue(mockCartItem);
      prismaMock.cartItem.findMany.mockResolvedValue([mockCartItem]);

      await service.addItem(dto, mockUserId, undefined);

      expect(prismaMock.cart.create).toHaveBeenCalledWith({
        data: { userId: mockUserId },
      });
      expect(prismaMock.cartItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { cartId: mockCartId, variantId: mockVariantId, quantity: 2 },
          update: { quantity: 2 },
        }),
      );
    });

    it('should create a guest cart via guestId when no user is authenticated', async () => {
      prismaMock.cart.findUnique.mockResolvedValue(null);
      prismaMock.cart.create.mockResolvedValue(mockGuestCart);
      prismaMock.productVariant.findUnique.mockResolvedValue(mockVariant);
      prismaMock.cartItem.findUnique.mockResolvedValue(null);
      prismaMock.cartItem.upsert.mockResolvedValue(mockCartItem);
      prismaMock.cartItem.findMany.mockResolvedValue([]);

      await service.addItem(dto, undefined, mockGuestId);

      expect(prismaMock.cart.create).toHaveBeenCalledWith({
        data: { guestId: mockGuestId },
      });
    });

    it('should bump quantity when the variant is already in the cart', async () => {
      prismaMock.cart.findUnique.mockResolvedValue(mockCart);
      prismaMock.productVariant.findUnique.mockResolvedValue(mockVariant);
      prismaMock.cartItem.findUnique.mockResolvedValue(mockCartItem); // existing qty 2
      prismaMock.cartItem.upsert.mockResolvedValue({
        ...mockCartItem,
        quantity: 4,
      });
      prismaMock.cartItem.findMany.mockResolvedValue([
        { ...mockCartItem, quantity: 4 },
      ]);

      await service.addItem(dto, mockUserId, undefined);

      expect(prismaMock.cartItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { quantity: 4 } }),
      );
    });

    it('should throw NotFoundException if variant does not exist', async () => {
      prismaMock.cart.findUnique.mockResolvedValue(mockCart);
      prismaMock.productVariant.findUnique.mockResolvedValue(null);

      await expect(service.addItem(dto, mockUserId, undefined)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when requested quantity exceeds stock', async () => {
      const lowStockVariant = { ...mockVariant, quantity: 1 };
      prismaMock.cart.findUnique.mockResolvedValue(mockCart);
      prismaMock.productVariant.findUnique.mockResolvedValue(lowStockVariant);
      prismaMock.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.addItem(
          { variantId: mockVariantId, quantity: 5 },
          mockUserId,
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.cartItem.upsert).not.toHaveBeenCalled();
    });
  });

  describe('updateItem', () => {
    const dto: UpdateCartItemDto = { quantity: 3 };

    it('should throw NotFoundException if the cart does not exist', async () => {
      prismaMock.cart.findUnique.mockResolvedValue(null);

      await expect(
        service.updateItem(mockItemId, dto, mockUserId, undefined),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if the item does not exist', async () => {
      prismaMock.cart.findUnique.mockResolvedValue(mockCart);
      prismaMock.cartItem.findUnique.mockResolvedValue(null);

      await expect(
        service.updateItem(mockItemId, dto, mockUserId, undefined),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if the item belongs to a different cart', async () => {
      prismaMock.cart.findUnique.mockResolvedValue(mockCart);
      prismaMock.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        cartId: 'someone-elses-cart',
      });

      await expect(
        service.updateItem(mockItemId, dto, mockUserId, undefined),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when new quantity exceeds stock', async () => {
      prismaMock.cart.findUnique.mockResolvedValue(mockCart);
      prismaMock.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        variant: { ...mockVariant, quantity: 2 },
      });

      await expect(
        service.updateItem(mockItemId, { quantity: 5 }, mockUserId, undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update quantity when valid and owned', async () => {
      prismaMock.cart.findUnique.mockResolvedValue(mockCart);
      prismaMock.cartItem.findUnique.mockResolvedValue(mockCartItem);
      prismaMock.cartItem.update.mockResolvedValue({
        ...mockCartItem,
        quantity: 3,
      });
      prismaMock.cartItem.findMany.mockResolvedValue([
        { ...mockCartItem, quantity: 3 },
      ]);

      await service.updateItem(mockItemId, dto, mockUserId, undefined);

      expect(prismaMock.cartItem.update).toHaveBeenCalledWith({
        where: { id: mockItemId },
        data: { quantity: 3 },
      });
    });
  });

  describe('removeItem', () => {
    it('should throw ForbiddenException if the item belongs to a different cart', async () => {
      prismaMock.cart.findUnique.mockResolvedValue(mockCart);
      prismaMock.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        cartId: 'someone-elses-cart',
      });

      await expect(
        service.removeItem(mockItemId, mockUserId, undefined),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.cartItem.delete).not.toHaveBeenCalled();
    });

    it('should delete the item when owned', async () => {
      prismaMock.cart.findUnique.mockResolvedValue(mockCart);
      prismaMock.cartItem.findUnique.mockResolvedValue(mockCartItem);
      prismaMock.cartItem.delete.mockResolvedValue(mockCartItem);
      prismaMock.cartItem.findMany.mockResolvedValue([]);

      await service.removeItem(mockItemId, mockUserId, undefined);

      expect(prismaMock.cartItem.delete).toHaveBeenCalledWith({
        where: { id: mockItemId },
      });
    });
  });

  describe('clearCart', () => {
    it('should no-op and return an empty cart if none exists', async () => {
      prismaMock.cart.findUnique.mockResolvedValue(null);

      const result = await service.clearCart(mockUserId, undefined);

      expect(prismaMock.cartItem.deleteMany).not.toHaveBeenCalled();
      expect(result.items).toEqual([]);
    });

    it('should delete all items for an existing cart', async () => {
      prismaMock.cart.findUnique.mockResolvedValue(mockCart);
      prismaMock.cartItem.deleteMany.mockResolvedValue({ count: 2 });
      prismaMock.cartItem.findMany.mockResolvedValue([]);

      await service.clearCart(mockUserId, undefined);

      expect(prismaMock.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: mockCartId },
      });
    });
  });

  describe('mergeGuestCart', () => {
    it('should return the (empty) user cart if the guest cart does not exist', async () => {
      prismaMock.cart.findUnique
        .mockResolvedValueOnce(null) // guest cart lookup
        .mockResolvedValueOnce(null); // user cart lookup in resolveCart

      const result = await service.mergeGuestCart(mockGuestId, mockUser as any);

      expect(prismaMock.cart.delete).not.toHaveBeenCalled();
      expect(result.items).toEqual([]);
    });

    it('should sum overlapping variant quantities capped at stock, then delete the guest cart', async () => {
      const guestCartWithItems = {
        ...mockGuestCart,
        items: [
          {
            ...mockCartItem,
            cartId: mockGuestCart.id,
            quantity: 3,
            variant: mockVariant,
          },
        ],
      };

      prismaMock.cart.findUnique
        .mockResolvedValueOnce(guestCartWithItems) // guest cart lookup (with items)
        .mockResolvedValueOnce(mockCart); // user cart lookup in resolveCart
      prismaMock.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        quantity: 2,
      }); // existing user item
      prismaMock.cartItem.upsert.mockResolvedValue({
        ...mockCartItem,
        quantity: 5,
      });
      prismaMock.cart.delete.mockResolvedValue(guestCartWithItems);
      prismaMock.cartItem.findMany.mockResolvedValue([
        { ...mockCartItem, quantity: 5 },
      ]);

      await service.mergeGuestCart(mockGuestId, mockUser as any);

      // existing 2 + guest 3 = 5, within stock of 10
      expect(prismaMock.cartItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { quantity: 5 } }),
      );
      expect(prismaMock.cart.delete).toHaveBeenCalledWith({
        where: { id: mockGuestCart.id },
      });
    });

    it('should cap merged quantity at current stock', async () => {
      const lowStockVariant = { ...mockVariant, quantity: 4 };
      const guestCartWithItems = {
        ...mockGuestCart,
        items: [
          {
            ...mockCartItem,
            cartId: mockGuestCart.id,
            quantity: 3,
            variant: lowStockVariant,
          },
        ],
      };

      prismaMock.cart.findUnique
        .mockResolvedValueOnce(guestCartWithItems)
        .mockResolvedValueOnce(mockCart);
      prismaMock.cartItem.findUnique.mockResolvedValue({
        ...mockCartItem,
        quantity: 2,
      });
      prismaMock.cartItem.upsert.mockResolvedValue({
        ...mockCartItem,
        quantity: 4,
      });
      prismaMock.cart.delete.mockResolvedValue(guestCartWithItems);
      prismaMock.cartItem.findMany.mockResolvedValue([
        { ...mockCartItem, quantity: 4 },
      ]);

      await service.mergeGuestCart(mockGuestId, mockUser as any);

      // existing 2 + guest 3 = 5, but stock is only 4 -> capped
      expect(prismaMock.cartItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: { quantity: 4 } }),
      );
    });
  });
});
