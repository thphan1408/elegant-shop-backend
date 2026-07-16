import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { LoginDto } from 'src/auth/dto/login.dto';
import { UserRole } from '@prisma/client';
import { NotificationService } from 'src/notification/notification.service';
import { CartService } from 'src/cart/cart.service';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaMock: any;
  let jwtServiceMock: any;
  let configServiceMock: any;
  let notificationServiceMock: any;
  let cartServiceMock: any;

  const mockUserId = 'user-uuid-1';
  const mockEmail = 'test@example.com';
  const mockUsername = 'testuser';
  const mockPassword = 'Password123';
  const mockHashedPassword = 'hashedPassword123';

  const mockUser = {
    id: mockUserId,
    email: mockEmail,
    userName: mockUsername,
    name: 'Test User',
    role: UserRole.USER,
    avatar: null,
    password: mockHashedPassword,
    is_active: true,
  };

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtServiceMock = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'JWT_EXPIRES_IN') return '1d';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return null;
      }),
    };

    // Welcome email is fire-and-forget: it must resolve so the `.catch()` chain
    // in register() doesn't blow up.
    notificationServiceMock = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    // Guest-cart merge is also fire-and-forget; only called when a guestId is
    // passed to login/register.
    cartServiceMock = {
      mergeGuestCart: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
        {
          provide: NotificationService,
          useValue: notificationServiceMock,
        },
        {
          provide: CartService,
          useValue: cartServiceMock,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      yourName: 'Test User',
      username: mockUsername,
      email: mockEmail,
      password: mockPassword,
      privacyPolicy: true,
    };

    it('should register a new user successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null); // No existing user
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
      prismaMock.user.create.mockResolvedValue({
        ...mockUser,
        password: mockHashedPassword,
      });
      jwtServiceMock.signAsync.mockResolvedValue('access-token');
      jwtServiceMock.signAsync.mockResolvedValueOnce('access-token');
      jwtServiceMock.signAsync.mockResolvedValueOnce('refresh-token');

      const result = await service.register(registerDto);

      expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(2); // Check email and username
      expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10);
      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: mockEmail,
          userName: mockUsername,
          password: mockHashedPassword,
          name: registerDto.yourName,
          role: UserRole.USER,
          is_active: true,
        },
        select: expect.any(Object),
      });
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(mockEmail);
    });

    it('should throw ConflictException if email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValueOnce(mockUser); // Email exists

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException if username already exists', async () => {
      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // Email doesn't exist
        .mockResolvedValueOnce(mockUser); // Username exists

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if privacy policy not accepted', async () => {
      const registerDtoWithoutPrivacy: RegisterDto = {
        ...registerDto,
        privacyPolicy: false,
      };

      await expect(
        service.register(registerDtoWithoutPrivacy),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should accept both "name" and "yourName" fields', async () => {
      const registerDtoWithName = {
        name: 'Test User',
        username: 'newuser',
        email: 'new@example.com',
        password: mockPassword,
        privacyPolicy: true,
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
      prismaMock.user.create.mockResolvedValue(mockUser);
      jwtServiceMock.signAsync.mockResolvedValueOnce('access-token');
      jwtServiceMock.signAsync.mockResolvedValueOnce('refresh-token');

      // This should work due to Transform decorator
      await service.register(registerDtoWithName as any);

      expect(prismaMock.user.create).toHaveBeenCalled();
    });

    it('should merge the guest cart when a guestId is provided', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
      prismaMock.user.create.mockResolvedValue(mockUser);
      jwtServiceMock.signAsync.mockResolvedValueOnce('access-token');
      jwtServiceMock.signAsync.mockResolvedValueOnce('refresh-token');

      await service.register(registerDto, 'guest-123');

      expect(cartServiceMock.mergeGuestCart).toHaveBeenCalledWith(
        'guest-123',
        mockUserId,
      );
    });

    it('should not merge any cart when no guestId is provided', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
      prismaMock.user.create.mockResolvedValue(mockUser);
      jwtServiceMock.signAsync.mockResolvedValueOnce('access-token');
      jwtServiceMock.signAsync.mockResolvedValueOnce('refresh-token');

      await service.register(registerDto);

      expect(cartServiceMock.mergeGuestCart).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      emailOrUsername: mockEmail,
      password: mockPassword,
      rememberMe: false,
    };

    it('should login user with email successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaMock.user.update.mockResolvedValue(mockUser);
      jwtServiceMock.signAsync.mockResolvedValueOnce('access-token');
      jwtServiceMock.signAsync.mockResolvedValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockEmail },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        mockPassword,
        mockHashedPassword,
      );
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should login user with username successfully', async () => {
      const loginDtoWithUsername: LoginDto = {
        emailOrUsername: mockUsername,
        password: mockPassword,
      };

      prismaMock.user.findUnique
        .mockResolvedValueOnce(null) // Not found by email
        .mockResolvedValueOnce(mockUser); // Found by username
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaMock.user.update.mockResolvedValue(mockUser);
      jwtServiceMock.signAsync.mockResolvedValueOnce('access-token');
      jwtServiceMock.signAsync.mockResolvedValueOnce('refresh-token');

      const result = await service.login(loginDtoWithUsername);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { userName: mockUsername },
      });
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      const inactiveUser = { ...mockUser, is_active: false };
      prismaMock.user.findUnique.mockResolvedValue(inactiveUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should extend token expiration if rememberMe is true', async () => {
      const loginDtoRememberMe: LoginDto = {
        ...loginDto,
        rememberMe: true,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaMock.user.update.mockResolvedValue(mockUser);
      jwtServiceMock.signAsync.mockResolvedValueOnce('access-token');
      jwtServiceMock.signAsync.mockResolvedValueOnce('refresh-token');

      await service.login(loginDtoRememberMe);

      // Check that signAsync was called with extended expiration
      expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          expiresIn: '30d',
        }),
      );
    });

    it('should merge the guest cart when a guestId is provided', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prismaMock.user.update.mockResolvedValue(mockUser);
      jwtServiceMock.signAsync.mockResolvedValueOnce('access-token');
      jwtServiceMock.signAsync.mockResolvedValueOnce('refresh-token');

      await service.login(loginDto, 'guest-abc');

      expect(cartServiceMock.mergeGuestCart).toHaveBeenCalledWith(
        'guest-abc',
        mockUserId,
      );
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('should refresh access token successfully', async () => {
      const payload = {
        sub: mockUserId,
        email: mockEmail,
        role: UserRole.USER,
      };

      jwtServiceMock.verifyAsync.mockResolvedValue(payload);
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUser,
        is_active: true,
      });
      jwtServiceMock.signAsync.mockResolvedValue('new-access-token');

      const result = await service.refreshToken(refreshTokenDto as any);

      expect(jwtServiceMock.verifyAsync).toHaveBeenCalled();
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUserId },
        }),
      );
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      jwtServiceMock.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken(refreshTokenDto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user not found or inactive', async () => {
      const payload = {
        sub: mockUserId,
        email: mockEmail,
        role: UserRole.USER,
      };

      jwtServiceMock.verifyAsync.mockResolvedValue(payload);
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken(refreshTokenDto as any)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const result = await service.logout(mockUserId);

      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('validateUser', () => {
    it('should validate user from JWT payload', async () => {
      const payload = {
        sub: mockUserId,
        email: mockEmail,
        role: UserRole.USER,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(payload);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      const payload = {
        sub: mockUserId,
        email: mockEmail,
        role: UserRole.USER,
      };

      prismaMock.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });

    it('should return null if user is inactive', async () => {
      const payload = {
        sub: mockUserId,
        email: mockEmail,
        role: UserRole.USER,
      };

      const inactiveUser = { ...mockUser, is_active: false };
      prismaMock.user.findUnique.mockResolvedValue(inactiveUser);

      const result = await service.validateUser(payload);

      expect(result).toBeNull();
    });
  });
});

