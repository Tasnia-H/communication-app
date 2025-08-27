import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ChatModule } from './chat/chat.module';
import { FilesModule } from './files/files.module';
import { PrismaService } from './prisma/prisma.service';
import { AppController } from './app.controller';

@Module({
  imports: [AuthModule, UsersModule, ChatModule, FilesModule],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {}