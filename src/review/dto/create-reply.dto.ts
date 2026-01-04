import { IsString, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReplyDto {
  @ApiProperty({
    description: 'Reply content',
    example: 'Thanks for your review! This product is indeed great.',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Parent reply ID (if replying to another reply, null for direct reply to review)',
    example: '123e4567-e89b-12d3-a456-426614174002',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.parentId !== null && o.parentId !== undefined)
  @IsString()
  @IsUUID()
  parentId?: string | null;

  @ApiPropertyOptional({
    description: 'User ID (nullable for anonymous replies)',
    example: '123e4567-e89b-12d3-a456-426614174001',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.userId !== null && o.userId !== undefined)
  @IsString()
  @IsUUID()
  userId?: string | null;
}


