import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserDto } from './dtos/user.dto';
import { Message } from '../../constants/message';
import { UserFilter } from './dtos/user-filter.dto';
import sortConvert from '../../helpers/sort-convert.helper';

export abstract class UserService {
  abstract getUserById(userId: number): Promise<UserDto>;
  abstract getUserByEmail(email: string): Promise<UserDto>;
  abstract createUser(data: Prisma.UserCreateInput): Promise<UserDto>;
  abstract createCompanyAdminAccount(
    data: Prisma.UserCreateInput,
  ): Promise<UserDto>;
  abstract findAll(filter: UserFilter): Promise<UserDto[]>;
}

@Injectable()
export class UserServiceImpl extends UserService {
  async getUserById(userId: number): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      include: {
        company: true,
        applications: {
          include: {
            recruitment: {
              include: {
                company: true,
              },
            },
          },
        },
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

    const existingUser = await this.checkUserExists(email);

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

  async createCompanyAdminAccount(
    data: Prisma.UserCreateInput,
  ): Promise<UserDto> {
    const { email } = data;

    const existingUser = await this.checkUserExists(email);

    if (existingUser) {
      throw new BadRequestException(Message.USER_ALREADY_EXISTS(email));
    }

    return this.prisma.user.create({
      data: {
        ...data,
        password: await bcrypt.hash(data.password, 12),
        role: 'COMPANY_ADMIN',
      },
    });
  }

  async findAll(filter: UserFilter): Promise<UserDto[]> {
    const { name, email, sort } = filter;

    return this.prisma.user.findMany({
      where: {
        firstName: {
          contains: name,
        },
        lastName: {
          contains: name,
        },
        email: {
          contains: email,
        },
      },
      orderBy: sortConvert(sort),
    });
  }
  private checkUserExists(email: string): Promise<UserDto> {
    return this.prisma.user
      .findUnique({
        where: {
          email,
        },
      })
      .then((user) => user);
  }
}
