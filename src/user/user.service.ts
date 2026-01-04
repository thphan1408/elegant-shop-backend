import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserService {
  private readonly saltRounds = 10;

  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Create a new user (admin or moderator)
   * @param createUserDto - User data to create
   * @param currentUser - Current authenticated user
   * @returns Created user without password
   * @throws ConflictException if email already exists
   * @throws ForbiddenException if moderator tries to create admin/moderator role
   */
  async create(createUserDto: CreateUserDto, currentUser: User): Promise<Omit<User, 'password'>> {
    // Moderators can only create USER role, Admins can create any role
    if (createUserDto.role && createUserDto.role !== UserRole.USER) {
      if (currentUser.role !== UserRole.ADMIN) {
        throw new ForbiddenException(
          'Only administrators can create users with admin or moderator roles',
        );
      }
    }

    // Check if email already exists
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      this.saltRounds,
    );

    // Generate username from email if not provided
    const userName = createUserDto.userName || createUserDto.email.split('@')[0];

    // Create user
    const user = await this.prismaService.user.create({
      data: {
        email: createUserDto.email,
        userName: userName,
        password: hashedPassword,
        name: createUserDto.name || null,
        phone: createUserDto.phone || null,
        address: createUserDto.address || null,
        avatar: createUserDto.avatar || null,
        role: createUserDto.role || UserRole.USER,
        is_active: createUserDto.role === UserRole.ADMIN ? true : true, // Default active
      },
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get all users with pagination and filters (admin or moderator)
   * @param query - Query parameters (page, limit, filters)
   * @param currentUser - Current authenticated user
   * @returns Paginated list of users
   */
  async findAll(query: QueryUserDto, currentUser: User) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause conditionally
    const where: Prisma.UserWhereInput = {
      ...(query.email && { email: { contains: query.email, mode: 'insensitive' } }),
      ...(query.role !== undefined && { role: query.role }),
      ...(query.is_active !== undefined && { is_active: query.is_active }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          email: true,
          userName: true,
          name: true,
          role: true,
          avatar: true,
          phone: true,
          address: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          last_login: true,
          // Exclude password
        },
      }),
      this.prismaService.user.count({ where }),
    ]);

    return {
      data: users,
      total,
      page,
      limit,
    };
  }

  /**
   * Get user by ID
   * @param id - User ID to retrieve
   * @param currentUser - Current authenticated user
   * @returns User details without password
   * @throws NotFoundException if user not found
   * @throws ForbiddenException if user tries to view other user's profile (unless admin/moderator)
   */
  async findOne(id: string, currentUser: User): Promise<Omit<User, 'password'>> {
    // Users can view their own profile, Admins and Moderators can view any profile
    if (
      currentUser.role !== UserRole.ADMIN &&
      currentUser.role !== UserRole.MODERATOR &&
      currentUser.id !== id
    ) {
      throw new ForbiddenException('You can only view your own profile');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        userName: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        address: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        last_login: true,
        // Exclude password
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user
   * @param id - User ID to update
   * @param updateUserDto - Data to update
   * @param currentUser - Current authenticated user
   * @returns Updated user without password
   * @throws NotFoundException if user not found
   * @throws ForbiddenException if user doesn't have permission
   * @throws ConflictException if email already exists
   */
  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUser: User,
  ): Promise<Omit<User, 'password'>> {
    // Check if user exists
    const existingUser = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Authorization checks
    if (currentUser.role === UserRole.ADMIN) {
      // Admin: Can update any user, but cannot change their own role
      if (currentUser.id === id && updateUserDto.role !== undefined) {
        throw new ForbiddenException('You cannot change your own role');
      }
    } else if (currentUser.role === UserRole.MODERATOR) {
      // Moderator: Can update any user, but only allowed fields (name, email, phone, address, avatar, password)
      // Cannot change: role, is_active, userName
      if (updateUserDto.role !== undefined || updateUserDto.is_active !== undefined) {
        throw new ForbiddenException(
          'Moderators cannot change user role or active status',
        );
      }
    } else {
      // Regular users: Can only update their own profile
      if (currentUser.id !== id) {
        throw new ForbiddenException('You can only update your own profile');
      }

      // Regular users cannot change role or is_active
      if (updateUserDto.role !== undefined || updateUserDto.is_active !== undefined) {
        throw new ForbiddenException(
          'You do not have permission to change role or active status',
        );
      }
    }

    // Check email uniqueness if email is being updated
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prismaService.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailExists) {
        throw new ConflictException('Email already in use');
      }
    }

    // Hash password if provided
    const updateData: Prisma.UserUpdateInput = {
      ...(updateUserDto.email && { email: updateUserDto.email }),
      ...(updateUserDto.name !== undefined && { name: updateUserDto.name }),
      ...(updateUserDto.phone !== undefined && { phone: updateUserDto.phone }),
      ...(updateUserDto.address !== undefined && { address: updateUserDto.address }),
      ...(updateUserDto.avatar !== undefined && { avatar: updateUserDto.avatar }),
      ...(updateUserDto.role !== undefined && { role: updateUserDto.role }),
      ...(updateUserDto.is_active !== undefined && { is_active: updateUserDto.is_active }),
      ...(updateUserDto.password && {
        password: await bcrypt.hash(updateUserDto.password, this.saltRounds),
      }),
    };

    const updatedUser = await this.prismaService.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        userName: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        address: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        last_login: true,
        // Exclude password
      },
    });

    return updatedUser;
  }

  /**
   * Delete user (soft delete - set is_active to false) - Admin only
   * @param id - User ID to delete
   * @param currentUser - Current authenticated user
   * @returns Success message
   * @throws NotFoundException if user not found
   * @throws ForbiddenException if user is not admin or tries to delete themselves
   */
  async remove(id: string, currentUser: User): Promise<{ message: string }> {
    // Only admin can delete users
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can delete users');
    }

    // Admin cannot delete themselves
    if (currentUser.id === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete: set is_active to false
    await this.prismaService.user.update({
      where: { id },
      data: { is_active: false },
    });

    return { message: 'User deactivated successfully' };
  }
}

