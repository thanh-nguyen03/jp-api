import { BadRequestException, Injectable } from '@nestjs/common';
import { Token, User } from '@prisma/client';
import { LoginRequestDto } from './dtos/login-request.dto';
import { LoginResponseDto } from './dtos/login-response.dto';
import { RefreshAccessTokenRequestDto } from './dtos/refresh-access-token-request.dto';
import { RefreshAccessTokenResponseDto } from './dtos/refresh-access-token-response.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../config/prisma/prisma.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { Message } from '../../constants/message';
import { RegisterRequestDto } from './dtos/register-request.dto';

const { createHash, randomBytes } = crypto;

export abstract class AuthService {
  abstract validateUser(email: string, password: string): Promise<User>;
  abstract login(loginRequestDto: LoginRequestDto): Promise<LoginResponseDto>;
  abstract register(registerRequestDto: RegisterRequestDto): Promise<void>;
  abstract refreshAccessToken(
    refreshAccessTokenRequestDto: RefreshAccessTokenRequestDto,
  ): Promise<RefreshAccessTokenResponseDto>;
}

@Injectable()
export class AuthServiceImpl extends AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {
    super();
  }

  async login(loginRequestDto: LoginRequestDto): Promise<LoginResponseDto> {
    const { email } = loginRequestDto;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...user } = await this.userService.getUserByEmail(email);

    const payload = {
      sub: user.displayName,
      user,
    };

    const access_token = this.jwtService.sign(payload);
    const token = await this.saveToken(user.id, access_token);

    return {
      access_token,
      refresh_token: token.refresh_token,
      user,
    };
  }

  async register(registerRequestDto: RegisterRequestDto): Promise<void> {
    await this.userService.createUser(registerRequestDto);
  }

  async refreshAccessToken(
    refreshAccessTokenRequestDto: RefreshAccessTokenRequestDto,
  ): Promise<RefreshAccessTokenResponseDto> {
    const { refresh_token } = refreshAccessTokenRequestDto;

    const token = await this.prisma.token.findFirst({
      where: {
        refresh_token,
        // and expiresAt is greater than the current date
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!token) {
      throw new BadRequestException(Message.INVALID_REFRESH_TOKEN);
    }

    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      user: { password, ...user },
    } = token;

    const payload = {
      sub: user.displayName,
      user,
    };

    const access_token = this.jwtService.sign(payload);
    await this.saveToken(user.id, access_token, token);

    return {
      access_token,
      refresh_token,
      user,
    };
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userService.getUserByEmail(email);

    if (!(user && bcrypt.compareSync(password, user.password))) {
      throw new BadRequestException(Message.WRONG_EMAIL_OR_PASSWORD);
    }

    return user;
  }

  private async saveToken(
    userId: number,
    accessToken: string,
    existingToken: Token = null,
  ) {
    if (existingToken) {
      existingToken.access_token = accessToken;
      return this.prisma.token.update({
        where: {
          id: existingToken.id,
        },
        data: {
          access_token: accessToken,
        },
      });
    }

    return this.prisma.token.create({
      data: {
        access_token: accessToken,
        refresh_token: this.generateRefreshToken(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  private generateRefreshToken(): string {
    return createHash('sha256')
      .update(randomBytes(32).toString('hex'))
      .digest('hex');
  }
}
