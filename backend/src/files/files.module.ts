import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [FileController],
  providers: [PrismaService],
})
export class FilesModule {}