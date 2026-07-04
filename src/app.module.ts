import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from 'src/configs/logger.config';
import { CustomConfigModule } from './configs/config.module';
import {
  ThrottlerModule,
  ThrottlerGuard,
  ThrottlerException,
} from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './product/product.module';
import { ReviewModule } from './review/review.module';
import { FAQModule } from './faq/faq.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { OrderModule } from './order/order.module';
import { CommonModule } from './common/common.module';
import { NotificationModule } from './notification/notification.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    WinstonModule.forRoot(winstonConfig),
    CustomConfigModule,
    PrismaModule,
    CommonModule, // Import CommonModule to initialize InitService
    ProductModule,
    ReviewModule,
    FAQModule,
    AuthModule,
    UserModule,
    OrderModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
