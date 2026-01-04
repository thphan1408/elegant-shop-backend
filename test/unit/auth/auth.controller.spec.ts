import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from 'src/auth/auth.controller';
import { AuthService } from 'src/auth/auth.service';
import { RegisterDto } from 'src/auth/dto/register.dto';
import { LoginDto } from 'src/auth/dto/login.dto';
import { RefreshTokenDto } from 'src/auth/dto/refresh-token.dto';
import { UserRole } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let authServiceMock: any;

  const mockAuthResponse = {
    user: {
      id: 'user-uuid-1',
      email: 'test@example.com',
      name: 'Test User',
      role: UserRole.USER,
      avatar: null,
    },
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  beforeEach(async () => {
    authServiceMock = {
      register: jest.fn(),
      login: jest.fn(),
      refreshToken: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      yourName: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      password: 'Password123',
      privacyPolicy: true,
    };

    it('should register a new user', async () => {
      authServiceMock.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(authServiceMock.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      emailOrUsername: 'test@example.com',
      password: 'Password123',
      rememberMe: false,
    };

    it('should login user', async () => {
      authServiceMock.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(authServiceMock.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: 'valid-refresh-token',
    };

    it('should refresh access token', async () => {
      const mockRefreshResponse = {
        accessToken: 'new-access-token',
      };

      authServiceMock.refreshToken.mockResolvedValue(mockRefreshResponse);

      const result = await controller.refreshToken(refreshTokenDto);

      expect(authServiceMock.refreshToken).toHaveBeenCalledWith(
        refreshTokenDto,
      );
      expect(result).toEqual(mockRefreshResponse);
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        email: 'test@example.com',
      };

      authServiceMock.logout.mockResolvedValue({
        message: 'Logged out successfully',
      });

      const result = await controller.logout(mockUser as any);

      expect(authServiceMock.logout).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        avatar: null,
      };

      const result = await controller.getProfile(mockUser as any);

      expect(result).toEqual(mockUser);
    });
  });
});
