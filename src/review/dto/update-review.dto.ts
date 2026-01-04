import { IsInt, Min, Max, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateReviewDto {
  @ApiPropertyOptional({
    description: 'Rating from 1 to 5 stars',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: 'Review comment/feedback',
    example: 'Updated: Good product but could be better.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  comment?: string | null;
}

