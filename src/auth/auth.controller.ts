import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiHeader,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from './decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   * @param registerDto - Registration data (name, username, email, password, privacyPolicy)
   * @returns User data with access and refresh tokens
   */
  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string', nullable: true },
            role: {
              type: 'string',
              enum: ['USER', 'ADMIN', 'MODERATOR', 'GUEST'],
            },
            avatar: { type: 'string', nullable: true },
          },
        },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'User with email/username already exists',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or privacy policy not accepted',
  })
  @ApiHeader({
    name: 'X-Guest-Id',
    required: false,
    description:
      'Guest cart id used before signing up. If present, that cart is merged into the new account.',
  })
  async register(
    @Body() body: any,
    @Headers('x-guest-id') guestId?: string,
  ) {
    // Transform request body to handle 'name' or 'yourName'
    const transformedBody = {
      yourName: body.yourName || body.name,
      username: body.username,
      email: body.email,
      password: body.password,
      privacyPolicy: body.privacyPolicy,
    };

    // Transform to DTO instance and validate manually
    const registerDto = plainToInstance(RegisterDto, transformedBody);
    const errors = await validate(registerDto);

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => Object.values(error.constraints || {}))
        .flat();
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errorMessages,
      });
    }

    return this.authService.register(registerDto, guestId);
  }

  /**
   * Login user with email or username
   * @param body - Login data (emailOrUsername/email/username, password, rememberMe)
   * @returns User data with access and refresh tokens
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user with email or username' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string', nullable: true },
            role: {
              type: 'string',
              enum: ['USER', 'ADMIN', 'MODERATOR', 'GUEST'],
            },
            avatar: { type: 'string', nullable: true },
          },
        },
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email/username or password',
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiHeader({
    name: 'X-Guest-Id',
    required: false,
    description:
      'Guest cart id used before logging in. If present, that cart is merged into the account.',
  })
  async login(
    @Body() body: any,
    @Headers('x-guest-id') guestId?: string,
  ) {
    // Transform request body to handle 'email', 'username', or 'emailOrUsername'
    const transformedBody = {
      emailOrUsername: body.emailOrUsername || body.email || body.username,
      password: body.password,
      rememberMe: body.rememberMe,
    };

    // Transform to DTO instance and validate
    const loginDto = plainToInstance(LoginDto, transformedBody);
    const errors = await validate(loginDto);

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => Object.values(error.constraints || {}))
        .flat();
      throw new BadRequestException({
        message: 'Validation failed',
        errors: errorMessages,
      });
    }

    return this.authService.login(loginDto, guestId);
  }

  /**
   * Refresh access token using refresh token
   * @param refreshTokenDto - Refresh token data
   * @returns New access token
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto);
  }

  /**
   * Logout user (invalidate refresh token)
   * @param user - Current authenticated user
   * @returns Success message
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Logged out successfully' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@CurrentUser() user: User) {
    return this.authService.logout(user.id);
  }

  /**
   * Get current user profile
   * @param user - Current authenticated user
   * @returns User profile without password
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
        name: { type: 'string', nullable: true },
        role: { type: 'string', enum: ['USER', 'ADMIN', 'MODERATOR'] },
        avatar: { type: 'string', nullable: true },
        phone: { type: 'string', nullable: true },
        address: { type: 'string', nullable: true },
        is_active: { type: 'boolean' },
        created_at: { type: 'string', format: 'date-time' },
        last_login: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: User) {
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Generate test token with infinite expiration (development/testing only)
   * Token is logged to console, not returned in response
   * @returns Success message
   */
  @Post('test-token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // Exclude from Swagger documentation
  async generateTestToken() {
    const accessToken = await this.authService.generateTestToken();
    // Log token to console (not exposed in Swagger or API response)
    console.log(
      '\n═══════════════════════════════════════════════════════════',
    );
    console.log('🔑 TEST TOKEN GENERATED');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Token: ${accessToken}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log(
      '⚠️  This token has super admin privileges and bypasses all guards!',
    );
    console.log('⚠️  USE ONLY IN DEVELOPMENT/TESTING ENVIRONMENT!');
    console.log(
      '═══════════════════════════════════════════════════════════\n',
    );
    return { message: 'Test token generated. Check console for token.' };
  }
}
