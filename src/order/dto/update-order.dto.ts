import {
  IsEnum,
  IsOptional,
  IsBoolean,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: 'Order status',
    enum: OrderStatus,
    example: OrderStatus.PROCESSING,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Payment status',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  paymentStatus?: boolean;

  @ApiPropertyOptional({
    description: 'Shipping tracking number',
    example: 'VN123456789',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string;

  @ApiPropertyOptional({
    description: 'Notes (admin only)',
    example: 'Order shipped via express delivery',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

