import { Injectable } from '@nestjs/common';
import { AdminStatisticsDto } from './dtos/admin-statistics.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import { CompanyStatisticsDto } from './dtos/company-statistics.dto';

export abstract class StatisticService {
  abstract getAdminCommonStatistics(): Promise<AdminStatisticsDto>;
  abstract getCompanyCommonStatistics(
    user: User,
  ): Promise<CompanyStatisticsDto>;
  abstract getUserChartStatistics(): Promise<any>;
}

@Injectable()
export class StatisticServiceImpl extends StatisticService {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getAdminCommonStatistics(): Promise<AdminStatisticsDto> {
    const totalUsers = await this.prisma.user.count({
      where: {
        role: 'USER',
      },
    });
    const totalCompanies = await this.prisma.company.count();
    const totalRecruitments = await this.prisma.recruitment.count();
    const totalApplications = {
      total: await this.prisma.application.count(),
      pending: await this.prisma.application.count({
        where: {
          status: 'PENDING',
        },
      }),
      accepted: await this.prisma.application.count({
        where: {
          status: 'APPROVED',
        },
      }),
      rejected: await this.prisma.application.count({
        where: {
          status: 'REJECTED',
        },
      }),
    };

    // get number of users registered in each month of the last year
    const userChartStatistics = await this.getUserChartStatistics();

    // sort the companies by the number of recruitments and return top 5
    const topCompanies = await this.prisma.company.findMany({
      include: {
        recruitments: {
          include: {
            applications: true,
          },
        },
      },
      orderBy: {
        recruitments: {
          _count: 'desc',
        },
      },
      take: 5,
    });

    return {
      totalUsers,
      totalCompanies,
      totalRecruitments,
      totalApplications,
      userChartStatistics,
      topCompanies,
    };
  }

  async getCompanyCommonStatistics(user: User): Promise<CompanyStatisticsDto> {
    const totalRecruitments = await this.prisma.recruitment.count({
      where: {
        companyId: user.companyId,
      },
    });
    const totalApplications = {
      total: await this.prisma.application.count({
        where: {
          recruitment: {
            companyId: user.companyId,
          },
        },
      }),
      pending: await this.prisma.application.count({
        where: {
          status: 'PENDING',
          recruitment: {
            companyId: user.companyId,
          },
        },
      }),
      accepted: await this.prisma.application.count({
        where: {
          status: 'APPROVED',
          recruitment: {
            companyId: user.companyId,
          },
        },
      }),
      rejected: await this.prisma.application.count({
        where: {
          status: 'REJECTED',
          recruitment: {
            companyId: user.companyId,
          },
        },
      }),
    };

    const totalHRs = await this.prisma.user.count({
      where: {
        companyId: user.companyId,
        role: 'COMPANY_HR',
      },
    });

    return {
      totalRecruitments,
      totalApplications,
      totalHRs,
    };
  }

  async getUserChartStatistics(): Promise<any> {
    const users = await this.prisma.user.findMany({
      where: {
        // user role
        role: 'USER',
      },
      select: {
        createdAt: true,
      },
    });

    const userCount = users.reduce((acc, user) => {
      const month = user.createdAt.getMonth();
      acc[month] = acc[month] ? acc[month] + 1 : 1;
      return acc;
    }, {});

    return Array.from({ length: 12 }, (_, i) => ({
      label: new Date(2021, i).toLocaleString('en-US', { month: 'long' }),
      data: userCount[i] || 0,
    }));
  }
}
