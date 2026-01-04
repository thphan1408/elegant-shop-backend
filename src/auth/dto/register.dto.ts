import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsNotEmpty,
  Matches,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @ApiProperty({
    description: 'Full name (accepts both "name" and "yourName")',
    example: 'John Doe',
  })
  @Transform(({ obj }) => {
    // Transform: accept both 'name' and 'yourName' from request body
    // This runs before validation, so we can access the raw request object
    return obj?.yourName || obj?.name;
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  yourName: string;

  @ApiProperty({
    description:
      'Username (must be unique, allows letters, numbers, dots, and underscores)',
    example: 'johndoe123',
  })
  @IsString()
  @IsNotEmpty({ message: 'Username is required' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(30, { message: 'Username must not exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9._]+$/, {
    message:
      'Username can only contain letters, numbers, dots, and underscores',
  })
  username: string;

  @ApiProperty({
    description: 'Email address (must be unique)',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description:
      'Password (min 8 characters, must contain at least one letter and one number)',
    example: 'Password123',
    minLength: 8,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(100, { message: 'Password must not exceed 100 characters' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must contain at least one letter and one number',
  })
  password: string;

  @ApiProperty({
    description: 'Privacy policy acceptance (must be true)',
    example: true,
  })
  @IsBoolean({ message: 'Privacy policy acceptance must be a boolean' })
  privacyPolicy: boolean;
}
