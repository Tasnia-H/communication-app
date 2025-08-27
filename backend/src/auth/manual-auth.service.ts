import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ManualAuthService {
  constructor(private prisma: PrismaService) {}

  async validateCredentials(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.password && await bcrypt.compare(password, user.password)) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async createUser(email: string, username: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, username, password: hashedPassword },
    });
    const { password: _, ...result } = user;
    return result;
  }
}