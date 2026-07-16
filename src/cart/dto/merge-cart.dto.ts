import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MergeCartDto {
  @ApiProperty({
    description:
      'Guest cart identifier (client-generated UUID stored in localStorage) to merge into the current user cart',
    example: '7b2e4f2a-9c1d-4e3a-8f2b-1a2b3c4d5e6f',
  })
  @IsString()
  @IsNotEmpty()
  guestId: string;
}
