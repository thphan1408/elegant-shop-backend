import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { FAQCategory } from '@prisma/client';

export class UpdateFAQDto {
  @ApiPropertyOptional({
    description: 'Question text',
    example: 'What is your updated privacy policy?',
  })
  @IsOptional()
  @IsString()
  question?: string;

  @ApiPropertyOptional({
    description: 'Answer text (can contain HTML/Markdown)',
    example: 'Our updated privacy policy ensures...',
  })
  @IsOptional()
  @IsString()
  answer?: string;

  @ApiPropertyOptional({
    description: 'FAQ Category',
    enum: FAQCategory,
    example: FAQCategory.PRIVACY_POLICY,
  })
  @IsOptional()
  @IsEnum(FAQCategory)
  category?: FAQCategory;

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
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({
    description: 'Whether the FAQ is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

