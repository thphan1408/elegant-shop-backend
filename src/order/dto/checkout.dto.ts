import { OmitType } from '@nestjs/swagger';
import { CreateOrderDto } from './create-order.dto';

/**
 * Checkout reuses every field of CreateOrderDto EXCEPT `items` — the items are
 * taken from the caller's server-side cart, not sent by the client. Shipping,
 * payment and guest fields (plus their validation) are inherited unchanged.
 */
export class CheckoutDto extends OmitType(CreateOrderDto, ['items'] as const) {}
