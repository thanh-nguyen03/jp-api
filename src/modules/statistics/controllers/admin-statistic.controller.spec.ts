import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { AdminStatisticController } from './admin-statistic.controller';
import { StatisticService } from '../statistic.service';
import { Role, User } from '@prisma/client';
import ResponseDto from '../../../constants/response.dto';
import { AdminStatisticsDto } from '../dtos/admin-statistics.dto';
import { CompanyStatisticsDto } from '../dtos/company-statistics.dto';

describe('AdminStatisticController - GET /admin/statistics (Integration)', () => {
  let app: INestApplication;
  let statisticService: jest.Mocked<StatisticService>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'hashed',
    displayName: 'John Doe',
    avatar: 'avatar.png',
    role: Role.ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
    companyId: 1,
  };

  const mockAdminStats: AdminStatisticsDto = {
    totalUsers: 100,
    totalCompanies: 50,
    totalRecruitments: 200,
    totalApplications: {
      total: 500,
      accepted: 200,
      rejected: 150,
      pending: 150,
    },
    userChartStatistics: { monthlySignups: [10, 20, 30] },
    topCompanies: [{ id: 1, name: 'Company A', jobs: 50 }],
  };

  beforeEach(async () => {
    const statisticServiceMock = {
      getAdminCommonStatistics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStatisticController],
      providers: [
        {
          provide: StatisticService,
          useValue: statisticServiceMock,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    statisticService = module.get<StatisticService>(
      StatisticService,
    ) as jest.Mocked<StatisticService>;

    // Mock authentication context for Roles guard
    jest
      .spyOn(
        require('../../../decorators/current-user.decorator'),
        'CurrentUser',
      )
      .mockImplementation(() => (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        const user = req.headers['x-current-user']
          ? JSON.parse(req.headers['x-current-user'])
          : null;
        return user;
      });

    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  // TC1: ADMIN - Success
  it('TC1: should return success response for ADMIN role', async () => {
    statisticService.getAdminCommonStatistics.mockResolvedValue(mockAdminStats);

    const response = await request(app.getHttpServer())
      .get('/admin/statistics')
      .set('x-current-user', JSON.stringify(mockUser))
      .expect(200);

    expect(statisticService.getAdminCommonStatistics).toHaveBeenCalled();
    expect(response.body).toEqual(ResponseDto.successDefault(mockAdminStats));
  });

  // TC2: Invalid role - Forbidden (403)
  it('TC2: should return 403 for invalid role', async () => {
    const invalidUser = { ...mockUser, role: Role.USER };

    await request(app.getHttpServer())
      .get('/admin/statistics')
      .set('x-current-user', JSON.stringify(invalidUser))
      .expect(403);

    expect(statisticService.getAdminCommonStatistics).not.toHaveBeenCalled();
  });

  // TC3: Null user - Unauthorized (401)
  it('TC3: should return 401 for null user', async () => {
    await request(app.getHttpServer()).get('/admin/statistics').expect(401);

    expect(statisticService.getAdminCommonStatistics).not.toHaveBeenCalled();
  });

  // TC4: Service error - Error propagated
  it('TC4: should return 500 for service error', async () => {
    const error = new Error('Service error');
    statisticService.getAdminCommonStatistics.mockRejectedValue(error);

    await request(app.getHttpServer())
      .get('/admin/statistics')
      .set('x-current-user', JSON.stringify(mockUser))
      .expect(500);

    expect(statisticService.getAdminCommonStatistics).toHaveBeenCalled();
  });
});

describe('AdminStatisticController - GET /admin/statistics/company (Integration)', () => {
  let app: INestApplication;
  let statisticService: jest.Mocked<StatisticService>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'hashed',
    displayName: 'John Doe',
    avatar: 'avatar.png',
    role: Role.ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
    companyId: 1,
  };

  const mockCompanyStats: CompanyStatisticsDto = {
    totalRecruitments: 10,
    totalApplications: {
      total: 50,
      accepted: 20,
      rejected: 15,
      pending: 15,
    },
    totalHRs: 5,
  };

  beforeEach(async () => {
    const statisticServiceMock = {
      getCompanyCommonStatistics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStatisticController],
      providers: [
        {
          provide: StatisticService,
          useValue: statisticServiceMock,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    statisticService = module.get<StatisticService>(
      StatisticService,
    ) as jest.Mocked<StatisticService>;

    app.use((req, res, next) => {
      if (req.headers['x-current-user']) {
        const rawUser = JSON.parse(req.headers['x-current-user']);
        req.user = {
          ...rawUser,
          createdAt: new Date(rawUser.createdAt),
          updatedAt: new Date(rawUser.updatedAt),
        };
      }
      next();
    });

    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  // TC1: COMPANY_ADMIN - Success
  it('TC1: should return success response for COMPANY_ADMIN role', async () => {
    const companyAdminUser = { ...mockUser, role: Role.COMPANY_ADMIN };
    statisticService.getCompanyCommonStatistics.mockResolvedValue(
      mockCompanyStats,
    );

    const response = await request(app.getHttpServer())
      .get('/admin/statistics/company')
      .set('x-current-user', JSON.stringify(companyAdminUser))
      .expect(200);

    expect(statisticService.getCompanyCommonStatistics).toHaveBeenCalledWith(
      companyAdminUser,
    );
    expect(response.body).toEqual(ResponseDto.successDefault(mockCompanyStats));
  });

  // TC2: COMPANY_HR - Success
  it('TC2: should return success response for COMPANY_HR role', async () => {
    const companyHrUser = { ...mockUser, role: Role.COMPANY_HR };
    statisticService.getCompanyCommonStatistics.mockResolvedValue(
      mockCompanyStats,
    );

    const response = await request(app.getHttpServer())
      .get('/admin/statistics/company')
      .set('x-current-user', JSON.stringify(companyHrUser))
      .expect(200);

    expect(statisticService.getCompanyCommonStatistics).toHaveBeenCalledWith(
      companyHrUser,
    );
    expect(response.body).toEqual(ResponseDto.successDefault(mockCompanyStats));
  });

  // TC3: Invalid role - Forbidden (403)
  it('TC3: should return 403 for invalid role', async () => {
    const invalidUser = { ...mockUser, role: Role.USER };

    await request(app.getHttpServer())
      .get('/admin/statistics/company')
      .set('x-current-user', JSON.stringify(invalidUser))
      .expect(403);

    expect(statisticService.getCompanyCommonStatistics).not.toHaveBeenCalled();
  });

  // TC4: Null user - Unauthorized (401)
  it('TC4: should return 401 for null user', async () => {
    await request(app.getHttpServer())
      .get('/admin/statistics/company')
      .expect(401);

    expect(statisticService.getCompanyCommonStatistics).not.toHaveBeenCalled();
  });
});
