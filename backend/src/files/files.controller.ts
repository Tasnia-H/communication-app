import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Request,
  Res,
  NotFoundException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';
import * as fs from 'fs';

@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(
    private prisma: PrismaService,
    @Inject(ChatGateway) private chatGateway: ChatGateway,
  ) {}

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
        fileSize: 50 * 1024 * 1024, // 50MB limit for fallback uploads
      },
      fileFilter: (req, file, callback) => {
        callback(null, true); // Allow all file types
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { receiverId: string },
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Debug logging
    console.log('Upload request - req.user:', req.user);
    console.log('Upload request - body:', body);

    const senderId = req.user?.sub || req.user?.id;
    const { receiverId } = body;

    if (!senderId) {
      // Clean up uploaded file if no valid user
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new BadRequestException('Invalid user authentication');
    }

    if (!receiverId) {
      // Clean up uploaded file if no receiver
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new BadRequestException('Receiver ID is required');
    }

    try {
      // Create message record with file URL
      const message = await this.prisma.message.create({
        data: {
          content: `Sent a file: ${file.originalname}`,
          type: 'file',
          fileName: file.originalname,
          fileSize: file.size,
          fileType: file.mimetype,
          fileUrl: `/files/download/${file.filename}`, // Store relative URL
          senderId,
          receiverId,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
          receiver: {
            select: {
              id: true,
              username: true,
              email: true,
              avatar: true,
            },
          },
        },
      });

      // Notify users via WebSocket
      await this.chatGateway.notifyFileUploadComplete(message);

      return {
        message: 'File uploaded successfully',
        data: message,
      };
    } catch (error) {
      console.error('Database error during file upload:', error);
      
      // Clean up uploaded file if database operation fails
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw error;
    }
  }

  @Get('download/:filename')
  async downloadFile(
    @Param('filename') filename: string,
    @Res() res: Response,
    @Request() req,
  ) {
    const userId = req.user?.sub || req.user?.id;
    
    if (!userId) {
      throw new BadRequestException('Invalid user authentication');
    }
    
    const filePath = `./uploads/${filename}`;

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File not found');
    }

    try {
      // Verify user has access to this file
      const message = await this.prisma.message.findFirst({
        where: {
          fileUrl: `/files/download/${filename}`,
          OR: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
      });

      if (!message) {
        throw new NotFoundException('File not found or access denied');
      }

      // Get file stats for Content-Length
      const stats = fs.statSync(filePath);

      // Set proper headers for file download
      res.setHeader('Content-Type', 'application/octet-stream'); // Force download
      res.setHeader('Content-Disposition', `attachment; filename="${message.fileName}"`);
      res.setHeader('Content-Length', stats.size.toString());
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Accept-Ranges', 'bytes');
      
      // Add CORS headers if needed
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      
      // Handle stream errors
      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'File read error' });
        }
      });

      // Pipe the file to response
      fileStream.pipe(res);
      
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('Download error:', error);
      throw new NotFoundException('File not found');
    }
  }
}