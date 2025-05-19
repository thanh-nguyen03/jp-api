import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CompanyServiceImpl } from './company.service';
import { UserServiceImpl } from '../user/user.service';
import { INestApplication } from '@nestjs/common';
import { BadRequestException, NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Role, Prisma, User } from '@prisma/client';
import { Message } from '../../constants/message';
import { CompanyFilter } from './dtos/company-filter.query';
import * as bcrypt from 'bcrypt';
import { CreateCompanyDto } from './dtos/create-company.dto';
import { CompanyDto } from './dtos/company.dto';
import { UserService } from '../user/user.service';

// Creating a subset of CreateCompanyDto with just the fields we need for testing
interface TestCreateCompanyDto {
  code: string;
  name: string;
  description: string;
  address: string;
  companyAccountEmail: string;
  companyAccountFirstName: string;
  companyAccountLastName: string;
  companyAccountPassword: string;
}

// Extended company interface to match what's returned by the service
interface CompanyWithRecruitments extends CompanyDto {
  recruitments: any[];
}

describe('CompanyServiceImpl Integration Tests', () => {
  let app: INestApplication;
  let companyService: CompanyServiceImpl;
  let userService: UserServiceImpl;
  let prismaService: PrismaService;

  // Setup testing module before all tests
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyServiceImpl,
        PrismaService,
        { provide: UserService, useClass: UserServiceImpl },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    companyService = module.get<CompanyServiceImpl>(CompanyServiceImpl);
    userService = module.get<UserService>(UserService) as UserServiceImpl;
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // Clean up before each test to remove potential residual data
  beforeEach(async () => {
    // Clean up test companies
    await prismaService.recruitment.deleteMany({
      where: {
        company: {
          OR: [
            { code: { contains: 'TEST-' } },
            { code: { contains: 'OTHER-' } },
            { code: '' }
          ]
        }
      }
    });
    
    await prismaService.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-' } },
          { company: { OR: [
            { code: { contains: 'TEST-' } },
            { code: { contains: 'OTHER-' } },
            { code: '' }
          ] } }
        ]
      }
    });
    
    await prismaService.company.deleteMany({
      where: {
        OR: [
          { code: { contains: 'TEST-' } },
          { code: { contains: 'OTHER-' } },
          { code: '' }
        ]
      }
    });
  });

  // Clean up after each test to prevent data pollution
  afterEach(async () => {
    // Clean up test companies
    await prismaService.recruitment.deleteMany({
      where: {
        company: {
          OR: [
            { code: { contains: 'TEST-' } },
            { code: { contains: 'OTHER-' } },
            { code: '' }
          ]
        }
      }
    });
    
    await prismaService.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-' } },
          { company: { OR: [
            { code: { contains: 'TEST-' } },
            { code: { contains: 'OTHER-' } },
            { code: '' }
          ] } }
        ]
      }
    });
    
    await prismaService.company.deleteMany({
      where: {
        OR: [
          { code: { contains: 'TEST-' } },
          { code: { contains: 'OTHER-' } },
          { code: '' }
        ]
      }
    });
  });

  // Close database connection after all tests
  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  // Helper functions to create test data
  const createTestCompany = async (code: string, name: string) => {
    return prismaService.company.create({
      data: {
        code,
        name,
        description: 'Test company description',
        address: 'Test address'
      }
    });
  };

  const createTestUser = async (
    email: string,
    firstName: string,
    lastName: string,
    role: Role,
    companyId?: number
  ) => {
    const userData = {
      email,
      firstName,
      lastName,
      password: await bcrypt.hash('password123', 12),
      role,
      displayName: `${firstName} ${lastName}`,
      avatar: null,
      companyId
    };
    
    return prismaService.user.create({ data: userData });
  };
  
  // Test suite for createCompany method
  describe('createCompany', () => {
    // Test Case 1.1: Successfully create a company
    it('TC-CS-001: should create a company and company admin account successfully', async () => {
      /**
       * Test Case ID: TC-CS-001
       * Objective: Verify that createCompany creates a company and company admin account
       * Input: Valid CreateCompanyDto
       * Expected Output: Company with connected admin user
       * White-Box: Tests the path where no existing company with the same code is found
       */
      
      // Arrange
      const timestamp = Date.now();
      const createCompanyDto: TestCreateCompanyDto = {
        code: `TEST-CODE-${timestamp}`,
        name: `Test Company ${timestamp}`,
        description: 'Test company description',
        address: 'Test company address',
        companyAccountEmail: `test-admin-${timestamp}@example.com`,
        companyAccountFirstName: 'Admin',
        companyAccountLastName: 'User',
        companyAccountPassword: 'password123'
      };
      
      // Act
      const result = await companyService.createCompany(createCompanyDto as unknown as CreateCompanyDto);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.code).toBe(createCompanyDto.code);
      expect(result.name).toBe(createCompanyDto.name);
      expect(result.description).toBe(createCompanyDto.description);
      expect(result.address).toBe(createCompanyDto.address);
      
      // Verify the admin user was created
      const adminUser = await prismaService.user.findFirst({
        where: { 
          email: createCompanyDto.companyAccountEmail,
          companyId: result.id 
        }
      });
      
      expect(adminUser).toBeDefined();
      expect(adminUser.role).toBe(Role.COMPANY_ADMIN);
      expect(adminUser.firstName).toBe(createCompanyDto.companyAccountFirstName);
      expect(adminUser.lastName).toBe(createCompanyDto.companyAccountLastName);
    });
    
    // Test Case 1.2: Duplicate company code
    it('TC-CS-002: should throw BadRequestException when company code already exists', async () => {
      /**
       * Test Case ID: TC-CS-002
       * Objective: Verify that createCompany throws BadRequestException when company code already exists
       * Input: CreateCompanyDto with an existing company code
       * Expected Output: BadRequestException with Message.COMPANY_CODE_ALREADY_EXISTS
       * White-Box: Tests the path where an existing company with the same code is found
       */
      
      // Arrange
      const existingCode = `TEST-CODE-${Date.now()}`;
      
      // Create a company first
      await createTestCompany(existingCode, 'Existing Company');
      
      const createCompanyDto: TestCreateCompanyDto = {
        code: existingCode, // Using the same code
        name: 'Another Company',
        description: 'Another company description',
        address: 'Another company address',
        companyAccountEmail: `test-admin-${Date.now()}@example.com`,
        companyAccountFirstName: 'Admin',
        companyAccountLastName: 'User',
        companyAccountPassword: 'password123'
      };
      
      // Act & Assert
      await expect(
        companyService.createCompany(createCompanyDto as unknown as CreateCompanyDto)
      ).rejects.toThrow(
        new BadRequestException(Message.COMPANY_CODE_ALREADY_EXISTS(existingCode))
      );
    });
    
    // Test Case 1.3: Invalid company data
    it('TC-CS-003: should throw error for invalid company data', async () => {
      /**
       * Test Case ID: TC-CS-003
       * Objective: Verify that createCompany validates company data
       * Input: CreateCompanyDto with invalid data (empty code)
       * Expected Output: Error due to validation failure
       * White-Box: Tests the validation path
       */
      
      // Arrange
      const createCompanyDto = {
        code: '', // Empty code should fail validation
        name: 'Test Company',
        description: 'Test company description',
        address: 'Test company address',
        companyAccountEmail: `test-admin-${Date.now()}@example.com`,
        companyAccountFirstName: 'Admin',
        companyAccountLastName: 'User',
        companyAccountPassword: 'password123'
      } as CreateCompanyDto;
      
      // Act & Assert
      await expect(companyService.createCompany(createCompanyDto)).rejects.toThrow();
    });
    
    // Test Case 1.4: Invalid company account data
    it('TC-CS-004: should throw error for invalid company account data', async () => {
      /**
       * Test Case ID: TC-CS-004
       * Objective: Verify that createCompany validates company account data
       * Input: CreateCompanyDto with invalid account data (empty email)
       * Expected Output: Error from user service
       * White-Box: Tests handling of errors from userService.createCompanyAdminAccount
       */
      
      // Arrange
      const createCompanyDto = {
        code: `TEST-CODE-${Date.now()}`,
        name: 'Test Company',
        description: 'Test company description',
        address: 'Test company address',
        companyAccountEmail: '', // Empty email should fail validation
        companyAccountFirstName: 'Admin',
        companyAccountLastName: 'User',
        companyAccountPassword: 'password123'
      } as CreateCompanyDto;
      
      // Act & Assert
      await expect(companyService.createCompany(createCompanyDto)).rejects.toThrow();
    });

    // Edge: All string fields empty or whitespace
    it('TC-CS-005: should throw error when all string fields are empty or whitespace', async () => {
      const createCompanyDto = {
        code: '   ',
        name: '',
        description: '',
        address: '',
        companyAccountEmail: '',
        companyAccountFirstName: '',
        companyAccountLastName: '',
        companyAccountPassword: ''
      } as CreateCompanyDto;
      await expect(companyService.createCompany(createCompanyDto)).rejects.toThrow();
    });

    // Edge: Duplicate email for company admin
    it('TC-CS-006: should throw error when company admin email already exists', async () => {
      const timestamp = Date.now();
      const code = `TEST-CODE-${timestamp}`;
      const email = `test-admin-${timestamp}@example.com`;
      await createTestCompany(code, 'Company');
      await createTestUser(email, 'Admin', 'User', Role.COMPANY_ADMIN);
      const createCompanyDto = {
        code: `TEST-CODE-NEW-${timestamp}`,
        name: 'New Company',
        description: 'desc',
        address: 'addr',
        companyAccountEmail: email,
        companyAccountFirstName: 'Admin',
        companyAccountLastName: 'User',
        companyAccountPassword: 'password123'
      } as CreateCompanyDto;
      await expect(companyService.createCompany(createCompanyDto)).rejects.toThrow();
    });

    // Edge: Very long company name/description/address
    it('TC-CS-007: should throw error for very long company name/description/address', async () => {
      const createCompanyDto = {
        code: `TEST-CODE-${Date.now()}`,
        name: 'A'.repeat(1000),
        description: 'B'.repeat(2000),
        address: 'C'.repeat(1000),
        companyAccountEmail: `test-admin-${Date.now()}@example.com`,
        companyAccountFirstName: 'Admin',
        companyAccountLastName: 'User',
        companyAccountPassword: 'password123'
      } as CreateCompanyDto;
      await expect(companyService.createCompany(createCompanyDto)).rejects.toThrow();
    });
  });
  
  // Test suite for findAll method
  describe('findAll', () => {
    // Test Case 2.1: Find companies with code filter
    it('TC-CS-008: should return companies matching the code filter', async () => {
      /**
       * Test Case ID: TC-CS-008
       * Objective: Verify that findAll returns companies matching the provided code filter
       * Input: CompanyFilter { code: 'TEST-CODE' }
       * Expected Output: PageResultDto with companies matching filter
       * White-Box: Tests path filtering by code
       */
      
      // Arrange
      const timestamp = Date.now();
      const codePrefix = 'TEST-CODE';
      const targetCode = `${codePrefix}-${timestamp}`;
      
      // Create test companies
      await createTestCompany(targetCode, `Company ${timestamp}`);
      await createTestCompany(`OTHER-${timestamp}`, `Other Company ${timestamp}`);
      
      const filter: CompanyFilter = {
        code: codePrefix,
        name: '',
        offset: 0,
        limit: 10,
        sort: []
      };
      
      // Act
      const result = await companyService.findAll(filter);
      
      // Assert
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.data.some(company => company.code === targetCode)).toBe(true);
      expect(result.data.every(company => company.code.includes(codePrefix))).toBe(true);
    });
    
    // Test Case 2.2: Find companies with name filter
    it('TC-CS-009: should return companies matching the name filter', async () => {
      /**
       * Test Case ID: TC-CS-009
       * Objective: Verify that findAll returns companies matching the provided name filter
       * Input: CompanyFilter { name: 'Target' }
       * Expected Output: PageResultDto with companies matching filter
       * White-Box: Tests path filtering by name
       */
      
      // Arrange
      const timestamp = Date.now();
      const namePrefix = 'Target';
      const targetName = `${namePrefix} Company ${timestamp}`;
      
      // Create test companies
      await createTestCompany(`TEST-CODE-${timestamp}`, targetName);
      await createTestCompany(`TEST-OTHER-${timestamp}`, `Other Company ${timestamp}`);
      
      const filter: CompanyFilter = {
        code: '',
        name: namePrefix,
        offset: 0,
        limit: 10,
        sort: []
      };
      
      // Act
      const result = await companyService.findAll(filter);
      
      // Assert
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.data.some(company => company.name === targetName)).toBe(true);
      expect(result.data.every(company => company.name.includes(namePrefix))).toBe(true);
    });
    
    // Test Case 2.3: Find companies with pagination
    it('TC-CS-010: should return paginated results', async () => {
      /**
       * Test Case ID: TC-CS-010
       * Objective: Verify that findAll correctly paginates results
       * Input: CompanyFilter with offset and limit
       * Expected Output: PageResultDto with correctly paginated data
       * White-Box: Tests pagination logic
       */
      
      // Arrange
      const timestamp = Date.now();
      const codePrefix = 'TEST-PAGINATION';
      
      // Create 3 test companies
      await createTestCompany(`${codePrefix}-1-${timestamp}`, `Company 1 ${timestamp}`);
      await createTestCompany(`${codePrefix}-2-${timestamp}`, `Company 2 ${timestamp}`);
      await createTestCompany(`${codePrefix}-3-${timestamp}`, `Company 3 ${timestamp}`);
      
      const filter: CompanyFilter = {
        code: codePrefix,
        name: '',
        offset: 1, // Skip the first result
        limit: 1,  // Only get one result
        sort: []
      };
      
      // Act
      const result = await companyService.findAll(filter);
      
      // Assert
      expect(result.total).toBeGreaterThanOrEqual(3); // Total count should include all matching companies
      expect(result.data.length).toBe(1); // But data should only include the requested page
      expect(result.offset).toBe(1);
      expect(result.limit).toBe(1);
    });
    
    // Test Case 2.4: Find companies with sorting
    it('TC-CS-011: should return sorted results', async () => {
      /**
       * Test Case ID: TC-CS-011
       * Objective: Verify that findAll correctly sorts results
       * Input: CompanyFilter with sort parameter
       * Expected Output: PageResultDto with correctly sorted data
       * White-Box: Tests sorting logic
       */
      
      // Arrange
      const timestamp = Date.now();
      const codePrefix = 'TEST-SORTING';
      
      // Create test companies with alphabetical names
      await createTestCompany(`${codePrefix}-C-${timestamp}`, `C Company ${timestamp}`);
      await createTestCompany(`${codePrefix}-A-${timestamp}`, `A Company ${timestamp}`);
      await createTestCompany(`${codePrefix}-B-${timestamp}`, `B Company ${timestamp}`);
      
      const filter: CompanyFilter = {
        code: codePrefix,
        name: '',
        offset: 0,
        limit: 10,
        sort: [{ field: 'name', direction: 'asc' }]
      };
      
      // Act
      const result = await companyService.findAll(filter);
      
      // Assert
      expect(result.total).toBeGreaterThanOrEqual(3);
      
      // Check if the results are sorted by name in ascending order
      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i-1].name <= result.data[i].name).toBe(true);
      }
    });
    
    // Test Case 2.5: Empty result
    it('TC-CS-012: should return empty array when no companies match the filter', async () => {
      /**
       * Test Case ID: TC-CS-012
       * Objective: Verify that findAll returns empty array when no companies match
       * Input: CompanyFilter with non-matching criteria
       * Expected Output: PageResultDto with empty data array
       * White-Box: Tests empty results path
       */
      
      // Arrange
      const nonExistentCode = 'NON-EXISTENT-CODE';
      
      const filter: CompanyFilter = {
        code: nonExistentCode,
        name: '',
        offset: 0,
        limit: 10,
        sort: []
      };
      
      // Act
      const result = await companyService.findAll(filter);
      
      // Assert
      expect(result.total).toBe(0);
      expect(result.data).toEqual([]);
    });

    // Edge: Filter with special characters
    it('TC-CS-013: should handle filter with special characters', async () => {
      const filter: CompanyFilter = {
        code: "; DROP TABLE companies;--",
        name: '',
        offset: 0,
        limit: 10,
        sort: []
      };
      const result = await companyService.findAll(filter);
      expect(result).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    // Edge: Filter with extremely large offset/limit
    it('TC-CS-014: should handle filter with extremely large offset/limit', async () => {
      const filter: CompanyFilter = {
        code: '',
        name: '',
        offset: 1e6,
        limit: 1e6,
        sort: []
      };
      const result = await companyService.findAll(filter);
      expect(result).toBeDefined();
      expect(result.offset).toBe(1e6);
      expect(result.limit).toBe(1e6);
    });
  });
  
  // Test suite for findById method
  describe('findById', () => {
    // Test Case 3.1: Successfully find company by ID
    it('TC-CS-015: should return a company when valid ID is provided', async () => {
      /**
       * Test Case ID: TC-CS-015
       * Objective: Verify that findById returns a company when a valid ID is provided
       * Input: Valid company ID
       * Expected Output: Company with matching ID
       * White-Box: Tests path where company is found
       */
      
      // Arrange
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-ID-${timestamp}`, `ID Company ${timestamp}`);
      
      // Act
      const result = await companyService.findById(company.id) as CompanyWithRecruitments;
      
      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(company.id);
      expect(result.code).toBe(company.code);
      expect(result.name).toBe(company.name);
      expect(result.recruitments).toBeDefined(); // Check that recruitments are included
    });
    
    // Test Case 3.2: Company not found
    it('TC-CS-016: should throw NotFoundException when company with ID does not exist', async () => {
      /**
       * Test Case ID: TC-CS-016
       * Objective: Verify that findById throws NotFoundException when company with ID does not exist
       * Input: Non-existent company ID
       * Expected Output: NotFoundException with Message.COMPANY_NOT_FOUND
       * White-Box: Tests path where company is not found
       */
      
      // Arrange
      const nonExistentId = 99999;
      
      // Act & Assert
      await expect(companyService.findById(nonExistentId)).rejects.toThrow(
        new NotFoundException(Message.COMPANY_NOT_FOUND)
      );
    });

    // Edge: ID is 0
    it('TC-CS-017: should throw NotFoundException for ID = 0', async () => {
      await expect(companyService.findById(0)).rejects.toThrow();
    });
    // Edge: ID is negative
    it('TC-CS-018: should throw NotFoundException for negative ID', async () => {
      await expect(companyService.findById(-1)).rejects.toThrow();
    });
    // Edge: ID is very large
    it('TC-CS-019: should throw NotFoundException for very large ID', async () => {
      await expect(companyService.findById(Number.MAX_SAFE_INTEGER)).rejects.toThrow();
    });
  });
  
  // Test suite for findByCode method
  describe('findByCode', () => {
    // Test Case 4.1: Successfully find company by code
    it('TC-CS-020: should return a company when valid code is provided', async () => {
      /**
       * Test Case ID: TC-CS-020
       * Objective: Verify that findByCode returns a company when a valid code is provided
       * Input: Valid company code
       * Expected Output: Company with matching code
       * White-Box: Tests path where company is found
       */
      
      // Arrange
      const timestamp = Date.now();
      const code = `TEST-CODE-${timestamp}`;
      const company = await createTestCompany(code, `Code Company ${timestamp}`);
      
      // Act
      const result = await companyService.findByCode(code) as CompanyWithRecruitments;
      
      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(company.id);
      expect(result.code).toBe(code);
      expect(result.name).toBe(company.name);
      expect(result.recruitments).toBeDefined(); // Check that recruitments are included
    });
    
    // Test Case 4.2: Company not found
    it('TC-CS-021: should throw NotFoundException when company with code does not exist', async () => {
      /**
       * Test Case ID: TC-CS-021
       * Objective: Verify that findByCode throws NotFoundException when company with code does not exist
       * Input: Non-existent company code
       * Expected Output: NotFoundException with Message.COMPANY_CODE_NOT_FOUND
       * White-Box: Tests path where company is not found
       */
      
      // Arrange
      const nonExistentCode = 'NON-EXISTENT-CODE';
      
      // Act & Assert
      await expect(companyService.findByCode(nonExistentCode)).rejects.toThrow(
        new NotFoundException(Message.COMPANY_CODE_NOT_FOUND(nonExistentCode))
      );
    });

    // Edge: Code is whitespace only
    it('TC-CS-022: should throw NotFoundException for whitespace-only code', async () => {
      await expect(companyService.findByCode('   ')).rejects.toThrow();
    });
    // Edge: Code is very long
    it('TC-CS-023: should throw NotFoundException for very long code', async () => {
      await expect(companyService.findByCode('A'.repeat(1000))).rejects.toThrow();
    });
    // Edge: Code with special/unicode characters
    it('TC-CS-024: should throw NotFoundException for code with special/unicode characters', async () => {
      await expect(companyService.findByCode('公司-测试-🚀')).rejects.toThrow();
    });
  });
  
  // Test suite for updateCompany method
  describe('updateCompany', () => {
    // Test Case 5.1: Successfully update company
    it('TC-CS-025: should update and return the company when valid data is provided', async () => {
      /**
       * Test Case ID: TC-CS-025
       * Objective: Verify that updateCompany updates a company when valid data is provided
       * Input: Valid company ID and updated company data
       * Expected Output: Updated company
       * White-Box: Tests path where company is found and updated
       */
      
      // Arrange
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-UPDATE-${timestamp}`, `Update Company ${timestamp}`);
      
      const updateData: Partial<CompanyDto> = {
        name: `Updated Company ${timestamp}`,
        description: 'Updated description',
        address: 'Updated address'
      };
      
      // Act
      const result = await companyService.updateCompany(company.id, {
        ...company,
        ...updateData
      });
      
      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(company.id);
      expect(result.code).toBe(company.code); // Code should remain unchanged
      expect(result.name).toBe(updateData.name);
      expect(result.description).toBe(updateData.description);
      expect(result.address).toBe(updateData.address);
      
      // Verify database state
      const updatedCompany = await prismaService.company.findUnique({
        where: { id: company.id }
      });
      
      expect(updatedCompany).toBeDefined();
      expect(updatedCompany?.name).toBe(updateData.name);
      expect(updatedCompany?.description).toBe(updateData.description);
      expect(updatedCompany?.address).toBe(updateData.address);
    });
    
    // Test Case 5.2: Company not found
    it('TC-CS-026: should throw NotFoundException when company with ID does not exist', async () => {
      /**
       * Test Case ID: TC-CS-026
       * Objective: Verify that updateCompany throws NotFoundException when company with ID does not exist
       * Input: Non-existent company ID and valid company data
       * Expected Output: NotFoundException with Message.COMPANY_NOT_FOUND
       * White-Box: Tests path where company is not found
       */
      
      // Arrange
      const nonExistentId = 99999;
      const updateData: Partial<CompanyDto> = {
        name: 'Updated Company',
        description: 'Updated description',
        address: 'Updated address',
        code: 'TEST-CODE'
      };
      
      // Act & Assert
      await expect(companyService.updateCompany(nonExistentId, updateData as CompanyDto)).rejects.toThrow(
        new NotFoundException(Message.COMPANY_NOT_FOUND)
      );
    });

    // Edge: Update with no changes
    it('TC-CS-027: should update company with no changes', async () => {
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-UNCHANGED-${timestamp}`, `Unchanged Company ${timestamp}`);
      const result = await companyService.updateCompany(company.id, company as any);
      expect(result).toBeDefined();
      expect(result.id).toBe(company.id);
    });
    // Edge: Update with only one field changed
    it('TC-CS-028: should update company with only one field changed', async () => {
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-ONEFIELD-${timestamp}`, `OneField Company ${timestamp}`);
      const updateData = { ...company, name: 'Changed Name' };
      const result = await companyService.updateCompany(company.id, updateData as any);
      expect(result).toBeDefined();
      expect(result.name).toBe('Changed Name');
    });
    // Edge: Update with invalid data
    it('TC-CS-029: should throw error for update with invalid data', async () => {
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-INVALID-${timestamp}`, `Invalid Company ${timestamp}`);
      const updateData = { ...company, name: '' };
      await expect(companyService.updateCompany(company.id, updateData as any)).rejects.toThrow();
    });
    // Edge: Update with extremely long values
    it('TC-CS-030: should throw error for update with extremely long values', async () => {
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-LONG-${timestamp}`, `Long Company ${timestamp}`);
      const updateData = { ...company, name: 'A'.repeat(1000) };
      await expect(companyService.updateCompany(company.id, updateData as any)).rejects.toThrow();
    });
  });
  
  // Test suite for deleteCompany method
  describe('deleteCompany', () => {
    // Test Case 6.1: Successfully delete company
    it('TC-CS-031: should delete the company and its associated users when valid ID is provided', async () => {
      /**
       * Test Case ID: TC-CS-031
       * Objective: Verify that deleteCompany deletes a company and its users when valid ID is provided
       * Input: Valid company ID
       * Expected Output: Company and associated users are deleted
       * White-Box: Tests path where company is found and deleted
       */
      
      // Arrange
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-DELETE-${timestamp}`, `Delete Company ${timestamp}`);
      
      // Create a company user
      await createTestUser(
        `test-user-${timestamp}@example.com`,
        'Test',
        'User',
        Role.COMPANY_ADMIN,
        company.id
      );
      
      // Act
      await companyService.deleteCompany(company.id);
      
      // Assert - Company should be deleted
      const deletedCompany = await prismaService.company.findUnique({
        where: { id: company.id }
      });
      expect(deletedCompany).toBeNull();
      
      // Associated users should be deleted
      const users = await prismaService.user.findMany({
        where: { companyId: company.id }
      });
      expect(users).toHaveLength(0);
    });
    
    // Test Case 6.2: Company not found
    it('TC-CS-032: should throw NotFoundException when company with ID does not exist', async () => {
      /**
       * Test Case ID: TC-CS-032
       * Objective: Verify that deleteCompany throws NotFoundException when company with ID does not exist
       * Input: Non-existent company ID
       * Expected Output: NotFoundException with Message.COMPANY_NOT_FOUND
       * White-Box: Tests path where company is not found
       */
      
      // Arrange
      const nonExistentId = 99999;
      
      // Act & Assert
      await expect(companyService.deleteCompany(nonExistentId)).rejects.toThrow(
        new NotFoundException(Message.COMPANY_NOT_FOUND)
      );
    });

    // Edge: Delete company twice
    it('TC-CS-033: should throw NotFoundException when deleting company twice', async () => {
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-DELETE-TWICE-${timestamp}`, `DeleteTwice Company ${timestamp}`);
      await companyService.deleteCompany(company.id);
      await expect(companyService.deleteCompany(company.id)).rejects.toThrow();
    });
  });
  
  // Test suite for createCompanyHR method
  describe('createCompanyHR', () => {
    // Test Case 7.1: Successfully create company HR
    it('TC-CS-034: should create company HR users when called by company admin', async () => {
      /**
       * Test Case ID: TC-CS-034
       * Objective: Verify that createCompanyHR creates company HR users when called by company admin
       * Input: Array of user data and company admin user
       * Expected Output: Array of created company HR users
       * White-Box: Tests path where user is company admin and HR users are created
       */
      
      // Arrange
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-HR-${timestamp}`, `HR Company ${timestamp}`);
      
      // Create company admin
      const admin = await createTestUser(
        `test-admin-${timestamp}@example.com`,
        'Admin',
        'User',
        Role.COMPANY_ADMIN,
        company.id
      );
      
      const hrData = [
        {
          email: `test-hr1-${timestamp}@example.com`,
          firstName: 'HR',
          lastName: 'One',
          password: 'password123',
        },
        {
          email: `test-hr2-${timestamp}@example.com`,
          firstName: 'HR',
          lastName: 'Two',
          password: 'password123',
        }
      ];
      
      // Act
      const result = await companyService.createCompanyHR(
        hrData as unknown as Prisma.UserCreateInput[],
        admin as User
      );
      
      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].email).toBe(hrData[0].email);
      expect(result[0].firstName).toBe(hrData[0].firstName);
      expect(result[0].role).toBe('COMPANY_HR');
      expect(result[0].companyId).toBe(company.id);
      
      expect(result[1].email).toBe(hrData[1].email);
      expect(result[1].firstName).toBe(hrData[1].firstName);
      expect(result[1].role).toBe('COMPANY_HR');
      expect(result[1].companyId).toBe(company.id);
      
      // Verify database state
      const dbUsers = await prismaService.user.findMany({
        where: {
          email: { in: [hrData[0].email, hrData[1].email] }
        }
      });
      
      expect(dbUsers).toHaveLength(2);
      expect(dbUsers[0].role).toBe('COMPANY_HR');
      expect(dbUsers[1].role).toBe('COMPANY_HR');
    });
    
    // Test Case 7.2: Non-company admin
    it('TC-CS-035: should throw ForbiddenException when user is not company admin', async () => {
      /**
       * Test Case ID: TC-CS-035
       * Objective: Verify that createCompanyHR throws ForbiddenException when user is not company admin
       * Input: Array of user data and non-company admin user
       * Expected Output: ForbiddenException
       * White-Box: Tests path where user is not company admin
       */
      
      // Arrange
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-HR-${timestamp}`, `HR Company ${timestamp}`);
      
      // Create regular user
      const regularUser = await createTestUser(
        `test-user-${timestamp}@example.com`,
        'Regular',
        'User',
        Role.USER,
        company.id
      );
      
      const hrData = [
        {
          email: `test-hr-${timestamp}@example.com`,
          firstName: 'HR',
          lastName: 'User',
          password: 'password123',
        }
      ];
      
      // Act & Assert
      await expect(
        companyService.createCompanyHR(
          hrData as unknown as Prisma.UserCreateInput[],
          regularUser as User
        )
      ).rejects.toThrow(ForbiddenException);
    });
    
    // Test Case 7.3: Non-existent user
    it('TC-CS-036: should throw UnauthorizedException when user does not exist', async () => {
      /**
       * Test Case ID: TC-CS-036
       * Objective: Verify that createCompanyHR throws UnauthorizedException when user does not exist
       * Input: Array of user data and non-existent user
       * Expected Output: UnauthorizedException
       * White-Box: Tests path where user does not exist
       */
      
      // Arrange
      const nonExistentUser = {
        id: 99999,
        email: 'nonexistent@example.com',
        firstName: 'Non',
        lastName: 'Existent',
        password: 'hashed',
        role: Role.COMPANY_ADMIN,
        displayName: 'Non Existent',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        companyId: 1
      } as User;
      
      const hrData = [
        {
          email: `test-hr-${Date.now()}@example.com`,
          firstName: 'HR',
          lastName: 'User',
          password: 'password123',
        }
      ];
      
      // Act & Assert
      await expect(
        companyService.createCompanyHR(
          hrData as unknown as Prisma.UserCreateInput[],
          nonExistentUser
        )
      ).rejects.toThrow(UnauthorizedException);
    });

    // Edge: HR data array is empty
    it('TC-CS-037: should throw error when HR data array is empty', async () => {
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-HR-EMPTY-${timestamp}`, `HR Empty Company ${timestamp}`);
      const admin = await createTestUser(`test-admin-empty-${timestamp}@example.com`, 'Admin', 'User', Role.COMPANY_ADMIN, company.id);
      await expect(companyService.createCompanyHR([], admin as any)).rejects.toThrow();
    });
    // Edge: HR data with duplicate emails
    it('TC-CS-038: should throw error when HR data has duplicate emails', async () => {
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-HR-DUP-${timestamp}`, `HR Dup Company ${timestamp}`);
      const admin = await createTestUser(`test-admin-dup-${timestamp}@example.com`, 'Admin', 'User', Role.COMPANY_ADMIN, company.id);
      const hrData = [
        { email: `dup-hr-${timestamp}@example.com`, firstName: 'HR', lastName: 'One', password: 'password123' },
        { email: `dup-hr-${timestamp}@example.com`, firstName: 'HR', lastName: 'Two', password: 'password123' }
      ];
      await expect(companyService.createCompanyHR(hrData as any, admin as any)).rejects.toThrow();
    });
    // Edge: HR data with invalid email/password
    it('TC-CS-039: should throw error when HR data has invalid email/password', async () => {
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-HR-INVALID-${timestamp}`, `HR Invalid Company ${timestamp}`);
      const admin = await createTestUser(`test-admin-invalid-${timestamp}@example.com`, 'Admin', 'User', Role.COMPANY_ADMIN, company.id);
      const hrData = [
        { email: 'not-an-email', firstName: 'HR', lastName: 'One', password: '123' }
      ];
      await expect(companyService.createCompanyHR(hrData as any, admin as any)).rejects.toThrow();
    });
  });
  
  // Test suite for getCompanyHRList method
  describe('getCompanyHRList', () => {
    // Test Case 8.1: Successfully get company HR list
    it('TC-CS-040: should return list of company HR users when called by company admin', async () => {
      /**
       * Test Case ID: TC-CS-040
       * Objective: Verify that getCompanyHRList returns company HR users when called by company admin
       * Input: Company admin user
       * Expected Output: Array of company HR users
       * White-Box: Tests path where user is company admin and HR users are returned
       */
      
      // Arrange
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-HR-LIST-${timestamp}`, `HR List Company ${timestamp}`);
      
      // Create company admin
      const admin = await createTestUser(
        `test-admin-${timestamp}@example.com`,
        'Admin',
        'User',
        Role.COMPANY_ADMIN,
        company.id
      );
      
      // Create HR users
      await createTestUser(
        `test-hr1-${timestamp}@example.com`,
        'HR',
        'One',
        Role.COMPANY_HR,
        company.id
      );
      
      await createTestUser(
        `test-hr2-${timestamp}@example.com`,
        'HR',
        'Two',
        Role.COMPANY_HR,
        company.id
      );
      
      // Act
      const result = await companyService.getCompanyHRList(admin as User);
      
      // Assert
      expect(result).toHaveLength(2);
      expect(result.every(user => user.role === 'COMPANY_HR')).toBe(true);
      expect(result.every(user => user.companyId === company.id)).toBe(true);
    });
    
    // Test Case 8.2: Non-company admin
    it('TC-CS-041: should throw ForbiddenException when user is not company admin', async () => {
      /**
       * Test Case ID: TC-CS-041
       * Objective: Verify that getCompanyHRList throws ForbiddenException when user is not company admin
       * Input: Non-company admin user
       * Expected Output: ForbiddenException
       * White-Box: Tests path where user is not company admin
       */
      
      // Arrange
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-HR-LIST-${timestamp}`, `HR List Company ${timestamp}`);
      
      // Create regular user
      const regularUser = await createTestUser(
        `test-user-${timestamp}@example.com`,
        'Regular',
        'User',
        Role.USER,
        company.id
      );
      
      // Act & Assert
      await expect(
        companyService.getCompanyHRList(regularUser as User)
      ).rejects.toThrow(ForbiddenException);
    });
    
    // Test Case 8.3: Non-existent user
    it('TC-CS-042: should throw UnauthorizedException when user does not exist', async () => {
      /**
       * Test Case ID: TC-CS-042
       * Objective: Verify that getCompanyHRList throws UnauthorizedException when user does not exist
       * Input: Non-existent user
       * Expected Output: UnauthorizedException
       * White-Box: Tests path where user does not exist
       */
      
      // Arrange
      const nonExistentUser = {
        id: 99999,
        email: 'nonexistent@example.com',
        firstName: 'Non',
        lastName: 'Existent',
        password: 'hashed',
        role: Role.COMPANY_ADMIN,
        displayName: 'Non Existent',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        companyId: 1
      } as User;
      
      // Act & Assert
      await expect(
        companyService.getCompanyHRList(nonExistentUser)
      ).rejects.toThrow(UnauthorizedException);
    });

    // Edge: User not associated with any company
    it('TC-CS-043: should throw error when user not associated with any company', async () => {
      const user = { id: 9999, companyId: null, role: Role.COMPANY_ADMIN } as any;
      await expect(companyService.getCompanyHRList(user)).rejects.toThrow();
    });
  });
  
  // Test suite for deleteCompanyHR method
  describe('deleteCompanyHR', () => {
    // Test Case 9.1: Successfully delete company HR
    it('TC-CS-044: should delete company HR user when called by company admin', async () => {
      /**
       * Test Case ID: TC-CS-044
       * Objective: Verify that deleteCompanyHR deletes a company HR user when called by company admin
       * Input: HR user ID and company admin user
       * Expected Output: HR user is deleted
       * White-Box: Tests path where user is company admin and HR user is deleted
       */
      
      // Arrange
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-DELETE-HR-${timestamp}`, `Delete HR Company ${timestamp}`);
      
      // Create company admin
      const admin = await createTestUser(
        `test-admin-${timestamp}@example.com`,
        'Admin',
        'User',
        Role.COMPANY_ADMIN,
        company.id
      );
      
      // Create HR user
      const hr = await createTestUser(
        `test-hr-${timestamp}@example.com`,
        'HR',
        'User',
        Role.COMPANY_HR,
        company.id
      );
      
      // Act
      await companyService.deleteCompanyHR(hr.id, admin as User);
      
      // Assert - HR user should be deleted
      const deletedHR = await prismaService.user.findUnique({
        where: { id: hr.id }
      });
      expect(deletedHR).toBeNull();
    });
    
    // Test Case 9.2: Non-company admin
    it('TC-CS-045: should throw ForbiddenException when user is not company admin', async () => {
      /**
       * Test Case ID: TC-CS-045
       * Objective: Verify that deleteCompanyHR throws ForbiddenException when user is not company admin
       * Input: HR user ID and non-company admin user
       * Expected Output: ForbiddenException
       * White-Box: Tests path where user is not company admin
       */
      
      // Arrange
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-DELETE-HR-${timestamp}`, `Delete HR Company ${timestamp}`);
      
      // Create regular user
      const regularUser = await createTestUser(
        `test-user-${timestamp}@example.com`,
        'Regular',
        'User',
        Role.USER,
        company.id
      );
      
      // Create HR user
      const hr = await createTestUser(
        `test-hr-${timestamp}@example.com`,
        'HR',
        'User',
        Role.COMPANY_HR,
        company.id
      );
      
      // Act & Assert
      await expect(
        companyService.deleteCompanyHR(hr.id, regularUser as User)
      ).rejects.toThrow(ForbiddenException);
    });
    
    // Test Case 9.3: Non-existent user
    it('TC-CS-046: should throw UnauthorizedException when user does not exist', async () => {
      /**
       * Test Case ID: TC-CS-046
       * Objective: Verify that deleteCompanyHR throws UnauthorizedException when user does not exist
       * Input: HR user ID and non-existent user
       * Expected Output: UnauthorizedException
       * White-Box: Tests path where user does not exist
       */
      
      // Arrange
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-DELETE-HR-${timestamp}`, `Delete HR Company ${timestamp}`);
      
      // Create HR user
      const hr = await createTestUser(
        `test-hr-${timestamp}@example.com`,
        'HR',
        'User',
        Role.COMPANY_HR,
        company.id
      );
      
      const nonExistentUser = {
        id: 99999,
        email: 'nonexistent@example.com',
        firstName: 'Non',
        lastName: 'Existent',
        password: 'hashed',
        role: Role.COMPANY_ADMIN,
        displayName: 'Non Existent',
        avatar: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        companyId: company.id
      } as User;
      
      // Act & Assert
      await expect(
        companyService.deleteCompanyHR(hr.id, nonExistentUser)
      ).rejects.toThrow(UnauthorizedException);
    });
    
    // Edge: HR ID does not exist
    it('TC-CS-047: should throw error when HR ID does not exist', async () => {
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-HR-NOTFOUND-${timestamp}`, `HR NotFound Company ${timestamp}`);
      const admin = await createTestUser(`test-admin-notfound-${timestamp}@example.com`, 'Admin', 'User', Role.COMPANY_ADMIN, company.id);
      await expect(companyService.deleteCompanyHR(99999, admin as any)).rejects.toThrow();
    });
    // Edge: HR ID belongs to another company
    it('TC-CS-048: should not delete HR user from another company', async () => {
      const timestamp = Date.now();
      const company1 = await createTestCompany(`TEST-HR-OWN1-${timestamp}`, `HR Own1 Company ${timestamp}`);
      const company2 = await createTestCompany(`TEST-HR-OWN2-${timestamp}`, `HR Own2 Company ${timestamp}`);
      const admin = await createTestUser(`test-admin-own1-${timestamp}@example.com`, 'Admin', 'User', Role.COMPANY_ADMIN, company1.id);
      const hr = await createTestUser(`test-hr-own2-${timestamp}@example.com`, 'HR', 'User', Role.COMPANY_HR, company2.id);
      await expect(companyService.deleteCompanyHR(hr.id, admin as any)).rejects.toThrow();
    });
    // Edge: HR ID is negative or zero
    it('TC-CS-049: should throw error when HR ID is negative or zero', async () => {
      const timestamp = Date.now();
      const company = await createTestCompany(`TEST-HR-NEGZERO-${timestamp}`, `HR NegZero Company ${timestamp}`);
      const admin = await createTestUser(`test-admin-negzero-${timestamp}@example.com`, 'Admin', 'User', Role.COMPANY_ADMIN, company.id);
      await expect(companyService.deleteCompanyHR(0, admin as any)).rejects.toThrow();
      await expect(companyService.deleteCompanyHR(-1, admin as any)).rejects.toThrow();
    });
  });
}); 