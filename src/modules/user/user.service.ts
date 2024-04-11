import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../config/prisma/prisma.service';
import { UserDto } from './dtos/user.dto';
import { Message } from '../../constants/message';

export abstract class UserService {
  abstract getUserById(userId: number): Promise<UserDto>;
  abstract getUserByEmail(email: string): Promise<UserDto>;
  abstract createUser(data: Prisma.UserCreateInput): Promise<UserDto>;
}

@Injectable()
export class UserServiceImpl extends UserService {
  async getUserById(userId: number): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException(Message.USER_NOT_FOUND(userId.toString()));
    }

    return user;
  }

  async getUserByEmail(email: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new NotFoundException(Message.USER_NOT_FOUND(email));
    }

    return user;
  }
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createUser(data: Prisma.UserCreateInput): Promise<UserDto> {
    const { email } = data;

    const existingUser = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      throw new BadRequestException(Message.USER_ALREADY_EXISTS(email));
    }

    return this.prisma.user.create({
      data: {
        ...data,
        password: await bcrypt.hash(data.password, 12),
        role: 'USER',
      },
    });
  }
}
