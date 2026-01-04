import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // For public routes, still try to extract user from token if present
      // but don't fail if token is missing or invalid
      const result = super.canActivate(context);
      if (result instanceof Promise) {
        return result.catch(() => true); // Allow access even if token is invalid
      }
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: unknown, user: any, info: unknown, context: ExecutionContext, status?: any): TUser {
    // For public routes, return user if exists, otherwise undefined
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // Public route: allow access even without token
      return user || undefined;
    }

    // Protected route: require valid token
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}

