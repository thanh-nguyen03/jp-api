import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CompanyDto } from './dtos/company.dto';
import { CompanyFilter } from './dtos/company-filter.query';
import { PrismaService } from '../../config/prisma/prisma.service';
import { Message } from '../../constants/message';
import sortConvert from '../../helpers/sort-convert.helper';
import { Prisma } from '@prisma/client';
import { PageResultDto } from '../../constants/page-result.dto';

export abstract class CompanyService {
  abstract createCompany(data: CompanyDto): Promise<CompanyDto>;
  abstract findAll(filter: CompanyFilter): Promise<PageResultDto<CompanyDto>>;
  abstract findById(id: number): Promise<CompanyDto>;
  abstract findByCode(code: string): Promise<CompanyDto>;
  abstract updateCompany(id: number, data: CompanyDto): Promise<CompanyDto>;
  abstract deleteCompany(id: number): Promise<void>;
}

@Injectable()
export class CompanyServiceImpl extends CompanyService {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createCompany(data: CompanyDto): Promise<CompanyDto> {
    const { code } = data;
    const existingCompany = await this.prisma.company.findUnique({
      where: { code },
    });

    if (existingCompany) {
      throw new BadRequestException(Message.COMPANY_CODE_ALREADY_EXISTS(code));
    }

    return this.prisma.company.create({ data });
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
    };

    const result = await this.prisma.$transaction([
      this.prisma.company.findMany(query),
      this.prisma.company.count({ where: query.where }),
    ]);

    const [companies, total] = result;
    return PageResultDto.of(companies, total, offset, limit);
  }

  async findById(id: number): Promise<CompanyDto> {
    const company = await this.prisma.company.findUnique({ where: { id } });

    if (!company) {
      throw new NotFoundException(Message.COMPANY_NOT_FOUND);
    }

    return company;
  }

  async findByCode(code: string): Promise<CompanyDto> {
    const company = await this.prisma.company.findUnique({ where: { code } });

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
  }
}
