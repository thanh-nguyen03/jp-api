import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { RecruitmentServiceImpl } from './recruitment.service';
import { CompanyService } from '../company/company.service';
import { AmqpService } from '../amqp/amqp.service';
import { INestApplication, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Role, User, JobType } from '@prisma/client';
import { RecruitmentDto } from './dtos/recruitment.dto';
import { RecruitmentFilter } from './dtos/recruitment-filter.dto';
import { Message } from '../../constants/message';

describe('RecruitmentServiceImpl (Integration, Real DB)', () => {
  let app: INestApplication;
  let recruitmentService: RecruitmentServiceImpl;
  let prismaService: PrismaService;
  let companyService: CompanyService;

  // Mock AmqpService to avoid real AMQP calls
  const amqpServiceMock = { emitMessage: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecruitmentServiceImpl,
        PrismaService,
        { provide: CompanyService, useValue: { findById: jest.fn() } },
        { provide: AmqpService, useValue: amqpServiceMock },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    recruitmentService = module.get<RecruitmentServiceImpl>(RecruitmentServiceImpl);
    prismaService = module.get<PrismaService>(PrismaService);
    companyService = module.get<CompanyService>(CompanyService);
  });

  beforeEach(async () => {
    // 1. Find all test companies
    const testCompanies = await prismaService.company.findMany({
      where: { code: { contains: 'TEST-' } },
      select: { id: true },
    });
    const testCompanyIds = testCompanies.map(c => c.id);

    // 2. Find all recruitments for those companies
    let testRecruitmentIds: number[] = [];
    if (testCompanyIds.length > 0) {
      const testRecruitments = await prismaService.recruitment.findMany({
        where: { companyId: { in: testCompanyIds } },
        select: { id: true },
      });
      testRecruitmentIds = testRecruitments.map(r => r.id);
    }

    // 3. Delete applications for those recruitments
    if (testRecruitmentIds.length > 0) {
      await prismaService.application.deleteMany({
        where: { recruitmentId: { in: testRecruitmentIds } },
      });
    }

    // 4. Delete recruitments for those companies
    if (testCompanyIds.length > 0) {
      await prismaService.recruitment.deleteMany({
        where: { companyId: { in: testCompanyIds } },
      });
    }
    // Delete any remaining test recruitments (by title)
    await prismaService.recruitment.deleteMany({ where: { title: { contains: 'TEST-' } } });

    // 5. Delete companies
    await prismaService.company.deleteMany({ where: { code: { contains: 'TEST-' } } });

    // 6. Delete users
    await prismaService.user.deleteMany({ where: { email: { contains: 'test-' } } });

    jest.clearAllMocks();
  });
  afterEach(async () => {
    // Repeat the same logic as above
    const testCompanies = await prismaService.company.findMany({
      where: { code: { contains: 'TEST-' } },
      select: { id: true },
    });
    const testCompanyIds = testCompanies.map(c => c.id);

    let testRecruitmentIds: number[] = [];
    if (testCompanyIds.length > 0) {
      const testRecruitments = await prismaService.recruitment.findMany({
        where: { companyId: { in: testCompanyIds } },
        select: { id: true },
      });
      testRecruitmentIds = testRecruitments.map(r => r.id);
    }

    if (testRecruitmentIds.length > 0) {
      await prismaService.application.deleteMany({
        where: { recruitmentId: { in: testRecruitmentIds } },
      });
    }

    if (testCompanyIds.length > 0) {
      await prismaService.recruitment.deleteMany({
        where: { companyId: { in: testCompanyIds } },
      });
    }
    await prismaService.recruitment.deleteMany({ where: { title: { contains: 'TEST-' } } });
    await prismaService.company.deleteMany({ where: { code: { contains: 'TEST-' } } });
    await prismaService.user.deleteMany({ where: { email: { contains: 'test-' } } });
  });
  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  // Helper: create company, user
  const createTestCompany = async () => prismaService.company.create({
    data: {
      code: `TEST-COMP-${Date.now()}`,
      name: 'Test Company',
      description: 'desc',
      address: 'addr',
      logo: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  });
  const createTestUser = async (companyId: number, role: Role = Role.COMPANY_ADMIN) => prismaService.user.create({
    data: {
      email: `test-user-${Date.now()}@example.com`,
      firstName: 'Test',
      lastName: 'User',
      password: 'hashed',
      displayName: 'Test User',
      avatar: null,
      role,
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  });

  // ### Test Case Set 1: Create Recruitment
  describe('createRecruitment', () => {
    /**
     * #### TC-RS-001: Valid Recruitment Creation with All Required Fields
     * - **Goal:** Verify that a recruitment can be successfully created when all required fields are provided with valid data
     * - **Input:**
     *   ```json
     *   { "title": "TEST-REC-1", "content": "desc", "jobType": "FULL_TIME", "minSalary": 1000, "maxSalary": 2000, "experience": 2, "deadline": "future date", "companyId": "valid", ... }
     *   ```
     * - **Expected Output:**
     *   - Recruitment is created and returned
     *   - AMQP message is emitted
     */
    it('TC-RS-001: Valid Recruitment Creation with All Required Fields', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      (companyService.findById as jest.Mock).mockResolvedValue(company);

      const dto: RecruitmentDto = {
        id: 0,
        title: 'TEST-REC-1',
        content: 'desc',
        jobType: 'FULL_TIME',
        minSalary: 1000,
        maxSalary: 2000,
        experience: 2,
        deadline: new Date(Date.now() + 1000000),
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await recruitmentService.createRecruitment(dto, user);
      expect(result).toMatchObject({ title: 'TEST-REC-1', companyId: company.id });
      expect(amqpServiceMock.emitMessage).toHaveBeenCalled();
    });
    /**
     * #### TC-RS-002: Company Not Found
     * - **Goal:** Should throw NotFoundException if company does not exist
     * - **Input:**
     *   User with non-existent companyId, valid recruitment DTO
     * - **Expected Output:**
     *   - NotFoundException is thrown
     */
    it('TC-RS-002: Company Not Found', async () => {
      (companyService.findById as jest.Mock).mockResolvedValue(null);
      const user = { companyId: 9999 } as User;
      const dto = { id: 0, title: 'TEST-REC-2', content: '', jobType: JobType.FULL_TIME, minSalary: 0, maxSalary: 0, experience: 0, deadline: new Date(), companyId: 9999, createdAt: new Date(), updatedAt: new Date() };
      await expect(recruitmentService.createRecruitment(dto, user)).rejects.toThrow(NotFoundException);
    });
    /**
     * #### TC-RS-003: Invalid Input (Empty Title)
     * - **Goal:** Should throw error for empty title
     * - **Input:**
     *   Recruitment DTO with empty title
     * - **Expected Output:**
     *   - Error is thrown
     */
    it('TC-RS-003: Invalid Input (Empty Title)', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      (companyService.findById as jest.Mock).mockResolvedValue(company);
      const dto = { id: 0, title: '', content: '', jobType: JobType.FULL_TIME, minSalary: 0, maxSalary: 0, experience: 0, deadline: new Date(), companyId: company.id, createdAt: new Date(), updatedAt: new Date() };
      await expect(recruitmentService.createRecruitment(dto, user)).rejects.toThrow();
    });
    /**
     * #### TC-RS-004: User Has No CompanyId
     * - **Goal:** Should throw error if user has no companyId
     * - **Input:**
     *   User with companyId null, valid recruitment DTO
     * - **Expected Output:**
     *   - Error is thrown
     */
    it('TC-RS-004: User Has No CompanyId', async () => {
      (companyService.findById as jest.Mock).mockResolvedValue(null);
      const user = { companyId: null } as User;
      const dto = { id: 0, title: 'TEST-REC-3', content: '', jobType: JobType.FULL_TIME, minSalary: 0, maxSalary: 0, experience: 0, deadline: new Date(), companyId: null, createdAt: new Date(), updatedAt: new Date() };
      await expect(recruitmentService.createRecruitment(dto, user)).rejects.toThrow();
    });
    /**
     * #### TC-RS-005: minSalary Greater Than maxSalary
     * - **Goal:** Should throw error if minSalary > maxSalary
     * - **Input:**
     *   Recruitment DTO with minSalary > maxSalary
     * - **Expected Output:**
     *   - Error is thrown
     */
    it('TC-RS-005: minSalary Greater Than maxSalary', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      (companyService.findById as jest.Mock).mockResolvedValue(company);
      const dto = {
        id: 0,
        title: 'TEST-REC-MINMAX',
        content: 'desc',
        jobType: JobType.FULL_TIME,
        minSalary: 2000,
        maxSalary: 1000,
        experience: 2,
        deadline: new Date(Date.now() + 1000000),
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await expect(recruitmentService.createRecruitment(dto, user)).rejects.toThrow();
    });
    /**
     * #### TC-RS-006: Deadline in the Past
     * - **Goal:** Should throw error if deadline is in the past
     * - **Input:**
     *   Recruitment DTO with past deadline
     * - **Expected Output:**
     *   - Error is thrown
     */
    it('TC-RS-006: Deadline in the Past', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      (companyService.findById as jest.Mock).mockResolvedValue(company);
      const dto = {
        id: 0,
        title: 'TEST-REC-PAST',
        content: 'desc',
        jobType: JobType.FULL_TIME,
        minSalary: 1000,
        maxSalary: 2000,
        experience: 2,
        deadline: new Date(Date.now() - 1000000),
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await expect(recruitmentService.createRecruitment(dto, user)).rejects.toThrow();
    });
    /**
     * #### TC-RS-007: Invalid JobType
     * - **Goal:** Should throw error for invalid jobType
     * - **Input:**
     *   Recruitment DTO with invalid jobType
     * - **Expected Output:**
     *   - Error is thrown
     */
    it('TC-RS-007: Invalid JobType', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      (companyService.findById as jest.Mock).mockResolvedValue(company);
      const dto = {
        id: 0,
        title: 'TEST-REC-INVALID-JOBTYPE',
        content: 'desc',
        jobType: 'INVALID_JOBTYPE' as any,
        minSalary: 1000,
        maxSalary: 2000,
        experience: 2,
        deadline: new Date(Date.now() + 1000000),
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await expect(recruitmentService.createRecruitment(dto as any, user)).rejects.toThrow();
    });
    /**
     * #### TC-RS-008: Negative Experience
     * - **Goal:** Should throw error for negative experience
     * - **Input:**
     *   Recruitment DTO with negative experience
     * - **Expected Output:**
     *   - Error is thrown
     */
    it('TC-RS-008: Negative Experience', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      (companyService.findById as jest.Mock).mockResolvedValue(company);
      const dto = {
        id: 0,
        title: 'TEST-REC-NEG-EXP',
        content: 'desc',
        jobType: JobType.FULL_TIME,
        minSalary: 1000,
        maxSalary: 2000,
        experience: -1,
        deadline: new Date(Date.now() + 1000000),
        companyId: company.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await expect(recruitmentService.createRecruitment(dto, user)).rejects.toThrow();
    });
  });

  // ### Test Case Set 2: Update Recruitment
  describe('updateRecruitment', () => {
    /**
     * #### TC-RS-009: Valid Recruitment Update
     * - **Goal:** Should update recruitment with valid data
     * - **Input:**
     *   Existing recruitment, updateData { title: 'Updated Title' }
     * - **Expected Output:**
     *   - Recruitment title is updated
     *   - AMQP message is emitted
     */
    it('TC-RS-009: Valid Recruitment Update', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      const recruitment = await prismaService.recruitment.create({
        data: {
          title: 'TEST-REC-UPDATE',
          content: 'desc',
          jobType: 'FULL_TIME',
          minSalary: 1000,
          maxSalary: 2000,
          experience: 2,
          deadline: new Date(Date.now() + 1000000),
          company: { connect: { id: company.id } },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      const updateData = { title: 'Updated Title' };
      const result = await recruitmentService.updateRecruitment(recruitment.id, updateData, user);
      expect(result.title).toBe('Updated Title');
      expect(amqpServiceMock.emitMessage).toHaveBeenCalled();
    });
    /**
     * #### TC-RS-010: Recruitment Not Found
     * - **Goal:** Should throw NotFoundException if recruitment does not exist
     * - **Input:**
     *   Non-existent recruitmentId, updateData
     * - **Expected Output:**
     *   - NotFoundException is thrown
     */
    it('TC-RS-010: Recruitment Not Found', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      await expect(recruitmentService.updateRecruitment(99999, { title: 'X' }, user)).rejects.toThrow(NotFoundException);
    });
    /**
     * #### TC-RS-011: User Has No CompanyId
     * - **Goal:** Should throw ForbiddenException if user has no companyId
     * - **Input:**
     *   User with companyId null, updateData
     * - **Expected Output:**
     *   - ForbiddenException is thrown
     */
    it('TC-RS-011: User Has No CompanyId', async () => {
      const user = { companyId: null } as User;
      await expect(recruitmentService.updateRecruitment(1, { title: 'X' }, user)).rejects.toThrow(ForbiddenException);
    });
    /**
     * #### TC-RS-012: Recruitment Belongs to Another Company
     * - **Goal:** Should throw ForbiddenException if recruitment belongs to another company
     * - **Input:**
     *   User from company1, recruitment from company2
     * - **Expected Output:**
     *   - ForbiddenException is thrown
     */
    it('TC-RS-012: Recruitment Belongs to Another Company', async () => {
      const company1 = await createTestCompany();
      const company2 = await createTestCompany();
      const user = await createTestUser(company1.id, Role.COMPANY_ADMIN);
      const recruitment = await prismaService.recruitment.create({
        data: {
          title: 'TEST-REC-OTHERCOMP',
          content: 'desc',
          jobType: 'FULL_TIME',
          minSalary: 1000,
          maxSalary: 2000,
          experience: 2,
          deadline: new Date(Date.now() + 1000000),
          company: { connect: { id: company2.id } },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      await expect(recruitmentService.updateRecruitment(recruitment.id, { title: 'X' }, user)).rejects.toThrow(ForbiddenException);
    });
    /**
     * #### TC-RS-013: Empty Update Data
     * - **Goal:** Should not change anything if update data is empty
     * - **Input:**
     *   Existing recruitment, updateData {}
     * - **Expected Output:**
     *   - Recruitment remains unchanged
     */
    it('TC-RS-013: Empty Update Data', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      const recruitment = await prismaService.recruitment.create({
        data: {
          title: 'TEST-REC-EMPTY-UPD',
          content: 'desc',
          jobType: 'FULL_TIME',
          minSalary: 1000,
          maxSalary: 2000,
          experience: 2,
          deadline: new Date(Date.now() + 1000000),
          company: { connect: { id: company.id } },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      const result = await recruitmentService.updateRecruitment(recruitment.id, {}, user);
      expect(result.title).toBe('TEST-REC-EMPTY-UPD');
    });
    /**
     * #### TC-RS-014: minSalary Greater Than maxSalary
     * - **Goal:** Should throw error if minSalary > maxSalary
     * - **Input:**
     *   updateData { minSalary: 3000, maxSalary: 2000 }
     * - **Expected Output:**
     *   - Error is thrown
     */
    it('TC-RS-014: minSalary Greater Than maxSalary', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      const recruitment = await prismaService.recruitment.create({
        data: {
          title: 'TEST-REC-UPD-MINMAX',
          content: 'desc',
          jobType: 'FULL_TIME',
          minSalary: 1000,
          maxSalary: 2000,
          experience: 2,
          deadline: new Date(Date.now() + 1000000),
          company: { connect: { id: company.id } },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      await expect(recruitmentService.updateRecruitment(recruitment.id, { minSalary: 3000, maxSalary: 2000 }, user)).rejects.toThrow();
    });
    /**
     * #### TC-RS-015: Deadline in the Past
     * - **Goal:** Should throw error if deadline is in the past
     * - **Input:**
     *   updateData { deadline: past date }
     * - **Expected Output:**
     *   - Error is thrown
     */
    it('TC-RS-015: Deadline in the Past', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      const recruitment = await prismaService.recruitment.create({
        data: {
          title: 'TEST-REC-UPD-PAST',
          content: 'desc',
          jobType: 'FULL_TIME',
          minSalary: 1000,
          maxSalary: 2000,
          experience: 2,
          deadline: new Date(Date.now() + 1000000),
          company: { connect: { id: company.id } },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      await expect(recruitmentService.updateRecruitment(recruitment.id, { deadline: new Date(Date.now() - 1000000) }, user)).rejects.toThrow();
    });
    /**
     * #### TC-RS-016: Invalid JobType
     * - **Goal:** Should throw error for invalid jobType
     * - **Input:**
     *   updateData { jobType: 'INVALID_JOBTYPE' }
     * - **Expected Output:**
     *   - Error is thrown
     */
    it('TC-RS-016: Invalid JobType', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      const recruitment = await prismaService.recruitment.create({
        data: {
          title: 'TEST-REC-UPD-INVALID-JOBTYPE',
          content: 'desc',
          jobType: 'FULL_TIME',
          minSalary: 1000,
          maxSalary: 2000,
          experience: 2,
          deadline: new Date(Date.now() + 1000000),
          company: { connect: { id: company.id } },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      await expect(recruitmentService.updateRecruitment(recruitment.id, { jobType: 'INVALID_JOBTYPE' as any }, user)).rejects.toThrow();
    });
  });

  // ### Test Case Set 3: Delete Recruitment
  describe('deleteRecruitment', () => {
    /**
     * #### TC-RS-017: Valid Recruitment Deletion
     * - **Goal:** Should delete recruitment (happy path)
     * - **Input:**
     *   Existing recruitment, valid user
     * - **Expected Output:**
     *   - Recruitment is deleted
     *   - AMQP message is emitted
     */
    it('TC-RS-017: Valid Recruitment Deletion', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      const recruitment = await prismaService.recruitment.create({
        data: {
          title: 'TEST-REC-DEL',
          content: 'desc',
          jobType: 'FULL_TIME',
          minSalary: 1000,
          maxSalary: 2000,
          experience: 2,
          deadline: new Date(Date.now() + 1000000),
          company: { connect: { id: company.id } },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      await expect(recruitmentService.deleteRecruitment(recruitment.id, user)).resolves.toBeUndefined();
      expect(amqpServiceMock.emitMessage).toHaveBeenCalled();
    });
    /**
     * #### TC-RS-018: Recruitment Not Found
     * - **Goal:** Should throw NotFoundException if recruitment does not exist
     * - **Input:**
     *   Non-existent recruitmentId, valid user
     * - **Expected Output:**
     *   - NotFoundException is thrown
     */
    it('TC-RS-018: Recruitment Not Found', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      await expect(recruitmentService.deleteRecruitment(99999, user)).rejects.toThrow(NotFoundException);
    });
    /**
     * #### TC-RS-019: Recruitment Belongs to Another Company
     * - **Goal:** Should throw ForbiddenException if recruitment belongs to another company
     * - **Input:**
     *   User from company1, recruitment from company2
     * - **Expected Output:**
     *   - ForbiddenException is thrown
     */
    it('TC-RS-019: Recruitment Belongs to Another Company', async () => {
      const company1 = await createTestCompany();
      const company2 = await createTestCompany();
      const user = await createTestUser(company1.id, Role.COMPANY_ADMIN);
      const recruitment = await prismaService.recruitment.create({
        data: {
          title: 'TEST-REC-DEL-OTHER',
          content: 'desc',
          jobType: 'FULL_TIME',
          minSalary: 1000,
          maxSalary: 2000,
          experience: 2,
          deadline: new Date(Date.now() + 1000000),
          company: { connect: { id: company2.id } },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      await expect(recruitmentService.deleteRecruitment(recruitment.id, user)).rejects.toThrow(ForbiddenException);
    });
    /**
     * #### TC-RS-020: User Has No CompanyId
     * - **Goal:** Should throw ForbiddenException if user has no companyId
     * - **Input:**
     *   User with companyId null
     * - **Expected Output:**
     *   - ForbiddenException is thrown
     */
    it('TC-RS-020: User Has No CompanyId', async () => {
      const user = { companyId: null } as User;
      await expect(recruitmentService.deleteRecruitment(1, user)).rejects.toThrow(ForbiddenException);
    });
    /**
     * #### TC-RS-021: User Not Company Admin/HR
     * - **Goal:** Should throw ForbiddenException if user is not company admin/HR
     * - **Input:**
     *   User with role USER
     * - **Expected Output:**
     *   - ForbiddenException is thrown
     */
    it('TC-RS-021: User Not Company Admin/HR', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.USER);
      const recruitment = await prismaService.recruitment.create({
        data: {
          title: 'TEST-REC-DEL-NONADMIN',
          content: 'desc',
          jobType: 'FULL_TIME',
          minSalary: 1000,
          maxSalary: 2000,
          experience: 2,
          deadline: new Date(Date.now() + 1000000),
          company: { connect: { id: company.id } },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      await expect(recruitmentService.deleteRecruitment(recruitment.id, user)).rejects.toThrow(ForbiddenException);
    });
    /**
     * #### TC-RS-022: User From Different Company
     * - **Goal:** Should throw ForbiddenException if user is from a different company
     * - **Input:**
     *   User from company1, recruitment from company2
     * - **Expected Output:**
     *   - ForbiddenException is thrown
     */
    it('TC-RS-022: User From Different Company', async () => {
      const company1 = await createTestCompany();
      const company2 = await createTestCompany();
      const user = await createTestUser(company1.id, Role.COMPANY_ADMIN);
      const recruitment = await prismaService.recruitment.create({
        data: {
          title: 'TEST-REC-DEL-DIFFCOMP',
          content: 'desc',
          jobType: 'FULL_TIME',
          minSalary: 1000,
          maxSalary: 2000,
          experience: 2,
          deadline: new Date(Date.now() + 1000000),
          company: { connect: { id: company2.id } },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      await expect(recruitmentService.deleteRecruitment(recruitment.id, user)).rejects.toThrow(ForbiddenException);
    });
  });

  // ### Test Case Set 4: Find All Recruitments
  describe('findAll', () => {
    /**
     * #### TC-RS-023: Valid Filter (Happy Path)
     * - **Goal:** Should return recruitments matching filter
     * - **Input:**
     *   Valid filter object
     * - **Expected Output:**
     *   - Array of matching recruitments
     */
    it('TC-RS-023: Valid Filter (Happy Path)', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      await prismaService.recruitment.create({
        data: {
          title: 'TEST-REC-FILTER',
          content: 'desc',
          jobType: 'FULL_TIME',
          minSalary: 1000,
          maxSalary: 2000,
          experience: 2,
          deadline: new Date(Date.now() + 1000000),
          company: { connect: { id: company.id } },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      const filter: RecruitmentFilter = { title: 'TEST-REC-FILTER', jobType: 'FULL_TIME', companyId: company.id, minSalary: 1000, maxSalary: 2000, experience: 2, limit: 10, offset: 0, sort: [] };
      const result = await recruitmentService.findAll(filter, user);
      expect(result.data.some(r => r.title === 'TEST-REC-FILTER')).toBe(true);
    });
    /**
     * #### TC-RS-024: No Matching Recruitments
     * - **Goal:** Should return empty array if no recruitments match filter
     * - **Input:**
     *   Filter with no matches
     * - **Expected Output:**
     *   - Empty array
     */
    it('TC-RS-024: No Matching Recruitments', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      const filter: RecruitmentFilter = { title: 'NO-MATCH', jobType: 'FULL_TIME', companyId: company.id, minSalary: 1000, maxSalary: 2000, experience: 2, limit: 10, offset: 0, sort: [] };
      const result = await recruitmentService.findAll(filter, user);
      expect(result.data).toEqual([]);
    });
    /**
     * #### TC-RS-025: Special/Unicode Characters in Filter
     * - **Goal:** Should handle filter with special/unicode characters
     * - **Input:**
     *   Filter with special/unicode title
     * - **Expected Output:**
     *   - Empty array
     */
    it('TC-RS-025: Special/Unicode Characters in Filter', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      const filter: RecruitmentFilter = { title: '公司-测试-🚀', jobType: 'FULL_TIME', companyId: company.id, minSalary: 1000, maxSalary: 2000, experience: 2, limit: 10, offset: 0, sort: [] };
      const result = await recruitmentService.findAll(filter, user);
      expect(result.data).toEqual([]);
    });
    /**
     * #### TC-RS-026: Extremely Large Offset/Limit
     * - **Goal:** Should handle extremely large offset/limit
     * - **Input:**
     *   Filter with large offset/limit
     * - **Expected Output:**
     *   - Returns correct offset/limit
     */
    it('TC-RS-026: Extremely Large Offset/Limit', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      const filter: RecruitmentFilter = { title: '', jobType: undefined, companyId: company.id, minSalary: 0, maxSalary: 0, experience: 0, limit: 1e6, offset: 1e6, sort: [] };
      const result = await recruitmentService.findAll(filter, user);
      expect(result.offset).toBe(1e6);
      expect(result.limit).toBe(1e6);
    });
    /**
     * #### TC-RS-027: Negative minSalary/maxSalary/experience
     * - **Goal:** Should handle negative minSalary/maxSalary/experience
     * - **Input:**
     *   Filter with negative values
     * - **Expected Output:**
     *   - Empty array
     */
    it('TC-RS-027: Negative minSalary/maxSalary/experience', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      const filter: RecruitmentFilter = { title: '', jobType: undefined, companyId: company.id, minSalary: -100, maxSalary: -200, experience: -1, limit: 10, offset: 0, sort: [] };
      const result = await recruitmentService.findAll(filter, user);
      expect(result.data).toEqual([]);
    });
    /**
     * #### TC-RS-028: minSalary Greater Than maxSalary
     * - **Goal:** Should handle minSalary > maxSalary
     * - **Input:**
     *   Filter with minSalary > maxSalary
     * - **Expected Output:**
     *   - Empty array
     */
    it('TC-RS-028: minSalary Greater Than maxSalary', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      const filter: RecruitmentFilter = { title: '', jobType: undefined, companyId: company.id, minSalary: 2000, maxSalary: 1000, experience: 2, limit: 10, offset: 0, sort: [] };
      const result = await recruitmentService.findAll(filter, user);
      expect(result.data).toEqual([]);
    });
    /**
     * #### TC-RS-029: Deadline in the Past
     * - **Goal:** Should handle deadline in the past (should not return future jobs)
     * - **Input:**
     *   Filter with past deadline
     * - **Expected Output:**
     *   - Empty array
     */
    it('TC-RS-029: Deadline in the Past', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      await prismaService.recruitment.create({
        data: {
          title: 'TEST-REC-PAST-DEADLINE',
          content: 'desc',
          jobType: 'FULL_TIME',
          minSalary: 1000,
          maxSalary: 2000,
          experience: 2,
          deadline: new Date(Date.now() - 1000000),
          company: { connect: { id: company.id } },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      const filter: RecruitmentFilter = { title: 'TEST-REC-PAST-DEADLINE', jobType: 'FULL_TIME', companyId: company.id, minSalary: 1000, maxSalary: 2000, experience: 2, limit: 10, offset: 0, sort: [] };
      const result = await recruitmentService.findAll(filter, user);
      expect(result.data).toEqual([]);
    });
    /**
     * #### TC-RS-030: Invalid JobType
     * - **Goal:** Should handle invalid jobType
     * - **Input:**
     *   Filter with invalid jobType
     * - **Expected Output:**
     *   - Empty array
     */
    it('TC-RS-030: Invalid JobType', async () => {
      const company = await createTestCompany();
      const user = await createTestUser(company.id, Role.COMPANY_ADMIN);
      const filter: RecruitmentFilter = { title: '', jobType: 'INVALID_JOBTYPE' as any, companyId: company.id, minSalary: 1000, maxSalary: 2000, experience: 2, limit: 10, offset: 0, sort: [] };
      const result = await recruitmentService.findAll(filter as any, user);
      expect(result.data).toEqual([]);
    });
  });

  // ### Test Case Set 5: Find Recruitment by ID
  describe('findById', () => {
    /**
     * #### TC-RS-031: Valid ID (Happy Path)
     * - **Goal:** Should return recruitment for valid ID
     * - **Input:**
     *   Valid recruitment ID
     * - **Expected Output:**
     *   - Recruitment is returned
     */
    it('TC-RS-031: Valid ID (Happy Path)', async () => {
      const company = await createTestCompany();
      const recruitment = await prismaService.recruitment.create({
        data: {
          title: 'TEST-REC-BYID',
          content: 'desc',
          jobType: 'FULL_TIME',
          minSalary: 1000,
          maxSalary: 2000,
          experience: 2,
          deadline: new Date(Date.now() + 1000000),
          company: { connect: { id: company.id } },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      });
      const result = await recruitmentService.findById(recruitment.id);
      expect(result).toMatchObject({ id: recruitment.id, title: 'TEST-REC-BYID' });
    });
    /**
     * #### TC-RS-032: Non-existent ID
     * - **Goal:** Should throw NotFoundException for non-existent ID
     * - **Input:**
     *   Non-existent recruitment ID
     * - **Expected Output:**
     *   - NotFoundException is thrown
     */
    it('TC-RS-032: Non-existent ID', async () => {
      await expect(recruitmentService.findById(99999)).rejects.toThrow(NotFoundException);
    });
    /**
     * #### TC-RS-033: Negative ID
     * - **Goal:** Should throw NotFoundException for negative ID
     * - **Input:**
     *   Negative recruitment ID
     * - **Expected Output:**
     *   - NotFoundException is thrown
     */
    it('TC-RS-033: Negative ID', async () => {
      await expect(recruitmentService.findById(-1)).rejects.toThrow(NotFoundException);
    });
    /**
     * #### TC-RS-034: Zero ID
     * - **Goal:** Should throw NotFoundException for zero ID
     * - **Input:**
     *   Zero as recruitment ID
     * - **Expected Output:**
     *   - NotFoundException is thrown
     */
    it('TC-RS-034: Zero ID', async () => {
      await expect(recruitmentService.findById(0)).rejects.toThrow(NotFoundException);
    });
    /**
     * #### TC-RS-035: ID is a String
     * - **Goal:** Should throw error if ID is a string
     * - **Input:**
     *   String as recruitment ID
     * - **Expected Output:**
     *   - Error is thrown
     */
    it('TC-RS-035: ID is a String', async () => {
      await expect(recruitmentService.findById('not-a-number' as any)).rejects.toThrow();
    });
    /**
     * #### TC-RS-036: ID is Null
     * - **Goal:** Should throw error if ID is null
     * - **Input:**
     *   Null as recruitment ID
     * - **Expected Output:**
     *   - Error is thrown
     */
    it('TC-RS-036: ID is Null', async () => {
      await expect(recruitmentService.findById(null as any)).rejects.toThrow();
    });
    /**
     * #### TC-RS-037: ID is Undefined
     * - **Goal:** Should throw error if ID is undefined
     * - **Input:**
     *   Undefined as recruitment ID
     * - **Expected Output:**
     *   - Error is thrown
     */
    it('TC-RS-037: ID is Undefined', async () => {
      await expect(recruitmentService.findById(undefined as any)).rejects.toThrow();
    });
  });
}); 