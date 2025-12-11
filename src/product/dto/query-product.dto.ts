import {
  IsOptional,
  IsString,
  IsInt,
  IsPositive,
  IsBoolean,
} from 'class-validator';

export class QueryProductDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsBoolean()
  @IsOptional()
  is_featured?: boolean;

  @IsInt()
  @IsPositive()
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @IsPositive()
  @IsOptional()
  limit?: number = 10;

  @IsString()
  @IsOptional()
  search?: string; 
}
