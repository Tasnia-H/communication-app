import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  Response,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { createReadStream, existsSync } from 'fs';
import { Response as ExpressResponse } from 'express';

// File size limits (in bytes)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  // Audio/Video (for preview)
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/webm',
];

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FileController {
  constructor(private prisma: PrismaService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = uuidv4();
          const ext = extname(file.originalname);
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
      fileFilter: (req, file, callback) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              `File type ${file.mimetype} is not allowed`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Save file metadata to database
      const fileRecord = await this.prisma.file.create({
        data: {
          originalName: file.originalname,
          fileName: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          path: file.path,
          uploaderId: req.user.sub,
        },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      return {
        id: fileRecord.id,
        originalName: fileRecord.originalName,
        fileName: fileRecord.fileName,
        mimeType: fileRecord.mimeType,
        size: fileRecord.size,
        createdAt: fileRecord.createdAt,
        uploader: fileRecord.uploader,
      };
    } catch (error) {
      console.error('Failed to save file metadata:', error);
      throw new BadRequestException('Failed to upload file');
    }
  }

  @Get(':id')
  async getFile(
    @Param('id') id: string,
    @Response() res: ExpressResponse,
    @Request() req,
  ) {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id },
        include: {
          uploader: true,
        },
      });

      if (!file) {
        throw new NotFoundException('File not found');
      }

      // Check if user has access to this file
      // For now, allow access if user is sender or receiver of a message with this file
      const hasAccess = await this.checkFileAccess(id, req.user.sub);
      if (!hasAccess) {
        throw new NotFoundException('File not found');
      }

      const filePath = join(process.cwd(), file.path);
      
      if (!existsSync(filePath)) {
        throw new NotFoundException('File not found on disk');
      }

      // Set appropriate headers
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${file.originalName}"`,
      );
      res.setHeader('Content-Length', file.size);

      // Stream the file
      const fileStream = createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Error serving file:', error);
      throw new NotFoundException('File not found');
    }
  }

  @Get(':id/info')
  async getFileInfo(@Param('id') id: string, @Request() req) {
    try {
      const file = await this.prisma.file.findUnique({
        where: { id },
        include: {
          uploader: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      if (!file) {
        throw new NotFoundException('File not found');
      }

      // Check if user has access to this file
      const hasAccess = await this.checkFileAccess(id, req.user.sub);
      if (!hasAccess) {
        throw new NotFoundException('File not found');
      }

      return {
        id: file.id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        createdAt: file.createdAt,
        uploader: file.uploader,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error getting file info:', error);
      throw new NotFoundException('File not found');
    }
  }

  private async checkFileAccess(fileId: string, userId: string): Promise<boolean> {
    // Check if user uploaded this file
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (file?.uploaderId === userId) {
      return true;
    }

    // Check if user is sender or receiver of a message containing this file
    const messageWithFile = await this.prisma.message.findFirst({
      where: {
        fileId: fileId,
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
    });

    return !!messageWithFile;
  }
}