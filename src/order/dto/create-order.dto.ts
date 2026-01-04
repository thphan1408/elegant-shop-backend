import {
  IsEmail,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'Product variant ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  variantId: string;

  @ApiProperty({
    description: 'Quantity of items',
    example: 2,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

export class CreateOrderDto {
  @ApiPropertyOptional({
    description: 'User ID (optional for guest checkout)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CASH_ON_DELIVERY,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Guest email (required if userId is not provided)',
    example: 'guest@example.com',
  })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiPropertyOptional({
    description: 'Guest name (required if userId is not provided)',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  guestName?: string;

  @ApiPropertyOptional({
    description: 'Guest phone (required if userId is not provided)',
    example: '+84123456789',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  guestPhone?: string;

  @ApiProperty({
    description: 'Shipping name',
    example: 'John Doe',
  })
  @IsString()
  @MaxLength(100)
  shippingName: string;

  @ApiProperty({
    description: 'Shipping phone',
    example: '+84123456789',
  })
  @IsString()
  @MaxLength(20)
  shippingPhone: string;

  @ApiProperty({
    description: 'Shipping address',
    example: '123 Main Street, District 1',
  })
  @IsString()
  @MaxLength(500)
  shippingAddress: string;

  @ApiPropertyOptional({
    description: 'Shipping city',
    example: 'Ho Chi Minh City',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingCity?: string;

  @ApiPropertyOptional({
    description: 'Shipping state/province',
    example: 'Ho Chi Minh',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingState?: string;

  @ApiPropertyOptional({
    description: 'Shipping ZIP/postal code',
    example: '700000',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  shippingZip?: string;

  @ApiPropertyOptional({
    description: 'Shipping country',
    example: 'Vietnam',
    default: 'Vietnam',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingCountry?: string;

  @ApiProperty({
    description: 'Order items',
    type: [CreateOrderItemDto],
    minItems: 1,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({
    description: 'Customer notes',
    example: 'Please deliver in the morning',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

