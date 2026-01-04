import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsUUID,
  IsInt,
  Min,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { FAQCategory } from '@prisma/client';

export class CreateFAQDto {
  @ApiProperty({
    description: 'Question text',
    example: 'What is your privacy policy?',
  })
  @IsString()
  question: string;

  @ApiProperty({
    description: 'Answer text (can contain HTML/Markdown)',
    example: 'Our privacy policy ensures...',
  })
  @IsString()
  answer: string;

  @ApiProperty({
    description: 'FAQ Category',
    enum: FAQCategory,
    example: FAQCategory.PRIVACY_POLICY,
  })
  @IsEnum(FAQCategory)
  category: FAQCategory;

  @ApiPropertyOptional({
    description: 'Product ID (optional, if not provided then it is a global FAQ)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.productId !== null && o.productId !== undefined)
  @IsUUID()
  productId?: string | null;

  @ApiPropertyOptional({
    description: 'Array of Cloudinary image URLs',
    example: ['https://res.cloudinary.com/...'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({
    description: 'Array of Cloudinary file URLs (PDF, DOC, etc.)',
    example: ['https://res.cloudinary.com/...'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional({
    description: 'Display order (for sorting)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    description: 'Whether the FAQ is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

