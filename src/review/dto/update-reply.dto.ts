import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateReplyDto {
  @ApiProperty({
    description: 'Updated reply content',
    example: 'Updated: Thanks for your review!',
  })
  @IsString()
  content: string;
}


