import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { AdminStatisticController } from './admin-statistic.controller';
import { StatisticService } from '../statistic.service';
import { Role, User } from '@prisma/client';
import ResponseDto from '../../../constants/response.dto';
import { AdminStatisticsDto } from '../dtos/admin-statistics.dto';
import { CompanyStatisticsDto } from '../dtos/company-statistics.dto';

// Test suite for AdminStatisticController GET /admin/statistics endpoint
describe('AdminStatisticController - GET /admin/statistics (Integration)', () => {
  let nestApp: INestApplication;
  let mockedStatisticService: jest.Mocked<StatisticService>;

  // Mock user data for testing
  const adminUser: User = {
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

  // Mock admin statistics data
  const adminStatistics: AdminStatisticsDto = {
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

  // Setup before each test
  beforeEach(async () => {
    const statisticServiceMock = {
      getAdminCommonStatistics: jest.fn(),
    };

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStatisticController],
      providers: [
        {
          provide: StatisticService,
          useValue: statisticServiceMock,
        },
      ],
    }).compile();

    nestApp = module.createNestApplication();
    mockedStatisticService = module.get<StatisticService>(
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

    await nestApp.init();
  });

  // Cleanup after each test
  afterEach(async () => {
    jest.clearAllMocks();
    await nestApp.close();
  });

  /**
   * Test Case: TC1_Stat_AdminSuccess
   * Objective: Verify that an ADMIN user can successfully retrieve statistics
   * Input: Valid ADMIN user in header
   * Expected Output: HTTP 200 with admin statistics data
   * Notes: Tests successful statistics retrieval for authorized admin
   */
  it('TC1_Stat_AdminSuccess: should return success response for ADMIN role', async () => {
    mockedStatisticService.getAdminCommonStatistics.mockResolvedValue(
      adminStatistics,
    );

    const response = await request(nestApp.getHttpServer())
      .get('/admin/statistics')
      .set('x-current-user', JSON.stringify(adminUser))
      .expect(200);

    expect(mockedStatisticService.getAdminCommonStatistics).toHaveBeenCalled();
    expect(response.body).toEqual(ResponseDto.successDefault(adminStatistics));
  });

  /**
   * Test Case: TC2_Stat_InvalidRole
   * Objective: Verify that non-ADMIN users receive Forbidden error
   * Input: User with USER role in header
   * Expected Output: HTTP 403 Forbidden
   * Notes: Tests role-based access control
   */
  it('TC2_Stat_InvalidRole: should return 403 for invalid role', async () => {
    const nonAdminUser = { ...adminUser, role: Role.USER };

    await request(nestApp.getHttpServer())
      .get('/admin/statistics')
      .set('x-current-user', JSON.stringify(nonAdminUser))
      .expect(403);

    expect(
      mockedStatisticService.getAdminCommonStatistics,
    ).not.toHaveBeenCalled();
  });

  /**
   * Test Case: TC3_Stat_NullUser
   * Objective: Verify that requests without user authentication return Unauthorized
   * Input: No user header
   * Expected Output: HTTP 401 Unauthorized
   * Notes: Tests authentication requirement
   */
  it('TC3_Stat_NullUser: should return 401 for null user', async () => {
    await request(nestApp.getHttpServer()).get('/admin/statistics').expect(401);

    expect(
      mockedStatisticService.getAdminCommonStatistics,
    ).not.toHaveBeenCalled();
  });

  /**
   * Test Case: TC4_Stat_ServiceError
   * Objective: Verify that service errors are properly propagated
   * Input: Valid ADMIN user, mocked service error
   * Expected Output: HTTP 500 Internal Server Error
   * Notes: Tests error handling
   */
  it('TC4_Stat_ServiceError: should return 500 for service error', async () => {
    const serviceError = new Error('Service error');
    mockedStatisticService.getAdminCommonStatistics.mockRejectedValue(
      serviceError,
    );

    await request(nestApp.getHttpServer())
      .get('/admin/statistics')
      .set('x-current-user', JSON.stringify(adminUser))
      .expect(500);

    expect(mockedStatisticService.getAdminCommonStatistics).toHaveBeenCalled();
  });
});

// Test suite for AdminStatisticController GET /admin/statistics/company endpoint
describe('AdminStatisticController - GET /admin/statistics/company (Integration)', () => {
  let nestApp: INestApplication;
  let mockedStatisticService: jest.Mocked<StatisticService>;

  // Mock user data for testing
  const adminUser: User = {
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

  // Mock company statistics data
  const companyStatistics: CompanyStatisticsDto = {
    totalRecruitments: 10,
    totalApplications: {
      total: 50,
      accepted: 20,
      rejected: 15,
      pending: 15,
    },
    totalHRs: 5,
  };

  // Setup before each test
  beforeEach(async () => {
    const statisticServiceMock = {
      getCompanyCommonStatistics: jest.fn(),
    };

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminStatisticController],
      providers: [
        {
          provide: StatisticService,
          useValue: statisticServiceMock,
        },
      ],
    }).compile();

    nestApp = module.createNestApplication();
    mockedStatisticService = module.get<StatisticService>(
      StatisticService,
    ) as jest.Mocked<StatisticService>;

    // Middleware to parse user header
    nestApp.use((req, res, next) => {
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

    await nestApp.init();
  });

  // Cleanup after each test
  afterEach(async () => {
    jest.clearAllMocks();
    await nestApp.close();
  });

  /**
   * Test Case: TC5_Stat_CompanyAdminSuccess
   * Objective: Verify that COMPANY_ADMIN can retrieve company statistics
   * Input: Valid COMPANY_ADMIN user in header
   * Expected Output: HTTP 200 with company statistics
   * Notes: Tests successful statistics retrieval for company admin
   */
  it('TC5_Stat_CompanyAdminSuccess: should return success response for COMPANY_ADMIN role', async () => {
    const companyAdminUser = { ...adminUser, role: Role.COMPANY_ADMIN };
    mockedStatisticService.getCompanyCommonStatistics.mockResolvedValue(
      companyStatistics,
    );

    const response = await request(nestApp.getHttpServer())
      .get('/admin/statistics/company')
      .set('x-current-user', JSON.stringify(companyAdminUser))
      .expect(200);

    expect(
      mockedStatisticService.getCompanyCommonStatistics,
    ).toHaveBeenCalledWith(companyAdminUser);
    expect(response.body).toEqual(
      ResponseDto.successDefault(companyStatistics),
    );
  });

  /**
   * Test Case: TC6_Stat_CompanyHrSuccess
   * Objective: Verify that COMPANY_HR can retrieve company statistics
   * Input: Valid COMPANY_HR user in header
   * Expected Output: HTTP 200 with company statistics
   * Notes: Tests successful statistics retrieval for company HR
   */
  it('TC6_Stat_CompanyHrSuccess: should return success response for COMPANY_HR role', async () => {
    const companyHrUser = { ...adminUser, role: Role.COMPANY_HR };
    mockedStatisticService.getCompanyCommonStatistics.mockResolvedValue(
      companyStatistics,
    );

    const response = await request(nestApp.getHttpServer())
      .get('/admin/statistics/company')
      .set('x-current-user', JSON.stringify(companyHrUser))
      .expect(200);

    expect(
      mockedStatisticService.getCompanyCommonStatistics,
    ).toHaveBeenCalledWith(companyHrUser);
    expect(response.body).toEqual(
      ResponseDto.successDefault(companyStatistics),
    );
  });

  /**
   * Test Case: TC7_Stat_CompanyInvalidRole
   * Objective: Verify that non-authorized roles receive Forbidden error
   * Input: User with USER role in header
   * Expected Output: HTTP 403 Forbidden
   * Notes: Tests role-based access control
   */
  it('TC7_Stat_CompanyInvalidRole: should return 403 for invalid role', async () => {
    const nonAuthorizedUser = { ...adminUser, role: Role.USER };

    await request(nestApp.getHttpServer())
      .get('/admin/statistics/company')
      .set('x-current-user', JSON.stringify(nonAuthorizedUser))
      .expect(403);

    expect(
      mockedStatisticService.getCompanyCommonStatistics,
    ).not.toHaveBeenCalled();
  });

  /**
   * Test Case: TC8_Stat_CompanyNullUser
   * Objective: Verify that requests without user authentication return Unauthorized
   * Input: No user header
   * Expected Output: HTTP 401 Unauthorized
   * Notes: Tests authentication requirement
   */
  it('TC8_Stat_CompanyNullUser: should return 401 for null user', async () => {
    await request(nestApp.getHttpServer())
      .get('/admin/statistics/company')
      .expect(401);

    expect(
      mockedStatisticService.getCompanyCommonStatistics,
    ).not.toHaveBeenCalled();
  });
});
