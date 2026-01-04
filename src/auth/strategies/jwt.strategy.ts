import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';
import { User } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Validate expiration normally
      secretOrKey: secret,
    });
  }

  /**
   * Validate JWT payload and return user
   * This method is called after JWT is verified
   * For test tokens, bypass user validation and return admin user
   */
  async validate(payload: JwtPayload & { isTestToken?: boolean }): Promise<User> {
    // If this is a test token, bypass validation and return admin user
    if (payload.isTestToken) {
      const user = await this.authService.validateUser(payload);
      if (!user) {
        throw new UnauthorizedException('User not found or inactive');
      }
      // Return user with test token flag (for guards to recognize)
      return { ...user, isTestToken: true } as any;
    }

    const user = await this.authService.validateUser(payload);

    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Return user object (will be attached to request.user)
    return user;
  }
}

