import { Test, TestingModule } from '@nestjs/testing';
import {
  ApplicationService,
  ApplicationServiceImpl,
} from './application.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileService } from '../files/file.service';
import { AmqpService } from '../amqp/amqp.service';
import { MailService } from '../mail/mail.service';
import { CreateApplicationDto } from './dtos/create-application.dto';
import { UpdateApplicationDto } from './dtos/update-application.dto';
import { ApplicationFilter } from './dtos/application-filter.query';
import { $Enums } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { Message } from '../../constants/message';

// Mock PageResultDto
jest.mock('../../constants/page-result.dto', () => {
  return {
    PageResultDto: {
      of: jest.fn().mockImplementation((items, total, offset, limit) => ({
        items,
        total,
        offset,
        limit,
      })),
    },
  };
});

describe('ApplicationService', () => {
  let service: ApplicationService;
  let prismaService: PrismaService;
  let fileService: FileService;
  let amqpService: AmqpService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mailService: MailService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: ApplicationService,
          useClass: ApplicationServiceImpl,
        },
        PrismaService,
        {
          provide: FileService,
          useValue: {
            get: jest.fn().mockResolvedValue('https://example.com/test-cv.pdf'),
            upload: jest.fn().mockResolvedValue('test-cv-id'),
          },
        },
        {
          provide: MailService,
          useValue: {
            sendMail: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: AmqpService,
          useValue: {
            emitMessage: jest.fn().mockReturnValue({
              pipe: jest.fn().mockReturnValue({
                toPromise: jest.fn().mockResolvedValue(undefined),
              }),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ApplicationService>(ApplicationService);
    prismaService = module.get<PrismaService>(PrismaService);
    fileService = module.get<FileService>(FileService);
    mailService = module.get<MailService>(MailService);
    amqpService = module.get<AmqpService>(AmqpService);
  });

  // Store created test data IDs for cleanup
  const testDataIds = {
    users: [],
    companies: [],
    recruitments: [],
    files: [],
    applications: [],
  };

  beforeEach(async () => {
    // Reset test data IDs before each test
    testDataIds.users = [];
    testDataIds.companies = [];
    testDataIds.recruitments = [];
    testDataIds.files = [];
    testDataIds.applications = [];
  });

  afterEach(async () => {
    // Clean up test data in the correct order to respect foreign key constraints
    try {
      // Delete applications first
      for (const id of testDataIds.applications) {
        await prismaService.application
          .delete({
            where: { id },
          })
          .catch(() => {
            /* ignore errors */
          });
      }

      // Delete files next
      for (const id of testDataIds.files) {
        await prismaService.file
          .delete({
            where: { id },
          })
          .catch(() => {
            /* ignore errors */
          });
      }

      // Delete recruitments
      for (const id of testDataIds.recruitments) {
        await prismaService.recruitment
          .delete({
            where: { id },
          })
          .catch(() => {
            /* ignore errors */
          });
      }

      // Delete all users first - we'll handle the foreign key constraints by using cascade delete
      for (const id of testDataIds.users) {
        await prismaService.user
          .delete({
            where: { id },
          })
          .catch(() => {
            /* ignore errors */
          });
      }

      // Delete companies
      for (const id of testDataIds.companies) {
        await prismaService.company
          .delete({
            where: { id },
          })
          .catch(() => {
            /* ignore errors */
          });
      }
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }

    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prismaService.$disconnect();
  });

  // Helper function to create test data
  async function createTestData() {
    // Create a test user
    const testUser = await prismaService.user.create({
      data: {
        email: `testuser_thanhnd@example.com`,
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
        role: $Enums.Role.USER,
      },
    });
    testDataIds.users.push(testUser.id);

    // Create a test company
    const testCompany = await prismaService.company.create({
      data: {
        name: `Test Company_thanhnd`,
        code: `TEST_tnd`,
        description: 'Test description',
        address: 'Test address',
      },
    });
    testDataIds.companies.push(testCompany.id);

    // Create a company admin user
    const companyAdminUser = await prismaService.user.create({
      data: {
        email: `admin_thanhnd@testcompany.com`,
        password: 'password',
        firstName: 'Admin',
        lastName: 'User',
        role: $Enums.Role.COMPANY_ADMIN,
        company: {
          connect: {
            id: testCompany.id,
          },
        },
      },
    });
    testDataIds.users.push(companyAdminUser.id);

    // Create a test recruitment
    const testRecruitment = await prismaService.recruitment.create({
      data: {
        title: `Test Recruitment_thanhnd`,
        content: 'Test content',
        maxSalary: 1000,
        minSalary: 500,
        experience: 1,
        jobType: $Enums.JobType.FULL_TIME,
        deadline: new Date(Date.now() + 86400000), // Tomorrow
        company: {
          connect: {
            id: testCompany.id,
          },
        },
      },
    });
    testDataIds.recruitments.push(testRecruitment.id);

    // Create a test file (CV)
    const fileId = `test-cv-id_thanhnd`;
    const testFile = await prismaService.file.create({
      data: {
        id: fileId,
        key: `test-key_thanhnd`,
        name: 'test-cv.pdf',
        size: 1000,
        contentType: 'application/pdf',
        createdBy: {
          connect: {
            id: testUser.id,
          },
        },
      },
    });
    testDataIds.files.push(testFile.id);

    return {
      testUser,
      testCompany,
      companyAdminUser,
      testRecruitment,
      testFile,
    };
  }

  describe('createApplication', () => {
    it('should create an application with real database operations', async () => {
      const { testUser, testRecruitment, testFile } = await createTestData();

      // Mock the fileService.get method
      jest
        .spyOn(fileService, 'get')
        .mockResolvedValue('https://example.com/test-cv.pdf');

      // Create the application
      const createDto: CreateApplicationDto = {
        message: 'Test application_thanhnd',
        cvId: testFile.id,
        recruitmentId: testRecruitment.id,
      };

      const result = await service.createApplication(createDto, testUser.id);
      // Track the created application for cleanup
      testDataIds.applications.push(result.id);

      // Verify the result
      expect(result).toBeDefined();
      expect(result.message).toBe('Test application_thanhnd');
      expect(result.status).toBe($Enums.ApplicationStatus.PENDING);
      expect(result.cvId).toBe(testFile.id);
      expect(result.recruitmentId).toBe(testRecruitment.id);
      expect(result.userId).toBe(testUser.id);

      // Verify the application was created in the database
      const createdApplication = await prismaService.application.findUnique({
        where: {
          id: result.id,
        },
      });

      expect(createdApplication).toBeDefined();
      expect(createdApplication.message).toBe('Test application_thanhnd');
      expect(createdApplication.status).toBe($Enums.ApplicationStatus.PENDING);
    });

    it('should throw BadRequestException if recruitment deadline has passed', async () => {
      const { testUser, testCompany, testFile } = await createTestData();

      // Create a recruitment with a past deadline
      const expiredRecruitment = await prismaService.recruitment.create({
        data: {
          title: `Expired Recruitment ${Date.now()}`,
          content: 'Test content',
          maxSalary: 1000,
          minSalary: 500,
          experience: 1,
          jobType: $Enums.JobType.FULL_TIME,
          deadline: new Date(Date.now() - 86400000), // Yesterday
          company: {
            connect: {
              id: testCompany.id,
            },
          },
        },
      });
      testDataIds.recruitments.push(expiredRecruitment.id);

      const createDto: CreateApplicationDto = {
        message: 'Test application',
        cvId: testFile.id,
        recruitmentId: expiredRecruitment.id,
      };

      await expect(
        service.createApplication(createDto, testUser.id),
      ).rejects.toThrow(
        new BadRequestException(Message.RECRUITMENT_DEADLINE_PASSED),
      );
    });

    it('should throw BadRequestException if user is not found', async () => {
      const { testRecruitment, testFile } = await createTestData();

      const createDto: CreateApplicationDto = {
        message: 'Test application',
        cvId: testFile.id,
        recruitmentId: testRecruitment.id,
      };

      // Use a non-existent user ID
      await expect(service.createApplication(createDto, 9999)).rejects.toThrow(
        new BadRequestException(Message.USER_NOT_FOUND),
      );
    });

    it('should throw ForbiddenException if user role is not USER', async () => {
      const { testRecruitment, testFile, companyAdminUser } =
        await createTestData();

      const createDto: CreateApplicationDto = {
        message: 'Test application',
        cvId: testFile.id,
        recruitmentId: testRecruitment.id,
      };

      await expect(
        service.createApplication(createDto, companyAdminUser.id),
      ).rejects.toThrow(
        new ForbiddenException(Message.USER_NOT_ALLOWED_TO_APPLY),
      );
    });

    it('should throw BadRequestException if recruitment is not found', async () => {
      const { testUser, testFile } = await createTestData();

      const createDto: CreateApplicationDto = {
        message: 'Test application',
        cvId: testFile.id,
        recruitmentId: 9999, // Non-existent recruitment ID
      };

      await expect(
        service.createApplication(createDto, testUser.id),
      ).rejects.toThrow(new BadRequestException(Message.RECRUITMENT_NOT_FOUND));
    });

    it('should throw BadRequestException if CV is not found', async () => {
      const { testUser, testRecruitment } = await createTestData();

      const createDto: CreateApplicationDto = {
        message: 'Test application',
        cvId: 'non-existent-cv-id',
        recruitmentId: testRecruitment.id,
      };

      await expect(
        service.createApplication(createDto, testUser.id),
      ).rejects.toThrow(
        new BadRequestException(Message.CV_NOT_FOUND('non-existent-cv-id')),
      );
    });

    it('should throw BadRequestException if user has already applied for the recruitment', async () => {
      const { testUser, testRecruitment, testFile } = await createTestData();

      // Create an initial application
      const initialApplication = await prismaService.application.create({
        data: {
          message: 'Initial application',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(initialApplication.id);

      // Try to create another application for the same recruitment
      const createDto: CreateApplicationDto = {
        message: 'Second application',
        cvId: testFile.id,
        recruitmentId: testRecruitment.id,
      };

      await expect(
        service.createApplication(createDto, testUser.id),
      ).rejects.toThrow(
        new BadRequestException(
          Message.USER_ALREADY_APPLIED(
            `${testUser.firstName} ${testUser.lastName}`,
          ),
        ),
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated applications', async () => {
      const { testUser, testRecruitment, testFile } = await createTestData();

      // Create multiple applications individually to track IDs
      const app1 = await prismaService.application.create({
        data: {
          message: 'Application 1',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(app1.id);

      const app2 = await prismaService.application.create({
        data: {
          message: 'Application 2',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(app2.id);

      const filter: ApplicationFilter = {
        recruitmentId: testRecruitment.id,
        userId: testUser.id,
        limit: 10,
        offset: 0,
        sort: [],
      };

      const result = await service.findAll(filter);

      expect(result).toBeDefined();
      expect((result as any).items.length).toBe(2);
      expect((result as any).total).toBe(2);
    });
  });

  describe('findByRecruitmentAndUser', () => {
    it('should return application for a specific recruitment and user', async () => {
      const { testUser, testRecruitment, testFile } = await createTestData();

      // Create an application
      const application = await prismaService.application.create({
        data: {
          message: 'Test application',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(application.id);

      // Mock the fileService.get method
      jest
        .spyOn(fileService, 'get')
        .mockResolvedValue('https://example.com/test-cv.pdf');

      const result = await service.findByRecruitmentAndUser(
        testRecruitment.id,
        testUser,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(application.id);
      expect(result.cvUrl).toBe('https://example.com/test-cv.pdf');
    });

    it('should throw NotFoundException if application not found', async () => {
      const { testUser } = await createTestData();

      await expect(
        service.findByRecruitmentAndUser(999, testUser),
      ).rejects.toThrow(
        new NotFoundException(
          Message.USER_NOT_APPLIED(
            `${testUser.firstName} ${testUser.lastName}`,
          ),
        ),
      );
    });

    it('should throw ForbiddenException if application userId does not match requesting user id', async () => {
      const { testUser, testRecruitment, testFile, companyAdminUser } =
        await createTestData();

      // Create an application for testUser
      const application = await prismaService.application.create({
        data: {
          message: 'Test application',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(application.id);

      // Mock the prisma.application.findFirst to return the application but with a different userId
      jest.spyOn(prismaService.application, 'findFirst').mockResolvedValueOnce({
        ...application,
        userId: testUser.id, // This is different from companyAdminUser.id
        recruitment: { id: testRecruitment.id },
        cv: { id: testFile.id },
      } as any);

      // Try to access the application as companyAdminUser
      await expect(
        service.findByRecruitmentAndUser(testRecruitment.id, companyAdminUser),
      ).rejects.toThrow(new ForbiddenException());
    });
  });

  describe('findByRecruitment', () => {
    it('should return all applications for a recruitment', async () => {
      const { testUser, testRecruitment, testFile, companyAdminUser } =
        await createTestData();

      // Create multiple applications individually to track IDs
      const app1 = await prismaService.application.create({
        data: {
          message: 'Application 1',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(app1.id);

      const app2 = await prismaService.application.create({
        data: {
          message: 'Application 2',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(app2.id);

      const result = await service.findByRecruitment(
        testRecruitment.id,
        companyAdminUser,
      );

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
    });

    it('should throw ForbiddenException if user has no company', async () => {
      const { testRecruitment, testUser } = await createTestData();

      await expect(
        service.findByRecruitment(testRecruitment.id, testUser),
      ).rejects.toThrow(new ForbiddenException());
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      const { testRecruitment } = await createTestData();

      // Mock the prisma.user.findUnique to return null
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(null);

      // Create a fake user
      const fakeUser = {
        id: 9999,
        email: 'fake@example.com',
        firstName: 'Fake',
        lastName: 'User',
        role: $Enums.Role.COMPANY_ADMIN,
      } as User;

      await expect(
        service.findByRecruitment(testRecruitment.id, fakeUser),
      ).rejects.toThrow(new UnauthorizedException());
    });

    it('should throw NotFoundException if recruitment is not found', async () => {
      const { companyAdminUser } = await createTestData();

      // Mock the prisma.recruitment.findUnique to return null
      jest
        .spyOn(prismaService.recruitment, 'findUnique')
        .mockResolvedValueOnce(null);

      await expect(
        service.findByRecruitment(9999, companyAdminUser),
      ).rejects.toThrow(new NotFoundException(Message.RECRUITMENT_NOT_FOUND));
    });

    it('should throw ForbiddenException if recruitment does not belong to user company', async () => {
      const { companyAdminUser, testRecruitment } = await createTestData();

      // Create a different company
      const otherCompany = await prismaService.company.create({
        data: {
          name: `Other Company ${Date.now()}`,
          code: `OTHER_${Date.now()}`,
          description: 'Other description',
          address: 'Other address',
        },
      });
      testDataIds.companies.push(otherCompany.id);

      // Mock the recruitment to belong to a different company
      jest
        .spyOn(prismaService.recruitment, 'findUnique')
        .mockResolvedValueOnce({
          id: testRecruitment.id,
          companyId: otherCompany.id, // Different from companyAdminUser's company
          company: {
            id: otherCompany.id,
          },
        } as any);

      await expect(
        service.findByRecruitment(testRecruitment.id, companyAdminUser),
      ).rejects.toThrow(
        new ForbiddenException(Message.RECRUITMENT_COMPANY_FORBIDDEN),
      );
    });
  });

  describe('getApplicationDetail', () => {
    it('should return application detail', async () => {
      const { testUser, testRecruitment, testFile, companyAdminUser } =
        await createTestData();

      // Create an application
      const application = await prismaService.application.create({
        data: {
          message: 'Test application',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(application.id);

      // Mock the fileService.get method
      jest
        .spyOn(fileService, 'get')
        .mockResolvedValue('https://example.com/test-cv.pdf');

      const result = await service.getApplicationDetail(
        application.id,
        companyAdminUser,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(application.id);
      expect(result.cvUrl).toBe('https://example.com/test-cv.pdf');
    });

    it('should throw NotFoundException if application not found', async () => {
      const { companyAdminUser } = await createTestData();

      await expect(
        service.getApplicationDetail(999, companyAdminUser),
      ).rejects.toThrow(
        new NotFoundException(Message.APPLICATION_NOT_FOUND(String(999))),
      );
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      const { testUser, testRecruitment, testFile } = await createTestData();

      // Create an application
      const application = await prismaService.application.create({
        data: {
          message: 'Test application',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(application.id);

      // Mock the prisma.user.findUnique to return null
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(null);

      // Create a fake user
      const fakeUser = {
        id: 9999,
        email: 'fake@example.com',
        firstName: 'Fake',
        lastName: 'User',
        role: $Enums.Role.COMPANY_ADMIN,
      } as User;

      await expect(
        service.getApplicationDetail(application.id, fakeUser),
      ).rejects.toThrow(new UnauthorizedException());
    });

    it('should throw ForbiddenException if user has no company', async () => {
      const { testUser, testRecruitment, testFile } = await createTestData();

      // Create an application
      const application = await prismaService.application.create({
        data: {
          message: 'Test application',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(application.id);

      // Mock the prisma.user.findUnique to return a user without a company
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce({
        ...testUser,
        company: null,
      } as any);

      await expect(
        service.getApplicationDetail(application.id, testUser),
      ).rejects.toThrow(new ForbiddenException());
    });

    it('should throw ForbiddenException if application does not belong to user company', async () => {
      const { testUser, testRecruitment, testFile, companyAdminUser } =
        await createTestData();

      // Create an application
      const application = await prismaService.application.create({
        data: {
          message: 'Test application',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(application.id);

      // Create a different company
      const otherCompany = await prismaService.company.create({
        data: {
          name: `Other Company ${Date.now()}`,
          code: `OTHER_${Date.now()}`,
          description: 'Other description',
          address: 'Other address',
        },
      });
      testDataIds.companies.push(otherCompany.id);

      // Mock the application to have a recruitment from a different company
      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce({
          ...application,
          recruitment: {
            companyId: otherCompany.id, // Different from companyAdminUser's company
            company: {
              id: otherCompany.id,
            },
          },
        } as any);

      await expect(
        service.getApplicationDetail(application.id, companyAdminUser),
      ).rejects.toThrow(
        new ForbiddenException(Message.APPLICATION_NOT_BELONG_TO_USER),
      );
    });
  });

  describe('updateApplicationStatus', () => {
    it('should update application status to APPROVED', async () => {
      const { testUser, testRecruitment, testFile, companyAdminUser } =
        await createTestData();

      // Create an application
      const application = await prismaService.application.create({
        data: {
          message: 'Test application',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(application.id);

      // Mock the amqpService.emitMessage method
      jest.spyOn(amqpService, 'emitMessage').mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          toPromise: jest.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await service.updateApplicationStatus(
        application.id,
        companyAdminUser,
        true,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(application.id);
      expect(result.status).toBe($Enums.ApplicationStatus.APPROVED);

      // Verify the application was updated in the database
      const updatedApplication = await prismaService.application.findUnique({
        where: {
          id: application.id,
        },
      });

      expect(updatedApplication).toBeDefined();
      expect(updatedApplication.status).toBe($Enums.ApplicationStatus.APPROVED);
    });

    it('should update application status to REJECTED', async () => {
      const { testUser, testRecruitment, testFile, companyAdminUser } =
        await createTestData();

      // Create an application
      const application = await prismaService.application.create({
        data: {
          message: 'Test application',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(application.id);

      // Mock the amqpService.emitMessage method
      jest.spyOn(amqpService, 'emitMessage').mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          toPromise: jest.fn().mockResolvedValue(undefined),
        }),
      } as any);

      const result = await service.updateApplicationStatus(
        application.id,
        companyAdminUser,
        false,
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(application.id);
      expect(result.status).toBe($Enums.ApplicationStatus.REJECTED);

      // Verify the application was updated in the database
      const updatedApplication = await prismaService.application.findUnique({
        where: {
          id: application.id,
        },
      });

      expect(updatedApplication).toBeDefined();
      expect(updatedApplication.status).toBe($Enums.ApplicationStatus.REJECTED);
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      const { testUser, testRecruitment, testFile } = await createTestData();

      // Create an application
      const application = await prismaService.application.create({
        data: {
          message: 'Test application',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(application.id);

      // Mock the prisma.user.findUnique to return null
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce(null);

      // Create a fake user
      const fakeUser = {
        id: 9999,
        email: 'fake@example.com',
        firstName: 'Fake',
        lastName: 'User',
        role: $Enums.Role.COMPANY_ADMIN,
      } as User;

      await expect(
        service.updateApplicationStatus(application.id, fakeUser, true),
      ).rejects.toThrow(new UnauthorizedException());
    });

    it('should throw ForbiddenException if user has no company', async () => {
      const { testUser, testRecruitment, testFile } = await createTestData();

      // Create an application
      const application = await prismaService.application.create({
        data: {
          message: 'Test application',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(application.id);

      // Mock the prisma.user.findUnique to return a user without a company
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce({
        ...testUser,
        company: null,
        role: $Enums.Role.COMPANY_ADMIN,
      } as any);

      await expect(
        service.updateApplicationStatus(application.id, testUser, true),
      ).rejects.toThrow(
        new ForbiddenException(Message.APPLICATION_NOT_BELONG_TO_USER),
      );
    });

    it('should throw ForbiddenException if user role is not COMPANY_ADMIN or COMPANY_HR', async () => {
      const { testUser, testRecruitment, testFile } = await createTestData();

      // Create an application
      const application = await prismaService.application.create({
        data: {
          message: 'Test application',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(application.id);

      // Mock the prisma.user.findUnique to return a user with a company but wrong role
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValueOnce({
        ...testUser,
        company: { id: 1 },
        role: $Enums.Role.USER, // Not COMPANY_ADMIN or COMPANY_HR
      } as any);

      await expect(
        service.updateApplicationStatus(application.id, testUser, true),
      ).rejects.toThrow(new ForbiddenException());
    });

    it('should throw NotFoundException if application is not found', async () => {
      const { companyAdminUser } = await createTestData();

      // Mock the prisma.application.findUnique to return null
      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce(null);

      await expect(
        service.updateApplicationStatus(9999, companyAdminUser, true),
      ).rejects.toThrow(
        new NotFoundException(Message.APPLICATION_NOT_FOUND(String(9999))),
      );
    });

    it('should throw ForbiddenException if application does not belong to user company', async () => {
      const { testUser, testRecruitment, testFile, companyAdminUser } =
        await createTestData();

      // Create an application
      const application = await prismaService.application.create({
        data: {
          message: 'Test application',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(application.id);

      // Create a different company
      const otherCompany = await prismaService.company.create({
        data: {
          name: `Other Company ${Date.now()}`,
          code: `OTHER_${Date.now()}`,
          description: 'Other description',
          address: 'Other address',
        },
      });
      testDataIds.companies.push(otherCompany.id);

      // Mock the application to have a recruitment from a different company
      jest
        .spyOn(prismaService.application, 'findUnique')
        .mockResolvedValueOnce({
          ...application,
          recruitment: {
            companyId: otherCompany.id, // Different from companyAdminUser's company
            company: {
              id: otherCompany.id,
            },
          },
          user: testUser,
        } as any);

      await expect(
        service.updateApplicationStatus(application.id, companyAdminUser, true),
      ).rejects.toThrow(
        new ForbiddenException(Message.APPLICATION_NOT_BELONG_TO_USER),
      );
    });
  });

  describe('updateApplication', () => {
    it('should update an application successfully', async () => {
      const { testUser, testRecruitment, testFile } = await createTestData();

      // Create an application
      const application = await prismaService.application.create({
        data: {
          message: 'Test application',
          status: $Enums.ApplicationStatus.PENDING,
          cvId: testFile.id,
          recruitmentId: testRecruitment.id,
          userId: testUser.id,
        },
      });
      testDataIds.applications.push(application.id);

      const updateDto: UpdateApplicationDto = {
        message: 'Updated application',
        cvId: testFile.id,
        status: $Enums.ApplicationStatus.APPROVED,
      };

      const result = await service.updateApplication(application.id, updateDto);

      expect(result).toBeDefined();
      expect(result.id).toBe(application.id);
      expect(result.message).toBe('Updated application');
      expect(result.status).toBe($Enums.ApplicationStatus.APPROVED);

      // Verify the application was updated in the database
      const updatedApplication = await prismaService.application.findUnique({
        where: {
          id: application.id,
        },
      });

      expect(updatedApplication).toBeDefined();
      expect(updatedApplication.message).toBe('Updated application');
      expect(updatedApplication.status).toBe($Enums.ApplicationStatus.APPROVED);
    });

    it('should throw NotFoundException if application not found', async () => {
      const { testFile } = await createTestData();

      const updateDto: UpdateApplicationDto = {
        message: 'Updated application',
        cvId: testFile.id,
        status: $Enums.ApplicationStatus.APPROVED,
      };

      await expect(service.updateApplication(999, updateDto)).rejects.toThrow(
        new NotFoundException(Message.APPLICATION_NOT_FOUND(String(999))),
      );
    });
  });
});
