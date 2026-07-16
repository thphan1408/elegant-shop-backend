import {
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Product ID to review',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsUUID()
  productId: string;

  // Note: userId is no longer in DTO - it's automatically taken from the authenticated user (JWT token)
  // Only authenticated users (USER, ADMIN, MODERATOR) can create reviews
  // Guest users cannot create reviews

  @ApiProperty({
    description: 'Rating from 1 to 5 stars',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({
    description: 'Review comment/feedback',
    example: 'Great product! Very satisfied with the quality.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  comment?: string | null;
}
