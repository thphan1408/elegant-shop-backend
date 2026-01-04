import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from 'src/user/user.controller';
import { UserService } from 'src/user/user.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { QueryUserDto } from 'src/user/dto/query-user.dto';
import { UserRole } from '@prisma/client';

describe('UserController', () => {
  let controller: UserController;
  let userServiceMock: any;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
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
  };

  const mockRequestUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    role: UserRole.USER,
  };

  const mockRequestAdmin = {
    id: 'admin-uuid-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const mockRequestModerator = {
    id: 'moderator-uuid-1',
    email: 'moderator@example.com',
    role: UserRole.MODERATOR,
  };

  beforeEach(async () => {
    userServiceMock = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: userServiceMock,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'new@example.com',
      password: 'Password123',
      name: 'New User',
    };

    it('should create a new user as admin', async () => {
      userServiceMock.create.mockResolvedValue(mockUser);

      const result = await controller.create(createUserDto, mockRequestAdmin as any);

      expect(userServiceMock.create).toHaveBeenCalledWith(
        createUserDto,
        mockRequestAdmin,
      );
      expect(result).toEqual(mockUser);
    });

    it('should create a new user as moderator', async () => {
      userServiceMock.create.mockResolvedValue(mockUser);

      const result = await controller.create(
        createUserDto,
        mockRequestModerator as any,
      );

      expect(userServiceMock.create).toHaveBeenCalledWith(
        createUserDto,
        mockRequestModerator,
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('findAll', () => {
    const query: QueryUserDto = { page: 1, limit: 10 };

    it('should return list of users', async () => {
      const mockResponse = {
        data: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
      };

      userServiceMock.findAll.mockResolvedValue(mockResponse);

      const result = await controller.findAll(query, mockRequestAdmin as any);

      expect(userServiceMock.findAll).toHaveBeenCalledWith(
        query,
        mockRequestAdmin,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findOne', () => {
    it('should return user by ID', async () => {
      userServiceMock.findOne.mockResolvedValue(mockUser);

      const result = await controller.findOne(mockUser.id, mockRequestUser as any);

      expect(userServiceMock.findOne).toHaveBeenCalledWith(
        mockUser.id,
        mockRequestUser,
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated Name',
    };

    it('should update user', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      userServiceMock.update.mockResolvedValue(updatedUser);

      const result = await controller.update(
        mockUser.id,
        updateUserDto,
        mockRequestUser as any,
      );

      expect(userServiceMock.update).toHaveBeenCalledWith(
        mockUser.id,
        updateUserDto,
        mockRequestUser,
      );
      expect(result).toEqual(updatedUser);
    });

    it('should update user as admin', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      userServiceMock.update.mockResolvedValue(updatedUser);

      const result = await controller.update(
        mockUser.id,
        updateUserDto,
        mockRequestAdmin as any,
      );

      expect(result).toEqual(updatedUser);
    });

    it('should update user as moderator', async () => {
      const updatedUser = { ...mockUser, name: 'Updated Name' };
      userServiceMock.update.mockResolvedValue(updatedUser);

      const result = await controller.update(
        mockUser.id,
        updateUserDto,
        mockRequestModerator as any,
      );

      expect(result).toEqual(updatedUser);
    });
  });

  describe('remove', () => {
    it('should delete user as admin', async () => {
      userServiceMock.remove.mockResolvedValue({
        message: 'User deactivated successfully',
      });

      const result = await controller.remove(mockUser.id, mockRequestAdmin as any);

      expect(userServiceMock.remove).toHaveBeenCalledWith(
        mockUser.id,
        mockRequestAdmin,
      );
      expect(result).toEqual({ message: 'User deactivated successfully' });
    });
  });
});
