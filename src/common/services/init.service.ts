import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Service to initialize default admin account on application startup
 * Creates admin account if it doesn't exist
 */
@Injectable()
export class InitService implements OnModuleInit {
  private readonly logger = new Logger(InitService.name);
  private readonly saltRounds = 10;

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initialize admin account on module initialization
   */
  async onModuleInit() {
    await this.initializeAdminAccount();
  }

  /**
   * Check if admin account exists, create if not
   * @private
   */
  private async initializeAdminAccount(): Promise<void> {
    try {
      // Check if admin account already exists
      const adminExists = await this.prismaService.user.findFirst({
        where: {
          role: UserRole.ADMIN,
        },
      });

      if (adminExists) {
        console.log('Admin account already exists, skipping creation');
        return;
      }

      // Create default admin account
      const defaultEmail = this.configService.get<string>(
        'DEFAULT_ADMIN_EMAIL',
      );
      const defaultPassword = this.configService.get<string>(
        'DEFAULT_ADMIN_PASSWORD',
      );
      const defaultUsername = this.configService.get<string>(
        'DEFAULT_ADMIN_USERNAME',
      );

      if (!defaultEmail || !defaultPassword || !defaultUsername) {
        this.logger.warn(
          'DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD, or DEFAULT_ADMIN_USERNAME not set. Skipping admin account creation.',
        );
        return;
      }

      const hashedPassword = await bcrypt.hash(
        defaultPassword,
        this.saltRounds,
      );

      const admin = await this.prismaService.user.create({
        data: {
          email: defaultEmail,
          userName: defaultUsername,
          password: hashedPassword,
          name: 'System Administrator',
          role: UserRole.ADMIN,
          is_active: true,
        },
      });

      console.log(
        '═══════════════════════════════════════════════════════════',
      );
      console.log('⚠️  DEFAULT ADMIN ACCOUNT CREATED');
      console.log(
        '═══════════════════════════════════════════════════════════',
      );
      console.log(`Email: ${defaultEmail}`);
      console.log(`Username: ${defaultUsername}`);
      console.log(`Password: ${defaultPassword}`);
      console.log(`User ID: ${admin.id}`);
      console.log(
        '═══════════════════════════════════════════════════════════',
      );
      this.logger.warn(
        '⚠️  Please change the default password after first login!',
      );
      console.log(
        '═══════════════════════════════════════════════════════════',
      );
    } catch (error) {
      this.logger.error('Failed to initialize admin account:', error);
    }
  }
}
