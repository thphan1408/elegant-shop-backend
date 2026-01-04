import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { Public } from 'src/auth/decorators/public.decorator';
import { UserRole } from '@prisma/client';
import type { User } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Create a new user
   * @param createUserDto - User data
   * @param currentUser - Current authenticated user (admin or moderator)
   * @returns Created user
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new user',
    description: 'Admin and Moderator can create users. Moderators can only create USER role, Admins can create any role.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @ApiResponse({ status: 403, description: 'Forbidden - Moderators cannot create admin/moderator users' })
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.userService.create(createUserDto, currentUser);
  }

  /**
   * Get all users (admin/moderator only)
   * @param query - Query parameters for filtering and pagination
   * @param currentUser - Current authenticated user
   * @returns Paginated list of users
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({
    summary: 'Get all users (Admin/Moderator only)',
    description: 'Retrieve paginated list of users with filters',
  })
  @ApiResponse({ status: 200, description: 'List of users' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  findAll(@Query() query: QueryUserDto, @CurrentUser() currentUser: User) {
    return this.userService.findAll(query, currentUser);
  }

  /**
   * Get user by ID
   * @param id - User ID (UUID)
   * @param currentUser - Current authenticated user
   * @returns User details
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Users can view their own profile, Admins and Moderators can view any profile',
  })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Users can only view their own profile' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.userService.findOne(id, currentUser);
  }

  /**
   * Update user
   * @param id - User ID (UUID)
   * @param updateUserDto - Data to update
   * @param currentUser - Current authenticated user
   * @returns Updated user
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update user',
    description:
      'Users can update their own profile. Admins can update any user with all fields. Moderators can update any user but only allowed fields (name, email, phone, address, avatar, password) - cannot change role, is_active, userName.',
  })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ) {
    return this.userService.update(id, updateUserDto, currentUser);
  }

  /**
   * Delete user (admin only, soft delete)
   * @param id - User ID (UUID)
   * @param currentUser - Current authenticated user (admin)
   * @returns Success message
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete user (Admin only)',
    description: 'Soft delete: sets is_active to false',
  })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ) {
    return this.userService.remove(id, currentUser);
  }
}

