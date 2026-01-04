import { Module } from '@nestjs/common';
import { InitService } from './services/init.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [InitService],
  exports: [InitService],
})
export class CommonModule {}
