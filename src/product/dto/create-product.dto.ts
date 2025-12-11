import {
  IsString,
  IsOptional,
  IsInt,
  IsPositive,
  IsBoolean,
  IsArray,
  IsNumber,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '@prisma/client'; 

class CreateVariantDto {
  @IsString()
  color: string;

  @IsString()
  @IsOptional()
  colorHex?: string;

  @IsString()
  image: string;

  @IsArray()
  @IsOptional()
  images?: string[];

  @IsString()
  sku: string;

  @IsPositive()
  quantity: number;

  @IsNumber()
  price: number;

  @IsNumber()
  @IsOptional()
  price_sale?: number;

  @IsString()
  @IsOptional()
  size?: string;

  @IsString()
  @IsOptional()
  material?: string;
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsInt()
  @IsPositive()
  @IsOptional()
  discount?: number;

  @IsString()
  category: string;

  @IsString()
  measurement: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  material?: string;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsString()
  @IsOptional()
  warranty?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsOptional()
  meta_title?: string;

  @IsString()
  @IsOptional()
  meta_description?: string;

  @IsBoolean()
  @IsOptional()
  is_featured?: boolean;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants: CreateVariantDto[];
}
