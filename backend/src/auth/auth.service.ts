import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ManualAuthService } from './manual-auth.service';
import { GoogleAuthService } from './google-auth.service';
import * as bcrypt from 'bcryptjs';

interface GoogleUser {
  googleId: string;
  email: string;
  username: string;
  avatar?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private manualAuthService: ManualAuthService,
    private googleAuthService: GoogleAuthService,
  ) {}

  // Keep all original methods for backward compatibility
  async validateUser(email: string, password: string): Promise<any> {
    return this.manualAuthService.validateCredentials(email, password);
  }

  async validateGoogleUser(googleUser: GoogleUser): Promise<any> {
    return this.googleAuthService.validateGoogleUser(googleUser);
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
      },
    };
  }

  async register(email: string, username: string, password: string) {
    return this.manualAuthService.createUser(email, username, password);
  }
}