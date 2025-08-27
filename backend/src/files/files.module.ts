import { Module, forwardRef } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FilesController } from './files.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
    }),
    forwardRef(() => ChatModule),
  ],
  controllers: [FilesController],
  providers: [PrismaService],
})
export class FilesModule {}