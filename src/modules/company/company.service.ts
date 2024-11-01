import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CompanyDto } from './dtos/company.dto';
import { CompanyFilter } from './dtos/company-filter.query';
import { PrismaService } from '../prisma/prisma.service';
import { Message } from '../../constants/message';
import sortConvert from '../../helpers/sort-convert.helper';
import { Prisma, User } from '@prisma/client';
import { PageResultDto } from '../../constants/page-result.dto';
import { UserService } from '../user/user.service';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { UserDto } from '../user/dtos/user.dto';
import * as bcrypt from 'bcrypt';

export abstract class CompanyService {
  abstract createCompany(data: CreateCompanyDto): Promise<CompanyDto>;
  abstract findAll(filter: CompanyFilter): Promise<PageResultDto<CompanyDto>>;
  abstract findById(id: number): Promise<CompanyDto>;
  abstract findByCode(code: string): Promise<CompanyDto>;
  abstract updateCompany(id: number, data: CompanyDto): Promise<CompanyDto>;
  abstract deleteCompany(id: number): Promise<void>;
  abstract createCompanyHR(
    data: Prisma.UserCreateInput[],
    _user: User,
  ): Promise<UserDto[]>;
  abstract getCompanyHRList(_user: User): Promise<UserDto[]>;
  abstract deleteCompanyHR(id: number, _user: User): Promise<void>;
}

@Injectable()
export class CompanyServiceImpl extends CompanyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {
    super();
  }

  async createCompany(data: CreateCompanyDto): Promise<CompanyDto> {
    const {
      code,
      companyAccountEmail,
      companyAccountFirstName,
      companyAccountLastName,
      companyAccountPassword,
      ...companyData
    } = data;
    const existingCompany = await this.prisma.company.findUnique({
      where: { code },
    });

    if (existingCompany) {
      throw new BadRequestException(Message.COMPANY_CODE_ALREADY_EXISTS(code));
    }

    const user = await this.userService.createCompanyAdminAccount({
      email: companyAccountEmail,
      firstName: companyAccountFirstName,
      lastName: companyAccountLastName,
      password: companyAccountPassword,
    });

    return this.prisma.company.create({
      data: {
        code,
        ...companyData,
        accounts: {
          connect: {
            id: user.id,
          },
        },
      },
    });
  }

  async findAll(filter: CompanyFilter): Promise<PageResultDto<CompanyDto>> {
    const { code, name, offset, limit, sort } = filter;

    const query: Prisma.CompanyFindManyArgs = {
      where: {
        code: { contains: code },
        name: { contains: name },
      },
      skip: offset,
      take: limit,
      orderBy: sortConvert(sort),
      include: {
        recruitments: true,
      },
    };

    const result = await this.prisma.$transaction([
      this.prisma.company.findMany(query),
      this.prisma.company.count({ where: query.where }),
    ]);

    const [companies, total] = result;
    return PageResultDto.of(companies, total, offset, limit);
  }

  async findById(id: number): Promise<CompanyDto> {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { recruitments: true },
    });

    if (!company) {
      throw new NotFoundException(Message.COMPANY_NOT_FOUND);
    }

    return company;
  }

  async findByCode(code: string): Promise<CompanyDto> {
    const company = await this.prisma.company.findUnique({
      where: { code },
      include: { recruitments: true },
    });

    if (!company) {
      throw new NotFoundException(Message.COMPANY_CODE_NOT_FOUND(code));
    }

    return company;
  }

  async updateCompany(id: number, data: CompanyDto): Promise<CompanyDto> {
    const company = await this.prisma.company.findUnique({ where: { id } });

    if (!company) {
      throw new NotFoundException(Message.COMPANY_NOT_FOUND);
    }

    const { code, name, description, address } = data;

    return this.prisma.company.update({
      where: { id },
      data: {
        code,
        name,
        description,
        address,
      },
    });
  }

  async deleteCompany(id: number): Promise<void> {
    const company = await this.prisma.company.findUnique({ where: { id } });

    if (!company) {
      throw new NotFoundException(Message.COMPANY_NOT_FOUND);
    }

    await this.prisma.company.delete({ where: { id } });
    await this.prisma.user.deleteMany({
      where: {
        companyId: id,
      },
    });
  }

  async createCompanyHR(
    data: Prisma.UserCreateInput[],
    _user: User,
  ): Promise<UserDto[]> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: _user.id,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.role !== 'COMPANY_ADMIN') {
      throw new ForbiddenException();
    }

    return this.prisma.$transaction(
      data.map((item) =>
        this.prisma.user.create({
          data: {
            ...item,
            password: bcrypt.hashSync(item.password, 12),
            role: 'COMPANY_HR',
            company: {
              connect: {
                id: user.companyId,
              },
            },
          },
        }),
      ),
    );
  }

  async getCompanyHRList(_user: User): Promise<UserDto[]> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: _user.id,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.role !== 'COMPANY_ADMIN') {
      throw new ForbiddenException();
    }

    return this.prisma.user.findMany({
      where: {
        companyId: user.companyId,
        role: 'COMPANY_HR',
      },
    });
  }

  async deleteCompanyHR(id: number, _user: User): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: _user.id,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.role !== 'COMPANY_ADMIN') {
      throw new ForbiddenException();
    }

    await this.prisma.user.delete({
      where: {
        id,
        companyId: user.companyId,
        role: 'COMPANY_HR',
      },
    });
  }
}
