import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserDto } from './dtos/user.dto';
import { Message } from '../../constants/message';
import { UserFilter } from './dtos/user-filter.dto';
import sortConvert from '../../helpers/sort-convert.helper';
import { ChangePasswordDto } from './dtos/change-password.dto';

export abstract class UserService {
  abstract getUserById(userId: number): Promise<UserDto>;
  abstract getUserByEmail(email: string): Promise<UserDto>;
  abstract createUser(data: Prisma.UserCreateInput): Promise<UserDto>;
  abstract createCompanyAdminAccount(
    data: Prisma.UserCreateInput,
  ): Promise<UserDto>;
  abstract findAll(filter: UserFilter): Promise<UserDto[]>;
  abstract changePassword(
    changePasswordDto: ChangePasswordDto,
    _user: User,
  ): Promise<void>;
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

  async changePassword(
    changePasswordDto: ChangePasswordDto,
    _user: User,
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: {
        id: _user.id,
      },
    });

    if (!user || !bcrypt.compareSync(currentPassword, user.password)) {
      throw new BadRequestException(Message.WRONG_CURRENT_PASSWORD);
    }

    await this.prisma.user.update({
      where: {
        id: _user.id,
      },
      data: {
        password: await bcrypt.hash(newPassword, 12),
      },
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
