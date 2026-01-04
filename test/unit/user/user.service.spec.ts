import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from 'src/user/user.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { QueryUserDto } from 'src/user/dto/query-user.dto';
import { UserRole } from '@prisma/client';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let prismaMock: any;

  const mockUserId = 'user-uuid-1';
  const mockAdminId = 'admin-uuid-1';
  const mockModeratorId = 'moderator-uuid-1';
  const mockEmail = 'test@example.com';
  const mockPassword = 'Password123';
  const mockHashedPassword = 'hashedPassword123';

  const mockUser = {
    id: mockUserId,
    email: mockEmail,
    userName: 'testuser',
    name: 'Test User',
    role: UserRole.USER,
    avatar: null,
    phone: null,
    address: null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    last_login: null,
    password: mockHashedPassword,
  };

  const mockAdmin = {
    ...mockUser,
    id: mockAdminId,
    email: 'admin@example.com',
    userName: 'admin',
    role: UserRole.ADMIN,
  };

  const mockModerator = {
    ...mockUser,
    id: mockModeratorId,
    email: 'moderator@example.com',
    userName: 'moderator',
    role: UserRole.MODERATOR,
  };

  beforeEach(async () => {
    prismaMock = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: mockEmail,
      password: mockPassword,
      name: 'Test User',
      role: UserRole.USER,
    };

    it('should create a new user successfully as admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
      prismaMock.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto, mockAdmin);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockEmail },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10);
      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(result).not.toHaveProperty('password');
    });

    it('should create a new user successfully as moderator (USER role only)', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
      prismaMock.user.create.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto, mockModerator);

      expect(prismaMock.user.create).toHaveBeenCalled();
      expect(result).not.toHaveProperty('password');
    });

    it('should throw ConflictException if email already exists', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto, mockAdmin)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if moderator tries to create user with admin role', async () => {
      const createUserDtoWithAdminRole: CreateUserDto = {
        ...createUserDto,
        role: UserRole.ADMIN,
      };

      await expect(
        service.create(createUserDtoWithAdminRole, mockModerator),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if moderator tries to create user with moderator role', async () => {
      const createUserDtoWithModeratorRole: CreateUserDto = {
        ...createUserDto,
        role: UserRole.MODERATOR,
      };

      await expect(
        service.create(createUserDtoWithModeratorRole, mockModerator),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should allow admin to create user with any role', async () => {
      const createUserDtoWithAdminRole: CreateUserDto = {
        ...createUserDto,
        role: UserRole.ADMIN,
      };

      prismaMock.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(mockHashedPassword);
      prismaMock.user.create.mockResolvedValue(mockAdmin);

      const result = await service.create(createUserDtoWithAdminRole, mockAdmin);

      expect(result).not.toHaveProperty('password');
    });
  });

  describe('findAll', () => {
    it('should return paginated list of users', async () => {
      const query: QueryUserDto = { page: 1, limit: 10 };
      prismaMock.user.findMany.mockResolvedValue([mockUser]);
      prismaMock.user.count.mockResolvedValue(1);

      const result = await service.findAll(query, mockAdmin);

      expect(prismaMock.user.findMany).toHaveBeenCalled();
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
    });

    it('should filter users by email', async () => {
      const query: QueryUserDto = { email: 'test' };
      prismaMock.user.findMany.mockResolvedValue([mockUser]);
      prismaMock.user.count.mockResolvedValue(1);

      await service.findAll(query, mockAdmin);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: expect.objectContaining({ contains: 'test' }),
          }),
        }),
      );
    });

    it('should filter users by role', async () => {
      const query: QueryUserDto = { role: UserRole.USER };
      prismaMock.user.findMany.mockResolvedValue([mockUser]);
      prismaMock.user.count.mockResolvedValue(1);

      await service.findAll(query, mockAdmin);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: UserRole.USER,
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return user by ID (own profile)', async () => {
      const userWithoutPassword = { ...mockUser };
      delete userWithoutPassword.password;
      prismaMock.user.findUnique.mockResolvedValue(userWithoutPassword);

      const result = await service.findOne(mockUserId, mockUser);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: expect.any(Object),
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(mockUserId, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if regular user tries to view other user profile', async () => {
      await expect(
        service.findOne('other-user-id', mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to view any user profile', async () => {
      const userWithoutPassword = { ...mockUser };
      delete userWithoutPassword.password;
      prismaMock.user.findUnique.mockResolvedValue(userWithoutPassword);

      const result = await service.findOne(mockUserId, mockAdmin);

      expect(result).toBeTruthy();
      expect(result).not.toHaveProperty('password');
    });

    it('should allow moderator to view any user profile', async () => {
      const userWithoutPassword = { ...mockUser };
      delete userWithoutPassword.password;
      prismaMock.user.findUnique.mockResolvedValue(userWithoutPassword);

      const result = await service.findOne(mockUserId, mockModerator);

      expect(result).toBeTruthy();
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated Name',
    };

    it('should update user successfully (own profile)', async () => {
      const updatedUser = {
        ...mockUser,
        name: 'Updated Name',
      };
      delete updatedUser.password;
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(mockUserId, updateUserDto, mockUser);

      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(result.name).toBe('Updated Name');
      expect(result).not.toHaveProperty('password');
    });

    it('should hash password if provided', async () => {
      const updateDtoWithPassword: UpdateUserDto = {
        password: 'NewPassword123',
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      prismaMock.user.update.mockResolvedValue(mockUser);

      await service.update(mockUserId, updateDtoWithPassword, mockUser);

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123', 10);
    });

    it('should throw ForbiddenException if regular user tries to update other user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.update('other-user-id', updateUserDto, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if regular user tries to change role', async () => {
      const updateDtoWithRole: UpdateUserDto = {
        role: UserRole.ADMIN,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.update(mockUserId, updateDtoWithRole, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if regular user tries to change is_active', async () => {
      const updateDtoWithActive: UpdateUserDto = {
        is_active: false,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.update(mockUserId, updateDtoWithActive, mockUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to update any user', async () => {
      const updatedUser = { ...mockUser };
      delete updatedUser.password;
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const result = await service.update(mockUserId, updateUserDto, mockAdmin);

      expect(result).toBeTruthy();
    });

    it('should prevent admin from changing own role', async () => {
      const updateDtoWithRole: UpdateUserDto = {
        role: UserRole.USER,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockAdmin);

      await expect(
        service.update(mockAdminId, updateDtoWithRole, mockAdmin),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow moderator to update any user with allowed fields', async () => {
      const updatedUser = {
        ...mockUser,
        name: 'Updated Name',
        phone: '+1234567890',
      };
      delete updatedUser.password;
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue(updatedUser);

      const updateDto: UpdateUserDto = {
        name: 'Updated Name',
        phone: '+1234567890',
      };

      const result = await service.update(
        mockUserId,
        updateDto,
        mockModerator,
      );

      expect(result).toBeTruthy();
      expect(result.name).toBe('Updated Name');
    });

    it('should throw ForbiddenException if moderator tries to change role', async () => {
      const updateDtoWithRole: UpdateUserDto = {
        role: UserRole.ADMIN,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.update(mockUserId, updateDtoWithRole, mockModerator),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if moderator tries to change is_active', async () => {
      const updateDtoWithActive: UpdateUserDto = {
        is_active: false,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.update(mockUserId, updateDtoWithActive, mockModerator),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should soft delete user (set is_active to false) as admin', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        is_active: false,
      });

      const result = await service.remove(mockUserId, mockAdmin);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { is_active: false },
      });
      expect(result.message).toBe('User deactivated successfully');
    });

    it('should throw ForbiddenException if moderator tries to delete user', async () => {
      await expect(service.remove(mockUserId, mockModerator)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if regular user tries to delete user', async () => {
      await expect(service.remove(mockUserId, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should prevent admin from deleting themselves', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockAdmin);

      await expect(service.remove(mockAdminId, mockAdmin)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.remove(mockUserId, mockAdmin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
