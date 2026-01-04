import { Module } from '@nestjs/common';
import { FAQService } from './faq.service';
import { FAQController } from './faq.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [FAQController],
  providers: [FAQService],
  exports: [FAQService],
})
export class FAQModule {}

