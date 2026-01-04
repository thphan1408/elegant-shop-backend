import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReactionType } from '@prisma/client';

export class CreateReactionDto {
  @ApiProperty({
    description: 'Reaction type',
    enum: ReactionType,
    example: ReactionType.LIKE,
  })
  @IsEnum(ReactionType)
  reaction: ReactionType;

  @ApiPropertyOptional({
    description: 'User ID (nullable for anonymous reactions). If provided and user already reacted, it will update the existing reaction.',
    example: '123e4567-e89b-12d3-a456-426614174001',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o) => o.userId !== null && o.userId !== undefined)
  @IsString()
  @IsUUID()
  userId?: string | null;
}


