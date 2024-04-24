import { RecruitmentDto } from './dtos/recruitment.dto';
import { RecruitmentFilter } from './dtos/recruitment-filter.dto';
import { PageResultDto } from '../../constants/page-result.dto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../config/prisma/prisma.service';
import { Message } from '../../constants/message';
import { Prisma, Role, User } from '@prisma/client';
import sortConvert from '../../helpers/sort-convert.helper';
import { CompanyService } from '../company/company.service';

export abstract class RecruitmentService {
  abstract createRecruitment(
    data: RecruitmentDto,
    user: User,
  ): Promise<RecruitmentDto>;
  abstract updateRecruitment(
    recruitmentId: number,
    data: RecruitmentDto,
    user: User,
  ): Promise<RecruitmentDto>;
  abstract deleteRecruitment(recruitmentId: number, user: User): Promise<void>;
  abstract findAll(
    filter: RecruitmentFilter,
    user: User,
  ): Promise<PageResultDto<RecruitmentDto>>;
  abstract findById(recruitmentId: number): Promise<RecruitmentDto>;
}

@Injectable()
export class RecruitmentServiceImpl extends RecruitmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly companyService: CompanyService,
  ) {
    super();
  }

  async createRecruitment(
    data: RecruitmentDto,
    user: User,
  ): Promise<RecruitmentDto> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, companyId: _companyId, ...recruitmentData } = data;
    const { companyId } = user;

    const company = await this.companyService.findById(companyId);

    if (!company) {
      throw new NotFoundException(Message.COMPANY_NOT_FOUND);
    }

    return this.prisma.recruitment.create({
      data: {
        ...recruitmentData,
        company: {
          connect: {
            id: company.id,
          },
        },
      },
    });
  }

  async updateRecruitment(
    recruitmentId: number,
    data: RecruitmentDto,
    user: User,
  ): Promise<RecruitmentDto> {
    const { companyId } = user;

    if (!companyId) {
      throw new ForbiddenException(Message.RECRUITMENT_COMPANY_FORBIDDEN);
    }

    const recruitment = await this.prisma.recruitment.findUnique({
      where: { id: recruitmentId },
    });

    if (!recruitment) {
      throw new NotFoundException(Message.RECRUITMENT_NOT_FOUND);
    }

    if (recruitment.companyId !== companyId) {
      throw new ForbiddenException(Message.RECRUITMENT_COMPANY_FORBIDDEN);
    }

    return this.prisma.recruitment.update({
      where: { id: recruitmentId },
      data,
    });
  }

  async deleteRecruitment(recruitmentId: number, user: User): Promise<void> {
    const recruitment = await this.prisma.recruitment.findUnique({
      where: {
        id: recruitmentId,
      },
    });

    if (!recruitment) {
      throw new NotFoundException(Message.RECRUITMENT_NOT_FOUND);
    }

    if (recruitment.companyId !== user.companyId) {
      throw new ForbiddenException(Message.RECRUITMENT_COMPANY_FORBIDDEN);
    }

    await this.prisma.recruitment.delete({
      where: {
        id: recruitmentId,
      },
    });
  }

  async findAll(
    filter: RecruitmentFilter,
    user: User,
  ): Promise<PageResultDto<RecruitmentDto>> {
    const {
      title,
      jobType,
      companyId,
      minSalary,
      maxSalary,
      experience,
      limit,
      offset,
      sort,
    } = filter;

    const query: Prisma.RecruitmentFindManyArgs = {
      where: {
        title: {
          contains: title,
        },
        companyId,
      },
      skip: offset,
      take: limit,
      orderBy: sortConvert(sort),
      include: {
        company: true,
      },
    };

    if (jobType) {
      query.where.jobType = {
        equals: jobType,
      };
    }

    if (minSalary) {
      query.where.minSalary = {
        gte: minSalary,
      };
    }

    if (maxSalary) {
      query.where.maxSalary = {
        lte: maxSalary,
      };
    }

    if (experience) {
      query.where.experience = {
        lte: experience,
      };
    }

    if (user.role === Role.USER) {
      query.where.deadline = {
        gte: new Date(),
      };
    }

    const result = await this.prisma.$transaction([
      this.prisma.recruitment.findMany(query),
      this.prisma.recruitment.count({ where: query.where }),
    ]);

    return PageResultDto.of(result[0], result[1], offset, limit);
  }

  async findById(recruitmentId: number): Promise<RecruitmentDto> {
    const recruitment = await this.prisma.recruitment.findUnique({
      where: {
        id: recruitmentId,
      },
      include: {
        company: true,
      },
    });

    if (!recruitment) {
      throw new NotFoundException(Message.RECRUITMENT_NOT_FOUND);
    }

    return recruitment;
  }
}
