import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles specified, allow access
    if (!requiredRoles) {
      return true;
    }

    // Get user from request (set by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // Test token bypasses all role checks (super admin privileges)
    if ((user as any).isTestToken) {
      return true;
    }

    // Check if user has required role
    return requiredRoles.some((role) => user.role === role);
  }
}

