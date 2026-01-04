import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { FAQCategory } from '@prisma/client';

export class QueryFAQDto {
  @ApiPropertyOptional({
    description: 'Filter by FAQ category',
    enum: FAQCategory,
    example: FAQCategory.PRIVACY_POLICY,
  })
  @IsOptional()
  @IsEnum(FAQCategory)
  category?: FAQCategory;

  @ApiPropertyOptional({
    description:
      'Filter by product ID. null for global FAQ only, UUID for product-specific FAQ, undefined for both',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.productId !== null && o.productId !== undefined)
  @IsUUID()
  productId?: string | null;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true' || value === true,
  )
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort order by order field',
    enum: ['asc', 'desc'],
    example: 'asc',
    default: 'asc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
