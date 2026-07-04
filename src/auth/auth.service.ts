import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '@prisma/client';
import { NotificationService } from 'src/notification/notification.service';
import { EmailTemplateType } from 'src/notification/dto/send-email.dto';

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
  isTestToken?: boolean; // Flag for test token (infinite expiration)
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
    avatar: string | null;
  };
  accessToken: string;
  refreshToken?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 10;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // Validate privacy policy acceptance
    if (!registerDto.privacyPolicy) {
      throw new BadRequestException(
        'You must accept the privacy policy to register',
      );
    }

    // Check if email already exists
    const existingUserByEmail = await this.prismaService.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if username already exists
    const existingUserByUsername = await this.prismaService.user.findUnique({
      where: { userName: registerDto.username },
    });

    if (existingUserByUsername) {
      throw new ConflictException('Username is already taken');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.saltRounds,
    );

    // Create user
    const user = await this.prismaService.user.create({
      data: {
        email: registerDto.email,
        userName: registerDto.username,
        password: hashedPassword,
        name: registerDto.yourName,
        role: UserRole.USER, // Default role
        is_active: true,
      },
      select: {
        id: true,
        email: true,
        userName: true,
        name: true,
        role: true,
        avatar: true,
        password: false, // Exclude password from response
      },
    });

    // Generate tokens (use regular expiration, rememberMe handled in login)
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Fire-and-forget: gửi email chào mừng. KHÔNG await và KHÔNG để lỗi email
    // làm hỏng luồng đăng ký — nếu SMTP lỗi, user vẫn đăng ký thành công.
    void this.notificationService
      .sendEmail({
        to: user.email,
        name: user.name ?? undefined,
        template: EmailTemplateType.WELCOME,
      })
      .catch((error: Error) => {
        this.logger.warn(
          `Failed to send welcome email to ${user.email}: ${error.message}`,
        );
      });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
      ...tokens,
    };
  }

  /**
   * Login user (by email or username)
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    // Try to find user by email first, then by username
    let user = await this.prismaService.user.findUnique({
      where: { email: loginDto.emailOrUsername },
    });

    // If not found by email, try username
    if (!user) {
      user = await this.prismaService.user.findUnique({
        where: { userName: loginDto.emailOrUsername },
      });
    }

    if (!user) {
      throw new UnauthorizedException('Invalid email/username or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedException(
        'Account is inactive. Please contact support.',
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email/username or password');
    }

    // Update last login
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    // Generate tokens with extended expiration if rememberMe is true
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.role,
      loginDto.rememberMe,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
      ...tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshTokenDto.refreshToken,
        {
          secret:
            this.configService.get<string>('JWT_REFRESH_SECRET') ||
            this.configService.get<string>('JWT_SECRET'),
        },
      );

      // Find user
      const user = await this.prismaService.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          role: true,
          is_active: true,
        },
      });

      if (!user || !user.is_active) {
        throw new UnauthorizedException('User not found or inactive');
      }

      // Generate new access token
      const accessToken = await this.generateAccessToken(
        user.id,
        user.email,
        user.role,
      );

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user (invalidate refresh token)
   * Note: For stateless JWT, we rely on client to delete tokens
   * For production, consider implementing token blacklist (Redis)
   */
  async logout(userId: string): Promise<{ message: string }> {
    // Update last login (optional tracking)
    // In production, you might want to implement token blacklist using Redis
    return { message: 'Logged out successfully' };
  }

  /**
   * Validate user from JWT payload
   */
  async validateUser(payload: JwtPayload): Promise<User | null> {
    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.is_active) {
      return null;
    }

    return user;
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    userId: string,
    email: string,
    role: UserRole,
    rememberMe: boolean = false,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Extend token expiration if rememberMe is true
    const accessExpiresIn = rememberMe
      ? '30d'
      : this.configService.get<string>('JWT_EXPIRES_IN') || '1d';
    const refreshExpiresIn = rememberMe
      ? '90d'
      : this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email, role, accessExpiresIn),
      this.generateRefreshToken(userId, email, role, refreshExpiresIn),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Generate access token (short-lived)
   */
  private async generateAccessToken(
    userId: string,
    email: string,
    role: UserRole,
    expiresIn?: string,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    const tokenExpiresIn =
      expiresIn || this.configService.get<string>('JWT_EXPIRES_IN') || '1d';
    return this.jwtService.signAsync(payload as any, {
      secret,
      expiresIn: tokenExpiresIn as any,
    });
  }

  /**
   * Generate refresh token (long-lived)
   */
  private async generateRefreshToken(
    userId: string,
    email: string,
    role: UserRole,
    expiresIn?: string,
  ): Promise<string> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const refreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      this.configService.get<string>('JWT_SECRET');

    if (!refreshSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const tokenExpiresIn =
      expiresIn ||
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ||
      '7d';
    return this.jwtService.signAsync(payload as any, {
      secret: refreshSecret,
      expiresIn: tokenExpiresIn as any,
    });
  }

  /**
   * Generate test token with infinite expiration (for testing only)
   * This token has super admin privileges (bypasses all guards)
   * @returns Test access token
   */
  async generateTestToken(): Promise<string> {
    // Find or use default admin account
    const admin = await this.prismaService.user.findFirst({
      where: {
        role: UserRole.ADMIN,
      },
      orderBy: {
        created_at: 'asc', // Get first admin (likely the default one)
      },
    });

    if (!admin) {
      throw new Error('No admin account found. Please run the application to initialize admin account.');
    }

    // Create payload with test token flag
    const payload = {
      sub: admin.id,
      email: admin.email,
      role: UserRole.ADMIN,
      isTestToken: true, // Flag to identify test token
    };

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    // Generate token with very long expiration (100 years = ~3.15 billion seconds)
    // This is effectively infinite for testing purposes
    const expiresInSeconds = 100 * 365 * 24 * 60 * 60; // 100 years in seconds
    return this.jwtService.signAsync(payload as any, {
      secret,
      expiresIn: expiresInSeconds as any,
    });
  }
}
