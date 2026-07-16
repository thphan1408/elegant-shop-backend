import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
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
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { MergeCartDto } from './dto/merge-cart.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Cart')
@ApiHeader({
  name: 'X-Guest-Id',
  required: false,
  description:
    'Client-generated UUID identifying an anonymous cart. Ignored when a valid Bearer token is sent.',
})
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  /**
   * Get the current cart (authenticated user or guest via X-Guest-Id).
   * Returns an empty cart if no identity is resolvable or no cart exists yet.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get current cart' })
  @ApiResponse({
    status: 200,
    description: 'Current cart with live prices/totals',
  })
  getCart(
    @CurrentUser() currentUser?: User,
    @Headers('x-guest-id') guestId?: string,
  ) {
    return this.cartService.getCart(currentUser?.id, guestId);
  }

  /**
   * Add an item to the cart (creates the cart on first use).
   */
  @Post('items')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add an item to the cart' })
  @ApiResponse({
    status: 201,
    description: 'Item added, updated cart returned',
  })
  @ApiResponse({
    status: 400,
    description: 'Insufficient stock or missing identity',
  })
  @ApiResponse({ status: 404, description: 'Product variant not found' })
  addItem(
    @Body() dto: AddCartItemDto,
    @CurrentUser() currentUser?: User,
    @Headers('x-guest-id') guestId?: string,
  ) {
    return this.cartService.addItem(dto, currentUser?.id, guestId);
  }

  /**
   * Set the absolute quantity of an existing cart item.
   */
  @Patch('items/:itemId')
  @Public()
  @ApiOperation({ summary: 'Update a cart item quantity' })
  @ApiResponse({ status: 200, description: 'Updated cart returned' })
  @ApiResponse({
    status: 403,
    description: 'Item does not belong to your cart',
  })
  @ApiResponse({ status: 404, description: 'Cart or item not found' })
  updateItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() currentUser?: User,
    @Headers('x-guest-id') guestId?: string,
  ) {
    return this.cartService.updateItem(itemId, dto, currentUser?.id, guestId);
  }

  /**
   * Remove a single item from the cart.
   */
  @Delete('items/:itemId')
  @Public()
  @ApiOperation({ summary: 'Remove an item from the cart' })
  @ApiResponse({ status: 200, description: 'Updated cart returned' })
  @ApiResponse({
    status: 403,
    description: 'Item does not belong to your cart',
  })
  @ApiResponse({ status: 404, description: 'Cart or item not found' })
  removeItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() currentUser?: User,
    @Headers('x-guest-id') guestId?: string,
  ) {
    return this.cartService.removeItem(itemId, currentUser?.id, guestId);
  }

  /**
   * Remove all items from the cart.
   */
  @Delete()
  @Public()
  @ApiOperation({ summary: 'Clear the cart' })
  @ApiResponse({ status: 200, description: 'Empty cart returned' })
  clearCart(
    @CurrentUser() currentUser?: User,
    @Headers('x-guest-id') guestId?: string,
  ) {
    return this.cartService.clearCart(currentUser?.id, guestId);
  }

  /**
   * Merge a guest cart into the current authenticated user's cart.
   * Call right after a successful login/register.
   */
  @Post('merge')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Merge a guest cart into the authenticated user cart',
    description:
      'Call right after login/register with the guest cart id that was used pre-auth. Overlapping variant quantities are summed and capped at stock.',
  })
  @ApiResponse({ status: 201, description: 'Merged cart returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  merge(@Body() dto: MergeCartDto, @CurrentUser() currentUser: User) {
    return this.cartService.mergeGuestCart(dto.guestId, currentUser.id);
  }
}
