import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import type { Cart, User } from '@prisma/client';

const CART_ITEM_INCLUDE = {
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
} as const;

/**
 * Shape returned to clients: live-computed prices/totals, never persisted
 * (unlike OrderItem, which snapshots price at order time on purpose).
 */
type CartView = {
  id: string | null;
  userId: string | null;
  guestId: string | null;
  items: Array<{
    id: string;
    variantId: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    variant: unknown;
  }>;
  subtotal: number;
  itemCount: number;
};

const EMPTY_CART: CartView = {
  id: null,
  userId: null,
  guestId: null,
  items: [],
  subtotal: 0,
  itemCount: 0,
};

@Injectable()
export class CartService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Resolve the cart belonging to a user or guest identity.
   * @param userId - Current authenticated user ID, if any
   * @param guestId - Client-supplied guest cart ID (X-Guest-Id header), if any
   * @param createIfMissing - Create a new cart if none exists yet
   * @throws BadRequestException if neither identity is provided
   */
  private async resolveCart(
    userId?: string,
    guestId?: string,
    createIfMissing = false,
  ): Promise<Cart | null> {
    if (!userId && !guestId) {
      if (createIfMissing) {
        throw new BadRequestException(
          'Missing identity: authenticate or provide an X-Guest-Id header to use the cart',
        );
      }
      return null;
    }

    const cart = await this.prismaService.cart.findUnique({
      where: userId ? { userId } : { guestId },
    });

    if (cart) {
      return cart;
    }

    if (!createIfMissing) {
      return null;
    }

    return this.prismaService.cart.create({
      data: userId ? { userId } : { guestId },
    });
  }

  /**
   * Build the client-facing cart view (live prices/totals) for a given cart.
   * @param cart - Resolved cart row, or null for an empty/non-existent cart
   */
  private async toCartView(cart: Cart | null): Promise<CartView> {
    if (!cart) {
      return EMPTY_CART;
    }

    const items = await this.prismaService.cartItem.findMany({
      where: { cartId: cart.id },
      include: CART_ITEM_INCLUDE,
      orderBy: { created_at: 'asc' },
    });

    let subtotal = 0;
    let itemCount = 0;

    const viewItems = items.map((item) => {
      const unitPrice = item.variant.price_sale ?? item.variant.price;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;
      itemCount += item.quantity;

      return {
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
        variant: item.variant,
      };
    });

    return {
      id: cart.id,
      userId: cart.userId,
      guestId: cart.guestId,
      items: viewItems,
      subtotal,
      itemCount,
    };
  }

  /**
   * Get the current cart. Returns an empty (non-persisted) cart if the
   * caller has no resolvable identity, or no cart exists yet.
   */
  async getCart(userId?: string, guestId?: string): Promise<CartView> {
    if (!userId && !guestId) {
      return EMPTY_CART;
    }
    const cart = await this.resolveCart(userId, guestId, false);
    return this.toCartView(cart);
  }

  /**
   * Add an item to the cart (creates the cart on first use).
   * Increments quantity if the variant is already in the cart.
   * @throws NotFoundException if the variant doesn't exist
   * @throws BadRequestException if requested quantity exceeds stock
   */
  async addItem(
    dto: AddCartItemDto,
    userId?: string,
    guestId?: string,
  ): Promise<CartView> {
    const cart = await this.resolveCart(userId, guestId, true);
    if (!cart) {
      throw new BadRequestException(
        'Missing identity: authenticate or provide an X-Guest-Id header to use the cart',
      );
    }

    const variant = await this.prismaService.productVariant.findUnique({
      where: { id: dto.variantId },
    });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    const existing = await this.prismaService.cartItem.findUnique({
      where: {
        cartId_variantId: { cartId: cart.id, variantId: dto.variantId },
      },
    });
    const nextQuantity = (existing?.quantity ?? 0) + dto.quantity;

    if (nextQuantity > variant.quantity) {
      throw new BadRequestException(
        `Insufficient stock for variant ${variant.sku}. Available: ${variant.quantity}, Requested: ${nextQuantity}`,
      );
    }

    await this.prismaService.cartItem.upsert({
      where: {
        cartId_variantId: { cartId: cart.id, variantId: dto.variantId },
      },
      create: {
        cartId: cart.id,
        variantId: dto.variantId,
        quantity: dto.quantity,
      },
      update: { quantity: nextQuantity },
    });

    return this.toCartView(cart);
  }

  /**
   * Set the absolute quantity of an existing cart item.
   * @throws NotFoundException if the cart or item doesn't exist
   * @throws ForbiddenException if the item doesn't belong to the caller's cart
   * @throws BadRequestException if requested quantity exceeds stock
   */
  async updateItem(
    itemId: string,
    dto: UpdateCartItemDto,
    userId?: string,
    guestId?: string,
  ): Promise<CartView> {
    const cart = await this.resolveCart(userId, guestId, false);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = await this.prismaService.cartItem.findUnique({
      where: { id: itemId },
      include: { variant: true },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    if (item.cartId !== cart.id) {
      throw new ForbiddenException('This item does not belong to your cart');
    }

    if (dto.quantity > item.variant.quantity) {
      throw new BadRequestException(
        `Insufficient stock for variant ${item.variant.sku}. Available: ${item.variant.quantity}, Requested: ${dto.quantity}`,
      );
    }

    await this.prismaService.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.toCartView(cart);
  }

  /**
   * Remove a single item from the cart.
   * @throws NotFoundException if the cart or item doesn't exist
   * @throws ForbiddenException if the item doesn't belong to the caller's cart
   */
  async removeItem(
    itemId: string,
    userId?: string,
    guestId?: string,
  ): Promise<CartView> {
    const cart = await this.resolveCart(userId, guestId, false);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const item = await this.prismaService.cartItem.findUnique({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    if (item.cartId !== cart.id) {
      throw new ForbiddenException('This item does not belong to your cart');
    }

    await this.prismaService.cartItem.delete({ where: { id: itemId } });

    return this.toCartView(cart);
  }

  /**
   * Remove all items from the cart. No-op if the cart doesn't exist.
   */
  async clearCart(userId?: string, guestId?: string): Promise<CartView> {
    const cart = await this.resolveCart(userId, guestId, false);
    if (!cart) {
      return EMPTY_CART;
    }

    await this.prismaService.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.toCartView(cart);
  }

  /**
   * Merge a guest cart into the authenticated user's cart (called right
   * after login/register). Quantities of overlapping variants are summed
   * and capped at current stock. The guest cart is deleted afterward.
   * @throws BadRequestException if requested quantity exceeds stock isn't hit (capped instead)
   */
  async mergeGuestCart(guestId: string, currentUser: User): Promise<CartView> {
    const guestCart = await this.prismaService.cart.findUnique({
      where: { guestId },
      include: { items: { include: { variant: true } } },
    });

    if (!guestCart || guestCart.items.length === 0) {
      const userCart = await this.resolveCart(currentUser.id, undefined, false);
      return this.toCartView(userCart);
    }

    const userCart = await this.resolveCart(currentUser.id, undefined, true);
    if (!userCart) {
      throw new BadRequestException('Unable to resolve user cart');
    }

    for (const guestItem of guestCart.items) {
      const existing = await this.prismaService.cartItem.findUnique({
        where: {
          cartId_variantId: {
            cartId: userCart.id,
            variantId: guestItem.variantId,
          },
        },
      });
      const mergedQuantity = Math.min(
        (existing?.quantity ?? 0) + guestItem.quantity,
        guestItem.variant.quantity,
      );

      if (mergedQuantity <= 0) {
        continue;
      }

      await this.prismaService.cartItem.upsert({
        where: {
          cartId_variantId: {
            cartId: userCart.id,
            variantId: guestItem.variantId,
          },
        },
        create: {
          cartId: userCart.id,
          variantId: guestItem.variantId,
          quantity: mergedQuantity,
        },
        update: { quantity: mergedQuantity },
      });
    }

    await this.prismaService.cart.delete({ where: { id: guestCart.id } });

    return this.toCartView(userCart);
  }
}
