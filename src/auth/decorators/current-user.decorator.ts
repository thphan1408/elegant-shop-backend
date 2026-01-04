import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

/**
 * Decorator to extract current user from request
 * Usage: @CurrentUser() user: User
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
