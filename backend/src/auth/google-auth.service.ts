import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GoogleAuthService {
  constructor(private prisma: PrismaService) {}

  async validateGoogleUser(googleUser: any) {
    const { googleId, email, username, avatar } = googleUser;
    
    let user = await this.prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email } });
      if (user) {
        user = await this.prisma.user.update({
          where: { email },
          data: { googleId, avatar },
        });
      } else {
        let uniqueUsername = username;
        let counter = 1;
        while (await this.prisma.user.findUnique({ where: { username: uniqueUsername } })) {
          uniqueUsername = `${username}${counter}`;
          counter++;
        }
        user = await this.prisma.user.create({
          data: { googleId, email, username: uniqueUsername, avatar },
        });
      }
    }

    const { password, ...result } = user;
    return result;
  }
}