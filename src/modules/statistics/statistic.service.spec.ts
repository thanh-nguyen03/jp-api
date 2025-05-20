import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { StatisticServiceImpl } from './statistic.service';
import { INestApplication } from '@nestjs/common';
import { Role } from '@prisma/client';

// Custom interface for Prisma query event
interface PrismaQueryEvent {
  query: string;
  duration: number;
}

// Note: Using the production database, so we must ensure cleanup of test data
describe('StatisticServiceImpl - getCompanyCommonStatistics (Integration Tests with Real DB)', () => {
  let app: INestApplication;
  let statisticService: StatisticServiceImpl;
  let prismaService: PrismaService;

  // Setup testing module before all tests
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StatisticServiceImpl, PrismaService],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    statisticService = module.get<StatisticServiceImpl>(StatisticServiceImpl);
    prismaService = module.get<PrismaService>(PrismaService);

    // Enable query logging for debugging
    (
      prismaService.$on as unknown as (
        event: 'query',
        callback: (e: PrismaQueryEvent) => void,
      ) => void
    )('query', (e: PrismaQueryEvent) => {
      console.log(`Query: ${e.query}, Duration: ${e.duration}ms`);
    });
  });

  // Clean up before each test to remove residual test data
  beforeEach(async () => {
    await prismaService.$transaction(async (tx) => {
      await tx.application.deleteMany({
        where: { recruitment: { company: { name: { contains: 'test-' } } } },
      });
      await tx.recruitment.deleteMany({
        where: { company: { name: { contains: 'test-' } } },
      });
      await tx.user.deleteMany({
        where: { email: { contains: 'test-' } },
      });
      await tx.company.deleteMany({
        where: { name: { contains: 'test-' } },
      });
    });

    const residualCompanies = await prismaService.company.findMany({
      where: { name: { contains: 'test-' } },
    });
    console.log('Residual companies before cleanup:', residualCompanies);
  });

  // Clean up after each test to prevent data pollution
  afterEach(async () => {
    await prismaService.$transaction(async (tx) => {
      await tx.application.deleteMany({
        where: { recruitment: { company: { name: { contains: 'test-' } } } },
      });
      await tx.recruitment.deleteMany({
        where: { company: { name: { contains: 'test-' } } },
      });
      await tx.user.deleteMany({
        where: { email: { contains: 'test-' } },
      });
      await tx.company.deleteMany({
        where: { name: { contains: 'test-' } },
      });
    });
  });

  // Close database connection after all tests
  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  // Helper to create test data
  async function createTestData({
    companyName,
    hrCount,
    recruitmentCount,
    pendingApps,
    approvedApps,
    rejectedApps,
  }: {
    companyName: string;
    hrCount: number;
    recruitmentCount: number;
    pendingApps: number;
    approvedApps: number;
    rejectedApps: number;
  }) {
    const startTime = Date.now();
    console.log(`Creating test data for ${companyName}`);

    const company = await prismaService.company.create({
      data: {
        name: companyName,
        code: `TEST-${Date.now()}`,
        description: 'Test company description',
        address: '123 Test Street',
      },
    });

    const hrs = await Promise.all(
      Array.from({ length: hrCount }, (_, i) =>
        prismaService.user.create({
          data: {
            email: `test-hr${i}.${Date.now()}@example.com`,
            role: Role.COMPANY_HR,
            companyId: company.id,
            firstName: 'HR',
            lastName: `User${i}`,
            password: 'hashed',
            displayName: `HR User${i}`,
            avatar: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }),
      ),
    );

    const applicant = await prismaService.user.create({
      data: {
        email: `test-applicant.${Date.now()}@example.com`,
        role: Role.USER,
        firstName: 'Applicant',
        lastName: 'User',
        password: 'hashed',
        displayName: 'Applicant User',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const recruitments = await Promise.all(
      Array.from({ length: recruitmentCount }, (_, i) =>
        prismaService.recruitment.create({
          data: {
            companyId: company.id,
            title: `Test Recruitment ${i}`,
            content: 'Test content',
            maxSalary: 100000,
            minSalary: 50000,
            experience: 2,
            jobType: 'FULL_TIME',
            deadline: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }),
      ),
    );

    // Create exact number of applications, distributing across recruitments
    const applicationData = [];
    const recruitmentIds = recruitments.map((r) => r.id);
    let recruitmentIndex = 0;

    // Create pending applications
    for (let i = 0; i < pendingApps; i++) {
      applicationData.push({
        recruitmentId: recruitmentIds[recruitmentIndex % recruitmentIds.length],
        userId: applicant.id,
        status: 'PENDING',
        message: 'Test application',
      });
      recruitmentIndex++;
    }

    // Create approved applications
    for (let i = 0; i < approvedApps; i++) {
      applicationData.push({
        recruitmentId: recruitmentIds[recruitmentIndex % recruitmentIds.length],
        userId: applicant.id,
        status: 'APPROVED',
        message: 'Test application',
      });
      recruitmentIndex++;
    }

    // Create rejected applications
    for (let i = 0; i < rejectedApps; i++) {
      applicationData.push({
        recruitmentId: recruitmentIds[recruitmentIndex % recruitmentIds.length],
        userId: applicant.id,
        status: 'REJECTED',
        message: 'Test application',
      });
      recruitmentIndex++;
    }

    // Use createMany for batch insertion
    await prismaService.application.createMany({
      data: applicationData,
    });

    const user =
      hrs[0] ||
      (await prismaService.user.create({
        data: {
          email: `test-user.${Date.now()}@example.com`,
          role: Role.COMPANY_HR,
          companyId: company.id,
          firstName: 'Test',
          lastName: 'User',
          password: 'hashed',
          displayName: 'Test User',
          avatar: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      }));

    console.log(`Test data creation took ${Date.now() - startTime}ms`);
    return user;
  }

  /**
   * Test Case: TC1_SS_EmptyCompany
   * Objective: Verify that a company with no recruitments or applications returns zero counts
   * Input: Company with 1 HR, 0 recruitments, 0 applications
   * Expected Output: CompanyStatisticsDto with totalRecruitments: 0, totalApplications: {total: 0, pending: 0, accepted: 0, rejected: 0}, totalHRs: 1
   * Notes: Tests zero-count branches and DTO construction in getCompanyCommonStatistics
   */
  describe('TC1_SS_EmptyCompany', () => {
    it('should return CompanyStatisticsDto with all zeros', async () => {
      const user = await createTestData({
        companyName: `test-company-${Date.now()}`,
        hrCount: 1, // Minimum 1 for user
        recruitmentCount: 0,
        pendingApps: 0,
        approvedApps: 0,
        rejectedApps: 0,
      });

      // Act
      const result = await statisticService.getCompanyCommonStatistics(user);

      // Assert
      expect(result).toEqual({
        totalRecruitments: 0,
        totalApplications: {
          total: 0,
          pending: 0,
          accepted: 0,
          rejected: 0,
        },
        totalHRs: 1, // Includes the user
      });
    });
  });

  /**
   * Test Case: TC2_SS_ValidCounts
   * Objective: Verify that a company with multiple HRs, recruitments, and applications returns correct counts
   * Input: Company with 2 HRs, 3 recruitments, 2 pending, 2 approved, 2 rejected applications
   * Expected Output: CompanyStatisticsDto with totalRecruitments: 3, totalApplications: {total: 6, pending: 2, accepted: 2, rejected: 2}, totalHRs: 2
   * Notes: Tests normal execution path and all count branches in getCompanyCommonStatistics
   */
  describe('TC2_SS_ValidCounts', () => {
    it('should return CompanyStatisticsDto with valid counts', async () => {
      // Arrange
      const user = await createTestData({
        companyName: `test-company-${Date.now()}`,
        hrCount: 2,
        recruitmentCount: 3,
        pendingApps: 2,
        approvedApps: 2,
        rejectedApps: 2,
      });

      // Act
      const result = await statisticService.getCompanyCommonStatistics(user);

      // Assert
      expect(result).toEqual({
        totalRecruitments: 3,
        totalApplications: {
          total: 6,
          pending: 2,
          accepted: 2,
          rejected: 2,
        },
        totalHRs: 2,
      });
    }, 15000); // Increased timeout to 15 seconds
  });

  /**
   * Test Case: TC3_SS_PendingOnly
   * Objective: Verify that a company with only pending applications returns correct counts
   * Input: Company with 1 HR, 1 recruitment, 3 pending applications
   * Expected Output: CompanyStatisticsDto with totalRecruitments: 1, totalApplications: {total: 3, pending: 3, accepted: 0, rejected: 0}, totalHRs: 1
   * Notes: Tests PENDING status branch in getCompanyCommonStatistics
   */
  describe('TC3_SS_PendingOnly', () => {
    it('should return CompanyStatisticsDto with only pending applications', async () => {
      // Arrange
      const user = await createTestData({
        companyName: `test-company-${Date.now()}`,
        hrCount: 1,
        recruitmentCount: 1,
        pendingApps: 3,
        approvedApps: 0,
        rejectedApps: 0,
      });

      // Act
      const result = await statisticService.getCompanyCommonStatistics(user);

      // Assert
      expect(result).toEqual({
        totalRecruitments: 1,
        totalApplications: {
          total: 3,
          pending: 3,
          accepted: 0,
          rejected: 0,
        },
        totalHRs: 1,
      });
    });
  });

  /**
   * Test Case: TC4_SS_PendingAndApproved
   * Objective: Verify that a company with pending and approved applications returns correct counts
   * Input: Company with 1 HR, 1 recruitment, 2 pending, 3 approved applications
   * Expected Output: CompanyStatisticsDto with totalRecruitments: 1, totalApplications: {total: 5, pending: 2, accepted: 3, rejected: 0}, totalHRs: 1
   * Notes: Tests PENDING and APPROVED branches in getCompanyCommonStatistics
   */
  describe('TC4_SS_PendingAndApproved', () => {
    it('should return CompanyStatisticsDto with pending and approved applications', async () => {
      // Arrange
      const user = await createTestData({
        companyName: `test-company-${Date.now()}`,
        hrCount: 1,
        recruitmentCount: 1,
        pendingApps: 2,
        approvedApps: 3,
        rejectedApps: 0,
      });

      // Act
      const result = await statisticService.getCompanyCommonStatistics(user);

      // Assert
      expect(result).toEqual({
        totalRecruitments: 1,
        totalApplications: {
          total: 5,
          pending: 2,
          accepted: 3,
          rejected: 0,
        },
        totalHRs: 1,
      });
    });
  });

  /**
   * Test Case: TC5_SS_RejectedOnly
   * Objective: Verify that a company with only rejected applications returns correct counts
   * Input: Company with 1 HR, 1 recruitment, 2 rejected applications
   * Expected Output: CompanyStatisticsDto with totalRecruitments: 1, totalApplications: {total: 2, pending: 0, accepted: 0, rejected: 2}, totalHRs: 1
   * Notes: Tests REJECTED status branch in getCompanyCommonStatistics
   */
  describe('TC5_SS_RejectedOnly', () => {
    it('should return CompanyStatisticsDto with only rejected applications', async () => {
      // Arrange
      const user = await createTestData({
        companyName: `test-company-${Date.now()}`,
        hrCount: 1,
        recruitmentCount: 1,
        pendingApps: 0,
        approvedApps: 0,
        rejectedApps: 2,
      });

      // Act
      const result = await statisticService.getCompanyCommonStatistics(user);

      // Assert
      expect(result).toEqual({
        totalRecruitments: 1,
        totalApplications: {
          total: 2,
          pending: 0,
          accepted: 0,
          rejected: 2,
        },
        totalHRs: 1,
      });
    });
  });

  /**
   * Test Case: TC6_SS_NoHRs
   * Objective: Verify that a company with no HRs (except the user) returns correct counts
   * Input: Company with 0 HRs, 1 recruitment, 1 pending, 1 approved, 1 rejected application
   * Expected Output: CompanyStatisticsDto with totalRecruitments: 1, totalApplications: {total: 3, pending: 1, accepted: 1, rejected: 1}, totalHRs: 1
   * Notes: Tests HR count branch with user as the only HR in getCompanyCommonStatistics
   */
  describe('TC6_SS_NoHRs', () => {
    it('should return CompanyStatisticsDto with zero HRs', async () => {
      // Arrange
      const user = await createTestData({
        companyName: `test-company-${Date.now()}`,
        hrCount: 0, // No HRs, user will be created
        recruitmentCount: 1,
        pendingApps: 1,
        approvedApps: 1,
        rejectedApps: 1,
      });

      // Act
      const result = await statisticService.getCompanyCommonStatistics(user);

      // Assert
      expect(result).toEqual({
        totalRecruitments: 1,
        totalApplications: {
          total: 3,
          pending: 1,
          accepted: 1,
          rejected: 1,
        },
        totalHRs: 1, // Includes the user
      });
    });
  });

  /**
   * Test Case: TC7_SS_MultipleHRs
   * Objective: Verify that a company with multiple HRs returns correct counts
   * Input: Company with 3 HRs, 1 recruitment, 1 pending, 1 approved, 1 rejected application
   * Expected Output: CompanyStatisticsDto with totalRecruitments: 1, totalApplications: {total: 3, pending: 1, accepted: 1, rejected: 1}, totalHRs: 3
   * Notes: Tests HR count branch with multiple HRs in getCompanyCommonStatistics
   */
  describe('TC7_SS_MultipleHRs', () => {
    it('should return CompanyStatisticsDto with multiple HRs', async () => {
      // Arrange
      const user = await createTestData({
        companyName: `test-company-${Date.now()}`,
        hrCount: 3,
        recruitmentCount: 1,
        pendingApps: 1,
        approvedApps: 1,
        rejectedApps: 1,
      });

      // Act
      const result = await statisticService.getCompanyCommonStatistics(user);

      // Assert
      expect(result).toEqual({
        totalRecruitments: 1,
        totalApplications: {
          total: 3,
          pending: 1,
          accepted: 1,
          rejected: 1,
        },
        totalHRs: 3,
      });
    });
  });

  /**
   * Test Case: TC8_SS_PrismaFilters
   * Objective: Verify that Prisma query filters correctly retrieve counts for a company
   * Input: Company with 2 HRs, 2 recruitments, 1 pending, 1 approved, 1 rejected application
   * Expected Output: CompanyStatisticsDto with totalRecruitments: 2, totalApplications: {total: 3, pending: 1, accepted: 1, rejected: 1}, totalHRs: 2
   * Notes: Tests companyId and status filters in getCompanyCommonStatistics
   */
  describe('TC8_SS_PrismaFilters', () => {
    it('should return correct counts with specific data setup', async () => {
      // Arrange
      const user = await createTestData({
        companyName: `test-company-${Date.now()}`,
        hrCount: 2,
        recruitmentCount: 2,
        pendingApps: 1,
        approvedApps: 1,
        rejectedApps: 1,
      });

      // Act
      const result = await statisticService.getCompanyCommonStatistics(user);

      // Assert
      expect(result).toEqual({
        totalRecruitments: 2,
        totalApplications: {
          total: 3,
          pending: 1,
          accepted: 1,
          rejected: 1,
        },
        totalHRs: 2,
      });
    });
  });
});

// Custom interface for Prisma query event
interface PrismaQueryEvent {
  query: string;
  duration: number;
}

describe('StatisticServiceImpl - getAdminCommonStatistics (Integration Tests with Real DB)', () => {
  let app: INestApplication;
  let statisticService: StatisticServiceImpl;
  let prismaService: PrismaService;
  let queryListener: (e: PrismaQueryEvent) => void;

  // Setup testing module before all tests
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StatisticServiceImpl, PrismaService],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    statisticService = module.get<StatisticServiceImpl>(StatisticServiceImpl);
    prismaService = module.get<PrismaService>(PrismaService);

    // Enable query logging for debugging
    queryListener = (e: PrismaQueryEvent) => {
      console.log(`Query: ${e.query}, Duration: ${e.duration}ms`);
    };
    (
      prismaService.$on as unknown as (
        event: 'query',
        callback: (e: PrismaQueryEvent) => void,
      ) => void
    )('query', queryListener);
  });

  // Clean up before each test to remove residual test data
  beforeEach(async () => {
    const startTime = Date.now();
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await prismaService.$transaction(
          async (tx) => {
            const deletedApps = await tx.application.deleteMany({
              where: {
                recruitment: { company: { name: { contains: 'test-' } } },
              },
            });
            const deletedRecruitments = await tx.recruitment.deleteMany({
              where: { company: { name: { contains: 'test-' } } },
            });
            const deletedUsers = await tx.user.deleteMany({
              where: { email: { contains: 'test-' } },
            });
            const deletedCompanies = await tx.company.deleteMany({
              where: { name: { contains: 'test-' } },
            });
            console.log('Deleted test data:', {
              applications: deletedApps.count,
              recruitments: deletedRecruitments.count,
              users: deletedUsers.count,
              companies: deletedCompanies.count,
            });
          },
          { timeout: 10000 },
        );
        console.log('Cleanup transaction committed successfully');
        break;
      } catch (error) {
        attempt++;
        console.warn(`Cleanup attempt ${attempt} failed: ${error.message}`);
        if (attempt === maxRetries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Verify cleanup
    const residual = {
      companies: await prismaService.company.count({
        where: { name: { contains: 'test-' } },
      }),
      users: await prismaService.user.count({
        where: { email: { contains: 'test-' } },
      }),
      recruitments: await prismaService.recruitment.count({
        where: { company: { name: { contains: 'test-' } } },
      }),
      applications: await prismaService.application.count({
        where: { recruitment: { company: { name: { contains: 'test-' } } } },
      }),
    };
    console.log('Residual test data before test:', residual);
    expect(residual.companies).toBe(0);
    expect(residual.users).toBe(0);
    expect(residual.recruitments).toBe(0);
    expect(residual.applications).toBe(0);

    console.log(`Cleanup took ${Date.now() - startTime}ms`);
  }, 20000);

  // Clean up after each test to prevent data pollution
  afterEach(async () => {
    const startTime = Date.now();
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await prismaService.$transaction(
          async (tx) => {
            const deletedApps = await tx.application.deleteMany({
              where: {
                recruitment: { company: { name: { contains: 'test-' } } },
              },
            });
            const deletedRecruitments = await tx.recruitment.deleteMany({
              where: { company: { name: { contains: 'test-' } } },
            });
            const deletedUsers = await tx.user.deleteMany({
              where: { email: { contains: 'test-' } },
            });
            const deletedCompanies = await tx.company.deleteMany({
              where: { name: { contains: 'test-' } },
            });
            console.log('Deleted test data:', {
              applications: deletedApps.count,
              recruitments: deletedRecruitments.count,
              users: deletedUsers.count,
              companies: deletedCompanies.count,
            });
          },
          { timeout: 10000 },
        );
        console.log('Cleanup transaction committed successfully');
        break;
      } catch (error) {
        attempt++;
        console.warn(`Cleanup attempt ${attempt} failed: ${error.message}`);
        if (attempt === maxRetries) throw error;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    console.log(`Cleanup took ${Date.now() - startTime}ms`);
  }, 20000);

  // Close database connection after all tests
  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  // Helper to create test data
  async function createTestData({
    companyCount,
    hrCount,
    recruitmentsPerCompany,
    pendingApps,
    approvedApps,
    rejectedApps,
    userCreatedAtMonths,
  }: {
    companyCount: number;
    hrCount: number;
    recruitmentsPerCompany: number | number[];
    pendingApps: number;
    approvedApps: number;
    rejectedApps: number;
    userCreatedAtMonths?: number[];
  }) {
    const startTime = Date.now();
    const uniqueId = Date.now();
    console.log(
      `Creating test data for ${companyCount} companies with uniqueId ${uniqueId}`,
    );

    const companies = await Promise.all(
      Array.from({ length: companyCount }, (_, i) =>
        prismaService.company.create({
          data: {
            name: `test-company-${uniqueId}-${i}`,
            code: `TEST-${uniqueId}-${i}`,
            description: 'Test company description',
            address: '123 Test Street',
          },
        }),
      ),
    );

    const hrs = await Promise.all(
      Array.from({ length: hrCount }, (_, i) =>
        prismaService.user.create({
          data: {
            email: `test-hr-${uniqueId}-${i}@example.com`,
            role: Role.COMPANY_HR,
            companyId: companies[0]?.id || null,
            firstName: 'HR',
            lastName: `User${i}`,
            password: 'hashed',
            displayName: `HR User${i}`,
            avatar: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        }),
      ),
    );

    const applicants = userCreatedAtMonths?.length
      ? await Promise.all(
          Array.from({ length: userCreatedAtMonths.length }, (_, i) =>
            prismaService.user.create({
              data: {
                email: `test-applicant-${uniqueId}-${i}@example.com`,
                role: Role.USER,
                firstName: 'Applicant',
                lastName: `User${i}`,
                password: 'hashed',
                displayName: `Applicant User${i}`,
                avatar: null,
                createdAt: new Date(
                  2024,
                  userCreatedAtMonths[i % userCreatedAtMonths.length],
                  1,
                ),
                updatedAt: new Date(),
              },
            }),
          ),
        )
      : [];

    const recruitments = [];
    for (let i = 0; i < companies.length; i++) {
      const count = Array.isArray(recruitmentsPerCompany)
        ? recruitmentsPerCompany[i]
        : recruitmentsPerCompany;
      const companyRecruitments = await Promise.all(
        Array.from({ length: count }, (_, j) =>
          prismaService.recruitment.create({
            data: {
              companyId: companies[i].id,
              title: `Test Recruitment ${uniqueId}-${j}`,
              content: 'Test content',
              maxSalary: 100000,
              minSalary: 50000,
              experience: 2,
              jobType: 'FULL_TIME',
              deadline: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          }),
        ),
      );
      recruitments.push(...companyRecruitments);
    }
    console.log(
      'Created recruitments:',
      recruitments.map((r) => ({
        id: r.id,
        title: r.title,
        companyId: r.companyId,
      })),
    );

    const applicationData = [];
    const recruitmentIds = recruitments.map((r) => r.id);
    let recruitmentIndex = 0;

    // For TC4-TC7 (companyCount: 1, recruitmentsPerCompany: 5), assign all applications to first recruitment
    const assignToFirstRecruitment =
      companyCount === 1 && recruitmentsPerCompany === 5;

    if (applicants.length && recruitmentIds.length) {
      // Create pending applications
      for (let i = 0; i < pendingApps; i++) {
        const recruitmentId = assignToFirstRecruitment
          ? recruitmentIds[0]
          : recruitmentIds[recruitmentIndex % recruitmentIds.length];
        try {
          const app = await prismaService.application.create({
            data: {
              recruitmentId,
              userId: applicants[0].id,
              status: 'PENDING',
              message: 'Test application',
            },
          });
          console.log(`Created PENDING application ${i + 1}:`, {
            id: app.id,
            recruitmentId,
            status: 'PENDING',
          });
          applicationData.push(app);
        } catch (error) {
          console.error(
            `Failed to create PENDING application ${i + 1}:`,
            error.message,
          );
          throw error;
        }
        recruitmentIndex++;
      }

      // Create approved applications
      for (let i = 0; i < approvedApps; i++) {
        const recruitmentId = assignToFirstRecruitment
          ? recruitmentIds[0]
          : recruitmentIds[recruitmentIndex % recruitmentIds.length];
        try {
          const app = await prismaService.application.create({
            data: {
              recruitmentId,
              userId: applicants[0].id,
              status: 'APPROVED',
              message: 'Test application',
            },
          });
          console.log(`Created APPROVED application ${i + 1}:`, {
            id: app.id,
            recruitmentId,
            status: 'APPROVED',
          });
          applicationData.push(app);
        } catch (error) {
          console.error(
            `Failed to create APPROVED application ${i + 1}:`,
            error.message,
          );
          throw error;
        }
        recruitmentIndex++;
      }

      // Create rejected applications
      for (let i = 0; i < rejectedApps; i++) {
        const recruitmentId = assignToFirstRecruitment
          ? recruitmentIds[0]
          : recruitmentIds[recruitmentIndex % recruitmentIds.length];
        try {
          const app = await prismaService.application.create({
            data: {
              recruitmentId,
              userId: applicants[0].id,
              status: 'REJECTED',
              message: 'Test application',
            },
          });
          console.log(`Created REJECTED application ${i + 1}:`, {
            id: app.id,
            recruitmentId,
            status: 'REJECTED',
          });
          applicationData.push(app);
        } catch (error) {
          console.error(
            `Failed to create REJECTED application ${i + 1}:`,
            error.message,
          );
          throw error;
        }
        recruitmentIndex++;
      }
    }

    // Verify application creation with recruitment ID
    const createdApplications = await prismaService.application.findMany({
      where: { recruitment: { companyId: companies[0]?.id } },
      select: { id: true, status: true, recruitmentId: true },
    });
    console.log('Verified applications:', createdApplications);
    if (assignToFirstRecruitment && createdApplications.length) {
      console.log(
        'Verifying all applications assigned to recruitmentId:',
        recruitmentIds[0],
      );
      expect(
        createdApplications.every(
          (app) => app.recruitmentId === recruitmentIds[0],
        ),
      ).toBe(true);
    }

    console.log(`Test data creation took ${Date.now() - startTime}ms`);
    return {
      hr: hrs[0],
      applicant: applicants[0],
      companies,
      firstRecruitmentId: recruitmentIds[0],
    };
  }

  /**
   * Test Case: TC9_SS_AdminBasicData
   * Objective: Verify that admin statistics return correct counts for a company with data
   * Input: 1 company, 1 HR, 5 recruitments, 1 pending application, 1 user created in January
   * Expected Output: Top companies include test company with 5 recruitments and 1 pending application; user chart shows 1 user in January
   * Notes: Tests company, recruitment, and application retrieval in getAdminCommonStatistics
   */
  describe('TC9_SS_AdminBasicData', () => {
    it('should return correct counts for test data', async () => {
      const { companies } = await createTestData({
        companyCount: 1,
        hrCount: 1,
        recruitmentsPerCompany: 5,
        pendingApps: 1,
        approvedApps: 0,
        rejectedApps: 0,
        userCreatedAtMonths: [0],
      });

      const result = await statisticService.getAdminCommonStatistics();

      // Filter test-specific data
      const testCompanyIds = companies.map((c) => c.id);
      const testTopCompanies = result.topCompanies.filter((c) =>
        testCompanyIds.includes(c.id),
      );
      console.log(
        'TC1 topCompanies:',
        result.topCompanies.map((c) => ({
          id: c.id,
          name: c.name,
          recruitments: c.recruitments.length,
        })),
      );

      expect(testTopCompanies).toHaveLength(1);
      expect(testTopCompanies[0]).toEqual(
        expect.objectContaining({
          id: companies[0].id,
          name: expect.stringContaining('test-company-'),
          recruitments: expect.arrayContaining([
            expect.objectContaining({
              title: expect.stringContaining('Test Recruitment'),
              applications: expect.arrayContaining([
                expect.objectContaining({ status: 'PENDING' }),
              ]),
            }),
          ]),
        }),
      );
      expect(testTopCompanies[0].recruitments).toHaveLength(5);

      // Verify userChartStatistics based on all users
      const allUsers = await prismaService.user.findMany({
        where: { role: 'USER' },
        select: { email: true, createdAt: true },
      });
      console.log(
        'TC1 all users:',
        allUsers.map((u) => ({
          email: u.email,
          createdAt: u.createdAt.toISOString(),
        })),
      );
      const userCounts = allUsers.reduce(
        (acc, user) => {
          const month = user.createdAt.getMonth();
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        },
        {} as Record<number, number>,
      );
      const expectedChart = Array.from({ length: 12 }, (_, i) => ({
        label: new Date(0, i).toLocaleString('en', { month: 'long' }),
        data: userCounts[i] || 0,
      }));
      console.log('TC1 userChartStatistics:', result.userChartStatistics);
      expect(result.userChartStatistics).toEqual(expectedChart);
    }, 20000);
  });

  /**
   * Test Case: TC10_SS_AdminNoUsers
   * Objective: Verify that admin statistics handle cases with no user data
   * Input: 1 company, 1 HR, 5 recruitments, 0 applications, no users
   * Expected Output: Top companies include test company with 5 recruitments and 0 applications; user chart shows 0 users
   * Notes: Tests empty user chart statistics in getAdminCommonStatistics
   */
  describe('TC10_SS_AdminNoUsers', () => {
    it('should return correct user counts for test data', async () => {
      const { companies } = await createTestData({
        companyCount: 1,
        hrCount: 1,
        recruitmentsPerCompany: 5,
        pendingApps: 0,
        approvedApps: 0,
        rejectedApps: 0,
        userCreatedAtMonths: [],
      });

      const result = await statisticService.getAdminCommonStatistics();

      const testCompanyIds = companies.map((c) => c.id);
      const testTopCompanies = result.topCompanies.filter((c) =>
        testCompanyIds.includes(c.id),
      );
      expect(testTopCompanies).toHaveLength(1);
      expect(testTopCompanies[0].recruitments[0].applications).toHaveLength(0);

      const allUsers = await prismaService.user.findMany({
        where: { role: 'USER' },
        select: { email: true, createdAt: true },
      });
      const userCounts = allUsers.reduce(
        (acc, user) => {
          const month = user.createdAt.getMonth();
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        },
        {} as Record<number, number>,
      );
      const expectedChart = Array.from({ length: 12 }, (_, i) => ({
        label: new Date(0, i).toLocaleString('en', { month: 'long' }),
        data: userCounts[i] || 0,
      }));
      expect(result.userChartStatistics).toEqual(expectedChart);
    }, 15000);
  });

  /**
   * Test Case: TC11_SS_AdminNoCompanies
   * Objective: Verify that admin statistics return no test companies when none are created
   * Input: 0 companies, 0 HRs, 0 recruitments, 0 applications, 1 user
   * Expected Output: Top companies list excludes test companies
   * Notes: Tests empty company retrieval in getAdminCommonStatistics
   */
  describe('TC11_SS_AdminNoCompanies', () => {
    it('should return correct company counts for test data', async () => {
      await createTestData({
        companyCount: 0,
        hrCount: 0,
        recruitmentsPerCompany: 0,
        pendingApps: 0,
        approvedApps: 0,
        rejectedApps: 0,
        userCreatedAtMonths: [0],
      });

      const result = await statisticService.getAdminCommonStatistics();

      const testTopCompanies = result.topCompanies.filter((c) =>
        c.name.includes('test-'),
      );
      expect(testTopCompanies).toEqual([]);
    });
  });

  /**
   * Test Case: TC12_SS_AdminPendingApps
   * Objective: Verify that admin statistics correctly handle pending applications
   * Input: 1 company, 1 HR, 5 recruitments, 3 pending applications, 1 user
   * Expected Output: Top companies include test company with 3 pending applications in the first recruitment
   * Notes: Tests PENDING application retrieval in getAdminCommonStatistics
   */

  describe('TC12_SS_AdminPendingApps', () => {
    it('should return correct pending application counts', async () => {
      const { companies, firstRecruitmentId } = await createTestData({
        companyCount: 1,
        hrCount: 1,
        recruitmentsPerCompany: 5,
        pendingApps: 3,
        approvedApps: 0,
        rejectedApps: 0,
        userCreatedAtMonths: [0],
      });

      // Verify applications in DB before calling service
      const applications = await prismaService.application.findMany({
        where: { recruitment: { companyId: companies[0].id } },
        select: { id: true, status: true, recruitmentId: true },
      });
      console.log('TC4 DB applications before service:', applications);
      expect(applications).toHaveLength(3);
      expect(applications.every((app) => app.status === 'PENDING')).toBe(true);
      expect(
        applications.every((app) => app.recruitmentId === firstRecruitmentId),
      ).toBe(true);

      const result = await statisticService.getAdminCommonStatistics();

      const testCompanyIds = companies.map((c) => c.id);
      const testTopCompanies = result.topCompanies.filter((c) =>
        testCompanyIds.includes(c.id),
      );
      console.log(
        'TC4 topCompanies:',
        testTopCompanies.map((c) => ({
          id: c.id,
          name: c.name,
          recruitments: c.recruitments.map((r) => ({
            id: r.id,
            title: r.title,
            applications: r.applications.map((a) => ({
              id: a.id,
              status: a.status,
            })),
          })),
        })),
      );

      expect(testTopCompanies).toHaveLength(1);
      expect(testTopCompanies[0].recruitments).toHaveLength(5);

      // Use ID-based lookup due to potential sorting in getAdminCommonStatistics
      const targetRecruitment = testTopCompanies[0].recruitments.find(
        (r) => r.id === firstRecruitmentId,
      );
      console.log('TC4 targetRecruitment:', {
        id: targetRecruitment?.id,
        applications: targetRecruitment?.applications,
      });
      expect(targetRecruitment).toBeDefined();
      expect(targetRecruitment!.applications).toHaveLength(3);
      expect(
        targetRecruitment!.applications.every(
          (app) => app.status === 'PENDING',
        ),
      ).toBe(true);

      // Debug: Check if recruitments[0] matches firstRecruitmentId
      console.log('TC4 recruitments[0]:', {
        id: testTopCompanies[0].recruitments[0].id,
        applications: testTopCompanies[0].recruitments[0].applications,
      });
    }, 20000);
  });
  /**
   * Test Case: TC13_SS_AdminApprovedApps
   * Objective: Verify that admin statistics correctly handle approved applications
   * Input: 1 company, 1 HR, 5 recruitments, 3 approved applications, 1 user
   * Expected Output: Top companies include test company with 3 approved applications in the first recruitment
   * Notes: Tests APPROVED application retrieval in getAdminCommonStatistics
   */
  describe('TC13_SS_AdminApprovedApps   ', () => {
    it('should return correct approved application counts', async () => {
      const { companies, firstRecruitmentId } = await createTestData({
        companyCount: 1,
        hrCount: 1,
        recruitmentsPerCompany: 5,
        pendingApps: 0,
        approvedApps: 3,
        rejectedApps: 0,
        userCreatedAtMonths: [0],
      });

      // Verify applications in DB before calling service
      const applications = await prismaService.application.findMany({
        where: { recruitment: { companyId: companies[0].id } },
        select: { id: true, status: true, recruitmentId: true },
      });
      console.log('TC5 DB applications before service:', applications);
      expect(applications).toHaveLength(3);
      expect(applications.every((app) => app.status === 'APPROVED')).toBe(true);
      expect(
        applications.every((app) => app.recruitmentId === firstRecruitmentId),
      ).toBe(true);

      const result = await statisticService.getAdminCommonStatistics();

      const testCompanyIds = companies.map((c) => c.id);
      const testTopCompanies = result.topCompanies.filter((c) =>
        testCompanyIds.includes(c.id),
      );
      console.log(
        'TC5 topCompanies:',
        testTopCompanies.map((c) => ({
          id: c.id,
          name: c.name,
          recruitments: c.recruitments.map((r) => ({
            id: r.id,
            title: r.title,
            applications: r.applications.map((a) => ({
              id: a.id,
              status: a.status,
            })),
          })),
        })),
      );

      expect(testTopCompanies).toHaveLength(1);
      expect(testTopCompanies[0].recruitments).toHaveLength(5);

      // Use ID-based lookup due to potential sorting in getAdminCommonStatistics
      const targetRecruitment = testTopCompanies[0].recruitments.find(
        (r) => r.id === firstRecruitmentId,
      );
      console.log('TC5 targetRecruitment:', {
        id: targetRecruitment?.id,
        applications: targetRecruitment?.applications,
      });
      expect(targetRecruitment).toBeDefined();
      expect(targetRecruitment!.applications).toHaveLength(3);
      expect(
        targetRecruitment!.applications.every(
          (app) => app.status === 'APPROVED',
        ),
      ).toBe(true);

      // Debug: Check if recruitments[0] matches firstRecruitmentId
      console.log('TC5 recruitments[0]:', {
        id: testTopCompanies[0].recruitments[0].id,
        applications: testTopCompanies[0].recruitments[0].applications,
      });
    }, 20000);
  });

  /**
   * Test Case: TC14_SS_AdminRejectedApps
   * Objective: Verify that admin statistics correctly handle rejected applications
   * Input: 1 company, 1 HR, 5 recruitments, 3 rejected applications, 1 user
   * Expected Output: Top companies include test company with 3 rejected applications in the first recruitment
   * Notes: Tests REJECTED application retrieval in getAdminCommonStatistics
   */
  describe('TC14_SS_AdminRejectedApps', () => {
    it('should return correct rejected application counts', async () => {
      const { companies, firstRecruitmentId } = await createTestData({
        companyCount: 1,
        hrCount: 1,
        recruitmentsPerCompany: 5,
        pendingApps: 0,
        approvedApps: 0,
        rejectedApps: 3,
        userCreatedAtMonths: [0],
      });

      // Verify applications in DB before calling service
      const applications = await prismaService.application.findMany({
        where: { recruitment: { companyId: companies[0].id } },
        select: { id: true, status: true, recruitmentId: true },
      });
      console.log('TC6 DB applications before service:', applications);
      expect(applications).toHaveLength(3);
      expect(applications.every((app) => app.status === 'REJECTED')).toBe(true);
      expect(
        applications.every((app) => app.recruitmentId === firstRecruitmentId),
      ).toBe(true);

      const result = await statisticService.getAdminCommonStatistics();

      const testCompanyIds = companies.map((c) => c.id);
      const testTopCompanies = result.topCompanies.filter((c) =>
        testCompanyIds.includes(c.id),
      );
      console.log(
        'TC6 topCompanies:',
        testTopCompanies.map((c) => ({
          id: c.id,
          name: c.name,
          recruitments: c.recruitments.map((r) => ({
            id: r.id,
            title: r.title,
            applications: r.applications.map((a) => ({
              id: a.id,
              status: a.status,
            })),
          })),
        })),
      );

      expect(testTopCompanies).toHaveLength(1);
      expect(testTopCompanies[0].recruitments).toHaveLength(5);

      // Use ID-based lookup due to potential sorting in getAdminCommonStatistics
      const targetRecruitment = testTopCompanies[0].recruitments.find(
        (r) => r.id === firstRecruitmentId,
      );
      console.log('TC6 targetRecruitment:', {
        id: targetRecruitment?.id,
        applications: targetRecruitment?.applications,
      });
      expect(targetRecruitment).toBeDefined();
      expect(targetRecruitment!.applications).toHaveLength(3);
      expect(
        targetRecruitment!.applications.every(
          (app) => app.status === 'REJECTED',
        ),
      ).toBe(true);

      // Debug: Check if recruitments[0] matches firstRecruitmentId
      console.log('TC6 recruitments[0]:', {
        id: testTopCompanies[0].recruitments[0].id,
        applications: testTopCompanies[0].recruitments[0].applications,
      });
    }, 20000);
  });

  /**
   * Test Case: TC15_SS_AdminMixedApps
   * Objective: Verify that admin statistics correctly handle mixed application statuses
   * Input: 1 company, 1 HR, 5 recruitments, 1 pending, 1 approved, 1 rejected application, 1 user
   * Expected Output: Top companies include test company with 1 pending, 1 approved, 1 rejected application in the first recruitment
   * Notes: Tests retrieval of multiple application statuses in getAdminCommonStatistics
   */

  describe('TC15_SS_AdminMixedApps', () => {
    it('should return correct mixed application counts', async () => {
      const { companies, firstRecruitmentId } = await createTestData({
        companyCount: 1,
        hrCount: 1,
        recruitmentsPerCompany: 5,
        pendingApps: 1,
        approvedApps: 1,
        rejectedApps: 1,
        userCreatedAtMonths: [0],
      });

      // Verify applications in DB before calling service
      const applications = await prismaService.application.findMany({
        where: { recruitment: { companyId: companies[0].id } },
        select: { id: true, status: true, recruitmentId: true },
      });
      console.log('TC7 DB applications before service:', applications);
      expect(applications).toHaveLength(3);
      expect(
        applications.filter((app) => app.status === 'PENDING'),
      ).toHaveLength(1);
      expect(
        applications.filter((app) => app.status === 'APPROVED'),
      ).toHaveLength(1);
      expect(
        applications.filter((app) => app.status === 'REJECTED'),
      ).toHaveLength(1);
      expect(
        applications.every((app) => app.recruitmentId === firstRecruitmentId),
      ).toBe(true);

      const result = await statisticService.getAdminCommonStatistics();

      const testCompanyIds = companies.map((c) => c.id);
      const testTopCompanies = result.topCompanies.filter((c) =>
        testCompanyIds.includes(c.id),
      );
      console.log(
        'TC7 topCompanies:',
        testTopCompanies.map((c) => ({
          id: c.id,
          name: c.name,
          recruitments: c.recruitments.map((r) => ({
            id: r.id,
            title: r.title,
            applications: r.applications.map((a) => ({
              id: a.id,
              status: a.status,
            })),
          })),
        })),
      );

      expect(testTopCompanies).toHaveLength(1);
      expect(testTopCompanies[0].recruitments).toHaveLength(5);

      // Use ID-based lookup due to potential sorting in getAdminCommonStatistics
      const targetRecruitment = testTopCompanies[0].recruitments.find(
        (r) => r.id === firstRecruitmentId,
      );
      console.log('TC7 targetRecruitment:', {
        id: targetRecruitment?.id,
        applications: targetRecruitment?.applications,
      });
      expect(targetRecruitment).toBeDefined();
      expect(targetRecruitment!.applications).toHaveLength(3);
      expect(targetRecruitment!.applications).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ status: 'PENDING' }),
          expect.objectContaining({ status: 'APPROVED' }),
          expect.objectContaining({ status: 'REJECTED' }),
        ]),
      );

      // Debug: Check if recruitments[0] matches firstRecruitmentId
      console.log('TC7 recruitments[0]:', {
        id: testTopCompanies[0].recruitments[0].id,
        applications: testTopCompanies[0].recruitments[0].applications,
      });
    }, 20000);
  });
  /**
   * Test Case: TC16_SS_AdminSortedCompanies
   * Objective: Verify that admin statistics sort companies by recruitment count in descending order
   * Input: 5 companies with 50, 40, 30, 25, 22 recruitments, 1 HR, 1 pending application, 1 user
   * Expected Output: Top companies list test companies in order of 50, 40, 30, 25, 22 recruitments
   * Notes: Tests sorting logic in getAdminCommonStatistics
   */
  describe('TC16_SS_AdminSortedCompanies', () => {
    it('should return test companies in descending recruitment order', async () => {
      const { companies } = await createTestData({
        companyCount: 5,
        hrCount: 1,
        recruitmentsPerCompany: [50, 40, 30, 25, 22],
        pendingApps: 1,
        approvedApps: 0,
        rejectedApps: 0,
        userCreatedAtMonths: [0],
      });

      // Verify all companies and recruitments were created
      expect(companies).toHaveLength(5);
      const dbCompanies = await prismaService.company.findMany({
        where: { id: { in: companies.map((c) => c.id) } },
        include: { _count: { select: { recruitments: true } } },
      });
      console.log(
        'TC8 DB companies:',
        dbCompanies.map((c) => ({
          id: c.id,
          name: c.name,
          recruitmentCount: c._count.recruitments,
        })),
      );
      expect(dbCompanies).toHaveLength(5);
      const recruitmentCounts = dbCompanies
        .map((c) => c._count.recruitments)
        .sort((a, b) => b - a);
      expect(recruitmentCounts).toEqual([50, 40, 30, 25, 22]);

      const result = await statisticService.getAdminCommonStatistics();

      // Log all companies returned by service
      console.log(
        'TC8 all topCompanies:',
        result.topCompanies.map((c) => ({
          id: c.id,
          name: c.name,
          recruitments: c.recruitments.length,
        })),
      );

      const testCompanyIds = companies.map((c) => c.id);
      const testTopCompanies = result.topCompanies.filter((c) =>
        testCompanyIds.includes(c.id),
      );
      console.log(
        'TC8 testTopCompanies:',
        testTopCompanies.map((c) => ({
          id: c.id,
          name: c.name,
          recruitments: c.recruitments.length,
        })),
      );

      // Log non-test companies in topCompanies
      console.log(
        'TC8 non-test companies:',
        result.topCompanies
          .filter((c) => !testCompanyIds.includes(c.id))
          .map((c) => ({
            id: c.id,
            name: c.name,
            recruitments: c.recruitments.length,
          })),
      );

      expect(testTopCompanies).toHaveLength(5);
      expect(testTopCompanies[0].recruitments).toHaveLength(50);
      expect(testTopCompanies[1].recruitments).toHaveLength(40);
      expect(testTopCompanies[2].recruitments).toHaveLength(30);
      expect(testTopCompanies[3].recruitments).toHaveLength(25);
      expect(testTopCompanies[4].recruitments).toHaveLength(22);
    }, 20000);
  });

  /**
   * Test Case: TC17_SS_AdminNoRecruitments
   * Objective: Verify that admin statistics exclude companies with 0 recruitments
   * Input: 6 companies with 50, 40, 30, 25, 22, 0 recruitments, 1 HR, 1 pending application, 1 user
   * Expected Output: Top companies include only 5 test companies with non-zero recruitments
   * Notes: Tests filtering of companies with no recruitments in getAdminCommonStatistics
   */
  describe('TC17_SS_AdminNoRecruitments', () => {
    it('should not include test company with 0 recruitments', async () => {
      const { companies } = await createTestData({
        companyCount: 6,
        hrCount: 1,
        recruitmentsPerCompany: [50, 40, 30, 25, 22, 0],
        pendingApps: 1,
        approvedApps: 0,
        rejectedApps: 0,
        userCreatedAtMonths: [0],
      });

      const result = await statisticService.getAdminCommonStatistics();

      const testCompanyIds = companies.map((c) => c.id);
      const testTopCompanies = result.topCompanies.filter((c) =>
        testCompanyIds.includes(c.id),
      );
      console.log(
        'TC9 topCompanies:',
        result.topCompanies.map((c) => ({
          id: c.id,
          name: c.name,
          recruitments: c.recruitments.length,
        })),
      );

      expect(testTopCompanies).toHaveLength(5);
      expect(testTopCompanies.every((c) => c.recruitments.length > 0)).toBe(
        true,
      );
    }, 20000);
  });
  /**
   * Test Case: TC18_SS_AdminNoData
   * Objective: Verify that admin statistics return no test data when none is created
   * Input: No test companies, users, recruitments, or applications
   * Expected Output: Top companies exclude test companies; user chart reflects existing users
   * Notes: Tests behavior with no test data in getAdminCommonStatistics
   */
  describe('TC18_SS_AdminNoData', () => {
    it('should not include test data when none created', async () => {
      const result = await statisticService.getAdminCommonStatistics();

      const testTopCompanies = result.topCompanies.filter((c) =>
        c.name.includes('test-'),
      );
      expect(testTopCompanies).toEqual([]);
      const allUsers = await prismaService.user.findMany({
        where: { role: 'USER' },
        select: { email: true, createdAt: true },
      });
      const userCounts = allUsers.reduce(
        (acc, user) => {
          const month = user.createdAt.getMonth();
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        },
        {} as Record<number, number>,
      );
      const expectedChart = Array.from({ length: 12 }, (_, i) => ({
        label: new Date(0, i).toLocaleString('en', { month: 'long' }),
        data: userCounts[i] || 0,
      }));
      expect(result.userChartStatistics).toEqual(expectedChart);
    });
  });

  /**
   * Test Case: TC19_SS_AdminFullData
   * Objective: Verify that admin statistics return correct counts and user chart with full data
   * Input: 5 companies with 30, 25, 25, 22, 22 recruitments, 1 HR, 2 pending, 2 approved, 2 rejected applications, 5 users across months
   * Expected Output: Top companies include 5 test companies; user chart shows users in January, February, March, April
   * Notes: Tests full data retrieval and user chart population in getAdminCommonStatistics
   */
  describe('TC19_SS_AdminFullData', () => {
    it('should return correct counts and monthly breakdown for test data', async () => {
      const { companies } = await createTestData({
        companyCount: 5,
        hrCount: 1,
        recruitmentsPerCompany: [30, 25, 25, 22, 22],
        pendingApps: 2,
        approvedApps: 2,
        rejectedApps: 2,
        userCreatedAtMonths: [0, 1, 1, 2, 3],
      });

      const result = await statisticService.getAdminCommonStatistics();

      const testCompanyIds = companies.map((c) => c.id);
      const testTopCompanies = result.topCompanies.filter((c) =>
        testCompanyIds.includes(c.id),
      );
      console.log(
        'TC11 topCompanies:',
        result.topCompanies.map((c) => ({
          id: c.id,
          name: c.name,
          recruitments: c.recruitments.length,
        })),
      );

      expect(testTopCompanies).toHaveLength(5);
      expect(testTopCompanies[0].recruitments).toHaveLength(30);
      expect(testTopCompanies[1].recruitments).toHaveLength(25);
      expect(testTopCompanies[2].recruitments).toHaveLength(25);
      expect(testTopCompanies[3].recruitments).toHaveLength(22);
      expect(testTopCompanies[4].recruitments).toHaveLength(22);

      const allUsers = await prismaService.user.findMany({
        where: { role: 'USER' },
        select: { email: true, createdAt: true },
      });
      const userCounts = allUsers.reduce(
        (acc, user) => {
          const month = user.createdAt.getMonth();
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        },
        {} as Record<number, number>,
      );
      const expectedChart = Array.from({ length: 12 }, (_, i) => ({
        label: new Date(0, i).toLocaleString('en', { month: 'long' }),
        data: userCounts[i] || 0,
      }));
      expect(result.userChartStatistics).toEqual(expectedChart);
    }, 20000);
  });
});
