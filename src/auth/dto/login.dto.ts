import {
  IsString,
  MinLength,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    description:
      'Email address or username (accepts "email", "username", or "emailOrUsername")',
    example: 'user@example.com or johndoe123',
  })
  @Transform(({ obj }) => {
    // Accept: emailOrUsername, email, or username from request body
    // This runs before validation, so we can access the raw request object
    return obj?.emailOrUsername || obj?.email || obj?.username;
  })
  @IsString()
  @IsNotEmpty({ message: 'Email or username is required' })
  emailOrUsername: string;

  @ApiProperty({
    description: 'Password',
    example: 'Password123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(1, { message: 'Password is required' })
  password: string;

  @ApiPropertyOptional({
    description: 'Remember me (extends token expiration)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
