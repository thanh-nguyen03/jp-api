import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyDto } from './dtos/company.dto';
import { CompanyFilter } from './dtos/company-filter.query';
import { PrismaService } from '../prisma/prisma.service';
import { Message } from '../../constants/message';
import sortConvert from '../../helpers/sort-convert.helper';
import { Prisma } from '@prisma/client';
import { PageResultDto } from '../../constants/page-result.dto';
import { UserService } from '../user/user.service';
import { CreateCompanyDto } from './dtos/create-company.dto';

export abstract class CompanyService {
  abstract createCompany(data: CreateCompanyDto): Promise<CompanyDto>;
  abstract findAll(filter: CompanyFilter): Promise<PageResultDto<CompanyDto>>;
  abstract findById(id: number): Promise<CompanyDto>;
  abstract findByCode(code: string): Promise<CompanyDto>;
  abstract updateCompany(id: number, data: CompanyDto): Promise<CompanyDto>;
  abstract deleteCompany(id: number): Promise<void>;
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

    return this.prisma.company.update({ where: { id }, data });
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
}
