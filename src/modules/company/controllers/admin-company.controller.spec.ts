import { Test, TestingModule } from '@nestjs/testing';
import { AdminCompanyController } from './admin-company.controller';
import { CompanyService } from '../company.service';
import { CompanyFilter } from '../dtos/company-filter.query';
import ResponseDto from '../../../constants/response.dto';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Message } from '../../../constants/message';
import { CompanyDto } from '../dtos/company.dto';
import { CreateCompanyDto } from '../dtos/create-company.dto';
import { CreateCompanyHrDto } from '../dtos/create-company-hr.dto';
import { Role, User } from '@prisma/client';

describe('AdminCompanyController Unit Tests', () => {
  let controller: AdminCompanyController;
  let companyService: jest.Mocked<CompanyService>;

  // Mock company data with all required properties
  const mockCompanies: CompanyDto[] = [
    {
      id: 1,
      code: 'COMP-001',
      name: 'Company 1',
      description: 'Description 1',
      address: 'Address 1',
      logo: 'logo1.png',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    },
    {
      id: 2,
      code: 'COMP-002',
      name: 'Company 2',
      description: 'Description 2',
      address: 'Address 2',
      logo: 'logo2.png',
      createdAt: new Date('2023-01-02'),
      updatedAt: new Date('2023-01-02'),
    }
  ];

  // Mock pagination result
  const mockPaginationResult = {
    data: mockCompanies,
    total: 2,
    offset: 0,
    limit: 10,
    sort: []
  };

  // Mock user
  const mockUser: User = {
    id: 1,
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    displayName: 'Admin User',
    password: 'hashed_password',
    avatar: null,
    role: Role.COMPANY_ADMIN,
    createdAt: new Date(),
    updatedAt: new Date(),
    companyId: 1
  };

  // Mock HR users
  const mockHRUsers = [
    {
      id: 2,
      email: 'hr1@example.com',
      firstName: 'HR',
      lastName: 'One',
      displayName: 'HR One',
      password: 'hashed_password',
      avatar: null,
      role: Role.COMPANY_HR,
      createdAt: new Date(),
      updatedAt: new Date(),
      companyId: 1
    },
    {
      id: 3,
      email: 'hr2@example.com',
      firstName: 'HR',
      lastName: 'Two',
      displayName: 'HR Two',
      password: 'hashed_password',
      avatar: null,
      role: Role.COMPANY_HR,
      createdAt: new Date(),
      updatedAt: new Date(),
      companyId: 1
    }
  ];

  // Add a valid createCompanyDto for use in edge case tests
  const createCompanyDto: CreateCompanyDto = {
    id: 123,
    code: 'NEW-COMP',
    name: 'New Company',
    description: 'New Description',
    address: 'New Address',
    logo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    companyAccountEmail: 'admin@newcomp.com',
    companyAccountFirstName: 'Admin',
    companyAccountLastName: 'User',
    companyAccountPassword: 'password123'
  };

  beforeEach(async () => {
    // Create mock for CompanyService with all methods
    const companyServiceMock = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      createCompany: jest.fn(),
      updateCompany: jest.fn(),
      deleteCompany: jest.fn(),
      createCompanyHR: jest.fn(),
      getCompanyHRList: jest.fn(),
      deleteCompanyHR: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminCompanyController],
      providers: [
        {
          provide: CompanyService,
          useValue: companyServiceMock
        }
      ]
    }).compile();

    controller = module.get<AdminCompanyController>(AdminCompanyController);
    companyService = module.get<CompanyService>(
      CompanyService
    ) as jest.Mocked<CompanyService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Tests for list method
  describe('list', () => {
    /**
     * #### TC-AC-001: Valid Filter
     * - **Goal:** Verify that list returns companies matching the provided filter
     * - **Input:**
     *   ```json
     *   {
     *     "code": "COMP",
     *     "name": "",
     *     "offset": 0,
     *     "limit": 10,
     *     "sort": []
     *   }
     *   ```
     * - **Expected Output:**
     *   - Success response containing an array of companies matching the filter
     *   - Pagination data including total count, offset, and limit
     */
    it('TC-AC-001: Valid Filter: should return success response with companies matching filter', async () => {
      // Arrange
      const filter: CompanyFilter = {
        code: 'COMP',
        name: '',
        offset: 0,
        limit: 10,
        sort: []
      };
      companyService.findAll.mockResolvedValue(mockPaginationResult);

      // Act
      const result = await controller.list(filter);

      // Assert
      expect(companyService.findAll).toHaveBeenCalledWith(filter);
      expect(result).toEqual(ResponseDto.successDefault(mockPaginationResult));
    });

    /**
     * #### TC-AC-002: Empty Filter
     * - **Goal:** Verify that list returns all companies when given an empty filter
     * - **Input:**
     *   ```json
     *   {
     *     "code": "",
     *     "name": "",
     *     "offset": 0,
     *     "limit": 10,
     *     "sort": []
     *   }
     *   ```
     * - **Expected Output:**
     *   - Success response containing all companies
     *   - Pagination data including total count, offset, and limit
     */
    it('TC-AC-002: Empty Filter: should return all companies when given empty filter', async () => {
      // Arrange
      const emptyFilter: CompanyFilter = {
        code: '',
        name: '',
        offset: 0,
        limit: 10,
        sort: []
      };
      companyService.findAll.mockResolvedValue(mockPaginationResult);

      // Act
      const result = await controller.list(emptyFilter);

      // Assert
      expect(companyService.findAll).toHaveBeenCalledWith(emptyFilter);
      expect(result).toEqual(ResponseDto.successDefault(mockPaginationResult));
    });

    /**
     * #### TC-AC-003: Pagination and Sorting
     * - **Goal:** Verify that list properly handles pagination and sorting parameters
     * - **Input:**
     *   ```json
     *   {
     *     "code": "",
     *     "name": "",
     *     "offset": 1,
     *     "limit": 5,
     *     "sort": [{ "field": "name", "direction": "asc" }]
     *   }
     *   ```
     * - **Expected Output:**
     *   - Success response with correctly paginated and sorted data
     *   - Pagination metadata reflects requested parameters
     */
    it('TC-AC-003: Pagination and Sorting: should properly handle pagination and sorting', async () => {
      // Arrange
      const filter: CompanyFilter = {
        code: '',
        name: '',
        offset: 1,
        limit: 5,
        sort: [{ field: 'name', direction: 'asc' }]
      };
      
      const paginatedResult = {
        data: [mockCompanies[1]],
        total: 2,
        offset: 1,
        limit: 5,
        sort: [{ field: 'name', direction: 'asc' }]
      };
      
      companyService.findAll.mockResolvedValue(paginatedResult);

      // Act
      const result = await controller.list(filter);

      // Assert
      expect(companyService.findAll).toHaveBeenCalledWith(filter);
      expect(result).toEqual(ResponseDto.successDefault(paginatedResult));
    });

    /**
     * #### TC-AC-004: Special Characters Filter
     * - **Goal:** Verify that list safely handles filters with special characters
     * - **Input:**
     *   ```json
     *   {
     *     "code": "'; DROP TABLE companies;--",
     *     "name": "",
     *     "offset": 0,
     *     "limit": 10,
     *     "sort": []
     *   }
     *   ```
     * - **Expected Output:**
     *   - Success response with properly filtered results
     *   - No SQL injection vulnerability
     */
    it('TC-AC-004: Special Characters Filter: should handle filter with special characters', async () => {
      const filter: CompanyFilter = { code: "'; DROP TABLE companies;--", name: '', offset: 0, limit: 10, sort: [] };
      companyService.findAll.mockResolvedValue(mockPaginationResult);
      const result = await controller.list(filter);
      expect(companyService.findAll).toHaveBeenCalledWith(filter);
      expect(result).toEqual(ResponseDto.successDefault(mockPaginationResult));
    });

    /**
     * #### TC-AC-005: Large Offset/Limit
     * - **Goal:** Verify that list handles extremely large pagination parameters
     * - **Input:**
     *   ```json
     *   {
     *     "code": "",
     *     "name": "",
     *     "offset": 1e6,
     *     "limit": 1e6,
     *     "sort": []
     *   }
     *   ```
     * - **Expected Output:**
     *   - Success response with correctly applied pagination parameters
     *   - No performance issues or crashes with large values
     */
    it('TC-AC-005: Large Offset/Limit: should handle filter with extremely large offset/limit', async () => {
      const filter: CompanyFilter = { code: '', name: '', offset: 1e6, limit: 1e6, sort: [] };
      companyService.findAll.mockResolvedValue({ ...mockPaginationResult, offset: 1e6, limit: 1e6 });
      const result = await controller.list(filter);
      expect(companyService.findAll).toHaveBeenCalledWith(filter);
      expect(result).toEqual(ResponseDto.successDefault({ ...mockPaginationResult, offset: 1e6, limit: 1e6 }));
    });

    /**
     * #### TC-AC-006: Negative Offset/Limit
     * - **Goal:** Verify that list properly handles invalid negative pagination parameters
     * - **Input:**
     *   ```json
     *   {
     *     "code": "",
     *     "name": "",
     *     "offset": -1,
     *     "limit": -5,
     *     "sort": []
     *   }
     *   ```
     * - **Expected Output:**
     *   - BadRequestException with appropriate error message
     */
    it('TC-AC-006: Negative Offset/Limit: should handle filter with negative offset/limit', async () => {
      const filter: CompanyFilter = { code: '', name: '', offset: -1, limit: -5, sort: [] };
      const error = new BadRequestException('Invalid pagination');
      companyService.findAll.mockRejectedValue(error);
      await expect(controller.list(filter)).rejects.toThrow(error);
      expect(companyService.findAll).toHaveBeenCalledWith(filter);
    });
  });

  // Tests for getCompanyById method
  describe('getCompanyById', () => {
    /**
     * #### TC-AC-007: Valid ID
     * - **Goal:** Verify that getCompanyById returns the correct company when a valid ID is provided
     * - **Input:**
     *   - Company ID: 1
     * - **Expected Output:**
     *   - Success response containing the company with ID 1
     *   - Complete company details including code, name, description, and address
     */
    it('TC-AC-007: Valid ID: should return success response with company for valid ID', async () => {
      // Arrange
      const companyId = 1;
      companyService.findById.mockResolvedValue(mockCompanies[0]);

      // Act
      const result = await controller.getCompanyById(companyId);

      // Assert
      expect(companyService.findById).toHaveBeenCalledWith(companyId);
      expect(result).toEqual(ResponseDto.successDefault(mockCompanies[0]));
    });

    /**
     * #### TC-AC-008: Company Not Found
     * - **Goal:** Verify that getCompanyById throws NotFoundException when company with ID does not exist
     * - **Input:**
     *   - Company ID: 999 (non-existent)
     * - **Expected Output:**
     *   - NotFoundException with message "Company not found"
     */
    it('TC-AC-008: Company Not Found: should throw NotFoundException when company not found', async () => {
      // Arrange
      const nonExistentId = 999;
      const error = new NotFoundException(Message.COMPANY_NOT_FOUND);
      companyService.findById.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getCompanyById(nonExistentId)).rejects.toThrow(error);
      expect(companyService.findById).toHaveBeenCalledWith(nonExistentId);
    });

    /**
     * #### TC-AC-009: ID = 0
     * - **Goal:** Verify that getCompanyById handles ID = 0 appropriately
     * - **Input:**
     *   - Company ID: 0
     * - **Expected Output:**
     *   - NotFoundException with message "Company not found"
     */
    it('TC-AC-009: ID = 0: should handle ID = 0', async () => {
      const error = new NotFoundException(Message.COMPANY_NOT_FOUND);
      companyService.findById.mockRejectedValue(error);
      await expect(controller.getCompanyById(0)).rejects.toThrow(error);
      expect(companyService.findById).toHaveBeenCalledWith(0);
    });

    /**
     * #### TC-AC-010: Very Large ID
     * - **Goal:** Verify that getCompanyById handles very large IDs appropriately
     * - **Input:**
     *   - Company ID: Number.MAX_SAFE_INTEGER
     * - **Expected Output:**
     *   - NotFoundException with message "Company not found"
     */
    it('TC-AC-010: Very Large ID: should handle very large ID', async () => {
      const largeId = Number.MAX_SAFE_INTEGER;
      const error = new NotFoundException(Message.COMPANY_NOT_FOUND);
      companyService.findById.mockRejectedValue(error);
      await expect(controller.getCompanyById(largeId)).rejects.toThrow(error);
      expect(companyService.findById).toHaveBeenCalledWith(largeId);
    });

    /**
     * #### TC-AC-011: Negative ID
     * - **Goal:** Verify that getCompanyById handles negative IDs appropriately
     * - **Input:**
     *   - Company ID: -5
     * - **Expected Output:**
     *   - NotFoundException with message "Company not found"
     */
    it('TC-AC-011: Negative ID: should handle negative ID', async () => {
      const error = new NotFoundException(Message.COMPANY_NOT_FOUND);
      companyService.findById.mockRejectedValue(error);
      await expect(controller.getCompanyById(-5)).rejects.toThrow(error);
      expect(companyService.findById).toHaveBeenCalledWith(-5);
    });
  });

  // Tests for getCompanyByCode method
  describe('getCompanyByCode', () => {
    /**
     * #### TC-AC-012: Valid Code
     * - **Goal:** Verify that getCompanyByCode returns the correct company when a valid code is provided
     * - **Input:**
     *   - Company Code: "COMP-001"
     * - **Expected Output:**
     *   - Success response containing the company with code "COMP-001"
     *   - Complete company details including id, name, description, and address
     */
    it('TC-AC-012: Valid Code: should return success response with company for valid code', async () => {
      // Arrange
      const companyCode = 'COMP-001';
      companyService.findByCode.mockResolvedValue(mockCompanies[0]);

      // Act
      const result = await controller.getCompanyByCode(companyCode);

      // Assert
      expect(companyService.findByCode).toHaveBeenCalledWith(companyCode);
      expect(result).toEqual(ResponseDto.successDefault(mockCompanies[0]));
    });

    /**
     * #### TC-AC-013: Company Not Found
     * - **Goal:** Verify that getCompanyByCode throws NotFoundException when company with code does not exist
     * - **Input:**
     *   - Company Code: "NON-EXISTENT"
     * - **Expected Output:**
     *   - NotFoundException with message "Company with code [NON-EXISTENT] not found"
     */
    it('TC-AC-013: Company Not Found: should throw NotFoundException when company not found', async () => {
      // Arrange
      const nonExistentCode = 'NON-EXISTENT';
      const error = new NotFoundException(Message.COMPANY_CODE_NOT_FOUND(nonExistentCode));
      companyService.findByCode.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getCompanyByCode(nonExistentCode)).rejects.toThrow(error);
      expect(companyService.findByCode).toHaveBeenCalledWith(nonExistentCode);
    });

    /**
     * #### TC-AC-014: Whitespace-Only Code
     * - **Goal:** Verify that getCompanyByCode handles whitespace-only code
     * - **Input:**
     *   - Company Code: "   "
     * - **Expected Output:**
     *   - BadRequestException with message "Invalid code"
     */
    it('TC-AC-014: Whitespace-Only Code: should handle whitespace-only code', async () => {
      const whitespaceCode = '   ';
      const error = new BadRequestException('Invalid code');
      companyService.findByCode.mockRejectedValue(error);
      await expect(controller.getCompanyByCode(whitespaceCode)).rejects.toThrow(error);
      expect(companyService.findByCode).toHaveBeenCalledWith(whitespaceCode);
    });

    /**
     * #### TC-AC-015: Extremely Long Code
     * - **Goal:** Verify that getCompanyByCode handles extremely long code
     * - **Input:**
     *   - Company Code: "A".repeat(1000)
     * - **Expected Output:**
     *   - NotFoundException with message indicating company not found
     */
    it('TC-AC-015: Extremely Long Code: should handle extremely long code', async () => {
      const longCode = 'A'.repeat(1000);
      const error = new NotFoundException(Message.COMPANY_CODE_NOT_FOUND(longCode));
      companyService.findByCode.mockRejectedValue(error);
      await expect(controller.getCompanyByCode(longCode)).rejects.toThrow(error);
      expect(companyService.findByCode).toHaveBeenCalledWith(longCode);
    });

    /**
     * #### TC-AC-016: Special/Unicode Characters
     * - **Goal:** Verify that getCompanyByCode handles code with special/unicode characters
     * - **Input:**
     *   - Company Code: "公司-测试-🚀"
     * - **Expected Output:**
     *   - NotFoundException with message indicating company not found
     */
    it('TC-AC-016: Special/Unicode Characters: should handle code with special/unicode characters', async () => {
      const specialCode = '公司-测试-🚀';
      const error = new NotFoundException(Message.COMPANY_CODE_NOT_FOUND(specialCode));
      companyService.findByCode.mockRejectedValue(error);
      await expect(controller.getCompanyByCode(specialCode)).rejects.toThrow(error);
      expect(companyService.findByCode).toHaveBeenCalledWith(specialCode);
    });
  });

  // Tests for createCompany method
  describe('createCompany', () => {
    /**
     * #### TC-AC-017: Valid Company Creation
     * - **Goal:** Verify that a company can be successfully created when all required fields are provided with valid data
     * - **Input:**
     *   ```json
     *   {
     *     "id": 123,
     *     "code": "NEW-COMP",
     *     "name": "New Company",
     *     "description": "New Description",
     *     "address": "New Address",
     *     "logo": null,
     *     "companyAccountEmail": "admin@newcomp.com",
     *     "companyAccountFirstName": "Admin",
     *     "companyAccountLastName": "User",
     *     "companyAccountPassword": "password123"
     *   }
     *   ```
     * - **Expected Output:**
     *   - Success response with status code 201
     *   - Response contains newly created company data
     *   - Success message: "Company created successfully"
     * - **Note:** This test verifies the createCompany method successfully passes data to the service and returns the expected response
     */
    it('TC-AC-017: Valid Company Creation: should return success response when company created successfully', async () => {
      // Arrange
      const createCompanyDto: CreateCompanyDto = {
        id: 123,
        code: 'NEW-COMP',
        name: 'New Company',
        description: 'New Description',
        address: 'New Address',
        logo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        companyAccountEmail: 'admin@newcomp.com',
        companyAccountFirstName: 'Admin',
        companyAccountLastName: 'User',
        companyAccountPassword: 'password123'
      };
      
      const createdCompany: CompanyDto = {
        id: 123,
        code: 'NEW-COMP',
        name: 'New Company',
        description: 'New Description',
        address: 'New Address',
        logo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      companyService.createCompany.mockResolvedValue(createdCompany);

      // Act
      const result = await controller.createCompany(createCompanyDto);

      // Assert
      expect(companyService.createCompany).toHaveBeenCalledWith(createCompanyDto);
      expect(result).toEqual(ResponseDto.success(createdCompany, Message.COMPANY_CREATED));
    });

    /**
     * #### TC-AC-018: Duplicate Company Code
     * - **Goal:** Verify that createCompany handles duplicate company code error
     * - **Input:**
     *   ```json
     *   {
     *     "id": 123,
     *     "code": "COMP-001", // Existing code
     *     "name": "New Company",
     *     "description": "New Description",
     *     "address": "New Address",
     *     "logo": null,
     *     "companyAccountEmail": "admin@newcomp.com",
     *     "companyAccountFirstName": "Admin",
     *     "companyAccountLastName": "User",
     *     "companyAccountPassword": "password123"
     *   }
     *   ```
     * - **Expected Output:**
     *   - BadRequestException with message "Company with code [COMP-001] already exists"
     */
    it('TC-AC-018: Duplicate Company Code: should propagate BadRequestException when company code already exists', async () => {
      // Arrange
      const createCompanyDto: CreateCompanyDto = {
        id: 123,
        code: 'COMP-001', // Existing code
        name: 'New Company',
        description: 'New Description',
        address: 'New Address',
        logo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        companyAccountEmail: 'admin@newcomp.com',
        companyAccountFirstName: 'Admin',
        companyAccountLastName: 'User',
        companyAccountPassword: 'password123'
      };
      
      const error = new BadRequestException(Message.COMPANY_CODE_ALREADY_EXISTS('COMP-001'));
      companyService.createCompany.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createCompany(createCompanyDto)).rejects.toThrow(error);
      expect(companyService.createCompany).toHaveBeenCalledWith(createCompanyDto);
    });

    /**
     * #### TC-AC-019: Invalid Company Data
     * - **Goal:** Verify that createCompany handles invalid company data
     * - **Input:**
     *   ```json
     *   {
     *     "id": 123,
     *     "code": "",
     *     "name": "",
     *     "description": "",
     *     "address": "",
     *     "logo": null,
     *     "companyAccountEmail": "invalid-email",
     *     "companyAccountFirstName": "",
     *     "companyAccountLastName": "",
     *     "companyAccountPassword": "short"
     *   }
     *   ```
     * - **Expected Output:**
     *   - BadRequestException with message "Validation failed"
     */
    it('TC-AC-019: Invalid Company Data: should propagate BadRequestException for invalid company data', async () => {
      // Arrange
      const invalidDto: CreateCompanyDto = {
        id: 123,
        code: '',
        name: '',
        description: '',
        address: '',
        logo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        companyAccountEmail: 'invalid-email',
        companyAccountFirstName: '',
        companyAccountLastName: '',
        companyAccountPassword: 'short'
      };
      
      const error = new BadRequestException('Validation failed');
      companyService.createCompany.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createCompany(invalidDto)).rejects.toThrow(error);
      expect(companyService.createCompany).toHaveBeenCalledWith(invalidDto);
    });

    /**
     * #### TC-AC-020: Empty Fields
     * - **Goal:** Verify that createCompany handles requests with empty string fields
     * - **Input:**
     *   ```json
     *   {
     *     "id": 123,
     *     "code": "",
     *     "name": "",
     *     "description": "",
     *     "address": "",
     *     "companyAccountEmail": "",
     *     "companyAccountFirstName": "",
     *     "companyAccountLastName": "",
     *     "companyAccountPassword": ""
     *   }
     *   ```
     * - **Expected Output:**
     *   - BadRequestException with message "Validation failed"
     */
    it('TC-AC-020: Empty Fields: should handle all string fields empty or whitespace', async () => {
      const emptyDto = { ...createCompanyDto, code: '', name: '', description: '', address: '', companyAccountEmail: '', companyAccountFirstName: '', companyAccountLastName: '', companyAccountPassword: '' };
      const error = new BadRequestException('Validation failed');
      companyService.createCompany.mockRejectedValue(error);
      await expect(controller.createCompany(emptyDto)).rejects.toThrow(error);
      expect(companyService.createCompany).toHaveBeenCalledWith(emptyDto);
    });

    /**
     * #### TC-AC-021: Invalid Email Format
     * - **Goal:** Verify that createCompany validates email format correctly
     * - **Input:**
     *   ```json
     *   {
     *     "id": 123,
     *     "code": "NEW-COMP",
     *     "name": "New Company",
     *     "description": "New Description",
     *     "address": "New Address",
     *     "logo": null,
     *     "companyAccountEmail": "not-an-email",
     *     "companyAccountFirstName": "Admin",
     *     "companyAccountLastName": "User",
     *     "companyAccountPassword": "password123"
     *   }
     *   ```
     * - **Expected Output:**
     *   - BadRequestException with message "Invalid email"
     */
    it('TC-AC-021: Invalid Email Format: should handle invalid email format', async () => {
      const invalidEmailDto = { ...createCompanyDto, companyAccountEmail: 'not-an-email' };
      const error = new BadRequestException('Invalid email');
      companyService.createCompany.mockRejectedValue(error);
      await expect(controller.createCompany(invalidEmailDto)).rejects.toThrow(error);
      expect(companyService.createCompany).toHaveBeenCalledWith(invalidEmailDto);
    });

    /**
     * #### TC-AC-022: Password Too Short
     * - **Goal:** Verify that createCompany validates password length correctly
     * - **Input:**
     *   ```json
     *   {
     *     "id": 123,
     *     "code": "NEW-COMP",
     *     "name": "New Company",
     *     "description": "New Description",
     *     "address": "New Address",
     *     "logo": null,
     *     "companyAccountEmail": "admin@newcomp.com",
     *     "companyAccountFirstName": "Admin",
     *     "companyAccountLastName": "User",
     *     "companyAccountPassword": "password123"
     *   }
     *   ```
     * - **Expected Output:**
     *   - BadRequestException with message "Password too short"
     */
    it('TC-AC-022: Password Too Short: should handle password too short', async () => {
      const shortPasswordDto = { ...createCompanyDto, companyAccountPassword: '123' };
      const error = new BadRequestException('Password too short');
      companyService.createCompany.mockRejectedValue(error);
      await expect(controller.createCompany(shortPasswordDto)).rejects.toThrow(error);
      expect(companyService.createCompany).toHaveBeenCalledWith(shortPasswordDto);
    });

    /**
      * #### TC-AC-023: Duplicate Email
     * - **Goal:** Verify that createCompany handles duplicate email for company admin
     * - **Input:**
     *   ```json
     *   {
     *     "id": 123,
     *     "code": "NEW-COMP",
     *     "name": "New Company",
     *     "description": "New Description",
     *     "address": "New Address",
     *     "logo": null,
     *     "companyAccountEmail": "admin@example.com", // existing email
     *     "companyAccountFirstName": "Admin",
     *     "companyAccountLastName": "User",
     *     "companyAccountPassword": "password123"
     *   }
     *   ```
     * - **Expected Output:**
     *   - BadRequestException with message "Email already exists"
     */
    it('TC-AC-023: Duplicate Email: should handle duplicate email for company admin', async () => {
      const duplicateEmailDto = { ...createCompanyDto, companyAccountEmail: 'admin@example.com' };
      const error = new BadRequestException('Email already exists');
      companyService.createCompany.mockRejectedValue(error);
      await expect(controller.createCompany(duplicateEmailDto)).rejects.toThrow(error);
      expect(companyService.createCompany).toHaveBeenCalledWith(duplicateEmailDto);
    });

    /**
     * #### TC-AC-024: Very Long Values
     * - **Goal:** Verify that createCompany validates field length constraints
     * - **Input:**
     *   ```json
     *   {
     *     "id": 123,
     *     "code": "NEW-COMP",
     *     "name": "A".repeat(1000),
     *     "description": "B".repeat(2000),
     *     "address": "C".repeat(1000),
     *     "logo": null,
     *     "companyAccountEmail": "admin@newcomp.com",
     *     "companyAccountFirstName": "Admin",
     *     "companyAccountLastName": "User",
     *     "companyAccountPassword": "password123"
     *   }
     *   ```
     * - **Expected Output:**
     *   - BadRequestException with message "Field too long"
     */
    it('TC-AC-024: Very Long Values: should handle very long company name/description/address', async () => {
      const longFieldsDto = { ...createCompanyDto, name: 'A'.repeat(1000), description: 'B'.repeat(2000), address: 'C'.repeat(1000) };
      const error = new BadRequestException('Field too long');
      companyService.createCompany.mockRejectedValue(error);
      await expect(controller.createCompany(longFieldsDto)).rejects.toThrow(error);
      expect(companyService.createCompany).toHaveBeenCalledWith(longFieldsDto);
    });
  });

  // Tests for updateCompany method
  describe('updateCompany', () => {
    /**
     * #### TC-AC-025: Valid Recruitment Update
     * - **Goal:** Verify that updateCompany updates a company when valid data is provided
     * - **Input:**
     *   - Company ID: 1
     *   - Update data:
     *   ```json
     *   {
     *     "id": 1,
     *     "code": "COMP-001",
     *     "name": "Updated Company",
     *     "description": "Updated Description",
     *     "address": "Address 1",
     *     "logo": "logo1.png"
     *   }
     *   ```
     * - **Expected Output:**
     *   - Success response with updated company data
     *   - Success message: "Company updated successfully"
     */
    it('TC-AC-025: Valid Recruitment Update: should update and return the company when valid data is provided', async () => {
      // Arrange
      const companyId = 1;
      const updateData: CompanyDto = {
        ...mockCompanies[0],
        name: 'Updated Company',
        description: 'Updated Description'
      };
      
      const updatedCompany: CompanyDto = {
        ...mockCompanies[0],
        name: 'Updated Company',
        description: 'Updated Description',
        updatedAt: new Date()
      };
      
      companyService.updateCompany.mockResolvedValue(updatedCompany);

      // Act
      const result = await controller.updateCompany(companyId, updateData);

      // Assert
      expect(companyService.updateCompany).toHaveBeenCalledWith(companyId, updateData);
      expect(result).toEqual(ResponseDto.success(updatedCompany, Message.COMPANY_UPDATED));
    });

    /**
     * #### TC-AC-026: Company Not Found
     * - **Goal:** Verify that updateCompany throws NotFoundException when company with ID does not exist
     * - **Input:**
     *   - Company ID: 999 (non-existent)
     *   - Update data containing properties to update
     * - **Expected Output:**
     *   - NotFoundException with message "Company not found"
     */
    it('TC-AC-026: Company Not Found: should throw NotFoundException when company not found', async () => {
      // Arrange
      const nonExistentId = 999;
      const updateData: CompanyDto = {
        ...mockCompanies[0],
        id: nonExistentId
      };
      
      const error = new NotFoundException(Message.COMPANY_NOT_FOUND);
      companyService.updateCompany.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.updateCompany(nonExistentId, updateData)).rejects.toThrow(error);
      expect(companyService.updateCompany).toHaveBeenCalledWith(nonExistentId, updateData);
    });

    /**
     * #### TC-AC-027: Handle update with no changes
     * - **Goal:** Verify that updateCompany handles update with no changes
     * - **Input:**
     *   - Company ID: 1
     *   - Update data:
     *   ```json
     *   {
     *     "id": 1,
     *     "code": "COMP-001",
     *     "name": "Company 1",
     *     "description": "Description 1",
     *     "address": "Address 1",
     *     "logo": "logo1.png"
     *   }
     *   ```
     * - **Expected Output:**
     *   - Success response with updated company data
     *   - Success message: "Company updated successfully"
     */
    it('TC-AC-027: should handle update with no changes', async () => {
      companyService.updateCompany.mockResolvedValue(mockCompanies[0]);
      const result = await controller.updateCompany(mockCompanies[0].id, mockCompanies[0]);
      expect(companyService.updateCompany).toHaveBeenCalledWith(mockCompanies[0].id, mockCompanies[0]);
      expect(result).toEqual(ResponseDto.success(mockCompanies[0], Message.COMPANY_UPDATED));
    });

    /**
     * #### TC-AC-028: Handle update with only one field changed
     * - **Goal:** Verify that updateCompany handles update with only one field changed
     * - **Input:**
     *   - Company ID: 1
     *   - Update data:
     *   ```json
     *   {
     *     "id": 1,
     *     "code": "COMP-001",
     *     "name": "Only Name Changed",
     *     "description": "Description 1",
     *     "address": "Address 1",
     *     "logo": "logo1.png"
     *   }
     *   ```
     * - **Expected Output:**
     *   - Success response with updated company data
     *   - Success message: "Company updated successfully"
     */
    it('TC-AC-028: should handle update with only one field changed', async () => {
      const changed = { ...mockCompanies[0], name: 'Only Name Changed' };
      companyService.updateCompany.mockResolvedValue(changed);
      const result = await controller.updateCompany(changed.id, changed);
      expect(companyService.updateCompany).toHaveBeenCalledWith(changed.id, changed);
      expect(result).toEqual(ResponseDto.success(changed, Message.COMPANY_UPDATED));
    });

    /**
     * #### TC-AC-029: Handle update with invalid data
     * - **Goal:** Verify that updateCompany handles update with invalid data
     * - **Input:**
     *   - Company ID: 1
     *   - Update data:
     *   ```json
     *   {
     *     "id": 1,
     *     "code": "COMP-001",
     *     "name": "",
     *     "description": "Description 1",
     *     "address": "Address 1",
     *     "logo": "logo1.png"
     *   }
     *   ```
     * - **Expected Output:**
     *   - BadRequestException with message "Invalid name"
     */
    it('TC-AC-029: should handle update with invalid data', async () => {
      const invalid = { ...mockCompanies[0], name: '' };
      const error = new BadRequestException('Invalid name');
      companyService.updateCompany.mockRejectedValue(error);
      await expect(controller.updateCompany(invalid.id, invalid)).rejects.toThrow(error);
      expect(companyService.updateCompany).toHaveBeenCalledWith(invalid.id, invalid);
    });

    /**
     * #### TC-AC-030: Handle update with extremely long values
     * - **Goal:** Verify that updateCompany handles update with extremely long values
     * - **Input:**
     *   - Company ID: 1
     *   - Update data:
     *   ```json
     *   {
     *     "id": 1,
     *     "code": "COMP-001",
     *     "name": "A".repeat(1000),
     *     "description": "B".repeat(2000),
     *     "address": "C".repeat(1000),
     *     "logo": "logo1.png"
     *   }
     *   ```
     * - **Expected Output:**
     *   - BadRequestException with message "Field too long"
     */
    it('TC-AC-030: should handle update with extremely long values', async () => {
      const longUpdate = { ...mockCompanies[0], name: 'A'.repeat(1000) };
      const error = new BadRequestException('Field too long');
      companyService.updateCompany.mockRejectedValue(error);
      await expect(controller.updateCompany(longUpdate.id, longUpdate)).rejects.toThrow(error);
      expect(companyService.updateCompany).toHaveBeenCalledWith(longUpdate.id, longUpdate);
    });
  });

  // Tests for deleteCompany method
  describe('deleteCompany', () => {
    /**
      * #### TC-AC-031: Valid ID
     * - **Goal:** Verify that deleteCompany successfully deletes a company with a valid ID
     * - **Input:**
     *   - Company ID: 1
     * - **Expected Output:**
     *   - Success response with no data
     *   - Success message: "Company deleted successfully"
     */
    it('TC-AC-031: Valid ID: should return success response when company deleted successfully', async () => {
      // Arrange
      const companyId = 1;
      companyService.deleteCompany.mockResolvedValue(undefined);

      // Act
      const result = await controller.deleteCompany(companyId);

      // Assert
      expect(companyService.deleteCompany).toHaveBeenCalledWith(companyId);
      expect(result).toEqual(ResponseDto.successWithoutData(Message.COMPANY_DELETED));
    });

    /**
     * #### TC-AC-032: Company Not Found
     * - **Goal:** Verify that deleteCompany throws NotFoundException when company with ID does not exist
     * - **Input:**
     *   - Company ID: 999 (non-existent)
     * - **Expected Output:**
     *   - NotFoundException with message "Company not found"
     */
    it('TC-AC-032: Company Not Found: should throw NotFoundException when company not found', async () => {
      // Arrange
      const nonExistentId = 999;
      const error = new NotFoundException(Message.COMPANY_NOT_FOUND);
      companyService.deleteCompany.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteCompany(nonExistentId)).rejects.toThrow(error);
      expect(companyService.deleteCompany).toHaveBeenCalledWith(nonExistentId);
    });

    /**
     * #### TC-AC-033: Delete Associated Users
     * - **Goal:** Verify that deleteCompany handles deleting a company with associated users/HRs
     * - **Input:**
     *   - Company ID: 1 (with associated users)
     * - **Expected Output:**
     *   - Success response with no data
     *   - Success message: "Company deleted successfully"
     * - **Note:** This tests the cascading delete functionality
     */
    it('TC-AC-033: Delete Associated Users: should handle delete company with associated users/HRs', async () => {
      companyService.deleteCompany.mockResolvedValue(undefined);
      const result = await controller.deleteCompany(mockCompanies[0].id);
      expect(companyService.deleteCompany).toHaveBeenCalledWith(mockCompanies[0].id);
      expect(result).toEqual(ResponseDto.successWithoutData(Message.COMPANY_DELETED));
    });

    /**
     * #### TC-AC-034: Delete Twice
     * - **Goal:** Verify that deleteCompany handles attempting to delete the same company twice
     * - **Input:**
     *   - First call: Company ID: 1
     *   - Second call: Company ID: 1 (already deleted)
     * - **Expected Output:**
     *   - First call: Success response
     *   - Second call: NotFoundException with message "Company not found"
     */
    it('TC-AC-034: Delete Twice: should handle delete company twice', async () => {
      companyService.deleteCompany.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new NotFoundException(Message.COMPANY_NOT_FOUND));
      await controller.deleteCompany(mockCompanies[0].id);
      await expect(controller.deleteCompany(mockCompanies[0].id)).rejects.toThrow(NotFoundException);
    });
  });

  // Tests for createCompanyHR method
  describe('createCompanyHR', () => {
    /**
     * #### TC-AC-035: Valid HR Data
     * - **Goal:** Verify that createCompanyHR creates HR users successfully when valid data is provided
     * - **Input:**
     *   - HR Data:
     *   ```json
     *   [
     *     {
     *       "email": "hr1@example.com",
     *       "firstName": "HR",
     *       "lastName": "One",
     *       "password": "password123"
     *     },
     *     {
     *       "email": "hr2@example.com",
     *       "firstName": "HR",
     *       "lastName": "Two",
     *       "password": "password123"
     *     }
     *   ]
     *   ```
     *   - User: Company admin user
     * - **Expected Output:**
     *   - Success response containing created HR users
     */
    it('TC-AC-035: Valid HR Data: should return success response when HR users created successfully', async () => {
      // Arrange
      const hrData: CreateCompanyHrDto[] = [
        {
          email: 'hr1@example.com',
          firstName: 'HR',
          lastName: 'One',
          password: 'password123'
        },
        {
          email: 'hr2@example.com',
          firstName: 'HR',
          lastName: 'Two',
          password: 'password123'
        }
      ];
      
      companyService.createCompanyHR.mockResolvedValue(mockHRUsers);

      // Act
      const result = await controller.createCompanyHR(hrData, mockUser);

      // Assert
      expect(companyService.createCompanyHR).toHaveBeenCalledWith(hrData, mockUser);
      expect(result).toEqual(ResponseDto.successDefault(mockHRUsers));
    });

    /**
     * #### TC-AC-036: Not Company Admin
     * - **Goal:** Verify that createCompanyHR throws ForbiddenException when user is not a company admin
     * - **Input:**
     *   - HR Data: Valid HR user data
     *   - User: Regular user (not company admin)
     * - **Expected Output:**
     *   - ForbiddenException
     */
    it('TC-AC-036: Not Company Admin: should propagate ForbiddenException when user is not company admin', async () => {
      // Arrange
      const hrData: CreateCompanyHrDto[] = [
        {
          email: 'hr1@example.com',
          firstName: 'HR',
          lastName: 'One',
          password: 'password123'
        }
      ];
      
      const regularUser: User = {
        ...mockUser,
        role: Role.USER
      };
      
      const error = new ForbiddenException();
      companyService.createCompanyHR.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createCompanyHR(hrData, regularUser)).rejects.toThrow(error);
      expect(companyService.createCompanyHR).toHaveBeenCalledWith(hrData, regularUser);
    });

    /**
     * #### TC-AC-037: Invalid HR Data
     * - **Goal:** Verify that createCompanyHR handles invalid HR data
     * - **Input:**
     *   - HR Data:
     *   ```json
     *   [
     *     {
     *       "email": "invalid-email",
     *       "firstName": "",
     *       "lastName": "",
     *       "password": "short"
     *     }
     *   ]
     *   ```
     *   - User: Company admin user
     * - **Expected Output:**
     *   - BadRequestException with message "Validation failed"
     */
    it('TC-AC-037: Invalid HR Data: should propagate BadRequestException for invalid HR data', async () => {
      // Arrange
      const invalidData: CreateCompanyHrDto[] = [
        {
          email: 'invalid-email',
          firstName: '',
          lastName: '',
          password: 'short'
        }
      ];
      
      const error = new BadRequestException('Validation failed');
      companyService.createCompanyHR.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.createCompanyHR(invalidData, mockUser)).rejects.toThrow(error);
      expect(companyService.createCompanyHR).toHaveBeenCalledWith(invalidData, mockUser);
    });

    /**
     * #### TC-AC-038: Empty HR Data Array
     * - **Goal:** Verify that createCompanyHR handles empty HR data array
     * - **Input:**
     *   - HR Data: []
     *   - User: Company admin user
     * - **Expected Output:**
     *   - BadRequestException with message "No HR data provided"
     */
    it('TC-AC-038: Empty HR Data Array: should handle empty HR data array', async () => {
      const error = new BadRequestException('No HR data provided');
      companyService.createCompanyHR.mockRejectedValue(error);
      await expect(controller.createCompanyHR([], mockUser)).rejects.toThrow(error);
      expect(companyService.createCompanyHR).toHaveBeenCalledWith([], mockUser);
    });

    /**
     * #### TC-AC-039: Duplicate Emails
     * - **Goal:** Verify that createCompanyHR handles HR data array with duplicate emails
     * - **Input:**
     *   - HR Data:
     *   ```json
     *   [
     *     {
     *       "email": "dup@example.com",
     *       "firstName": "HR",
     *       "lastName": "One",
     *       "password": "password123"
     *     },
     *     {
     *       "email": "dup@example.com",
     *       "firstName": "HR",
     *       "lastName": "Two",
     *       "password": "password123"
     *     }
     *   ]
     *   ```
     *   - User: Company admin user
     * - **Expected Output:**
     *   - BadRequestException with message "Duplicate email"
     */
    it('TC-AC-039: Duplicate Emails: should handle HR data array with duplicate emails', async () => {
      const hrData = [
        { email: 'dup@example.com', firstName: 'HR', lastName: 'One', password: 'password123' },
        { email: 'dup@example.com', firstName: 'HR', lastName: 'Two', password: 'password123' }
      ];
      const error = new BadRequestException('Duplicate email');
      companyService.createCompanyHR.mockRejectedValue(error);
      await expect(controller.createCompanyHR(hrData, mockUser)).rejects.toThrow(error);
      expect(companyService.createCompanyHR).toHaveBeenCalledWith(hrData, mockUser);
    });

    /**
     * #### TC-AC-040: Invalid Email/Password
     * - **Goal:** Verify that createCompanyHR handles HR data with invalid email/password
     * - **Input:**
     *   - HR Data:
     *   ```json
     *   [
     *     {
     *       "email": "not-an-email",
     *       "firstName": "HR",
     *       "lastName": "One",
     *       "password": "123"
     *     }
     *   ]
     *   ```
     *   - User: Company admin user
     * - **Expected Output:**
     *   - BadRequestException with message "Invalid HR data"
     */
    it('TC-AC-040: Invalid Email/Password: should handle HR data with invalid email/password', async () => {
      const hrData = [
        { email: 'not-an-email', firstName: 'HR', lastName: 'One', password: '123' }
      ];
      const error = new BadRequestException('Invalid HR data');
      companyService.createCompanyHR.mockRejectedValue(error);
      await expect(controller.createCompanyHR(hrData, mockUser)).rejects.toThrow(error);
      expect(companyService.createCompanyHR).toHaveBeenCalledWith(hrData, mockUser);
    });

    /**
     * #### TC-AC-041: Long Names
     * - **Goal:** Verify that createCompanyHR handles HR data with extremely long names
     * - **Input:**
     *   - HR Data:
     *   ```json
     *   [
     *     {
     *       "email": "hrlong@example.com",
     *       "firstName": "A".repeat(1000),
     *       "lastName": "B".repeat(1000),
     *       "password": "password123"
     *     }
     *   ]
     *   ```
     *   - User: Company admin user
     * - **Expected Output:**
     *   - BadRequestException with message "Field too long"
     */
    it('TC-AC-041: Long Names: should handle HR data with extremely long names', async () => {
      const hrData = [
        { email: 'hrlong@example.com', firstName: 'A'.repeat(1000), lastName: 'B'.repeat(1000), password: 'password123' }
      ];
      const error = new BadRequestException('Field too long');
      companyService.createCompanyHR.mockRejectedValue(error);
      await expect(controller.createCompanyHR(hrData, mockUser)).rejects.toThrow(error);
      expect(companyService.createCompanyHR).toHaveBeenCalledWith(hrData, mockUser);
    });
  });

  // Tests for getCompanyHR method
  describe('getCompanyHR', () => {
    /**
     * #### TC-AC-042: Valid User
     * - **Goal:** Verify that getCompanyHR returns HR users for a company admin
     * - **Input:**
     *   - User: Company admin user
     * - **Expected Output:**
     *   - Success response containing array of HR users
     */
    it('TC-AC-042: Valid User: should return success response with HR users for company admin', async () => {
      // Arrange
      companyService.getCompanyHRList.mockResolvedValue(mockHRUsers);

      // Act
      const result = await controller.getCompanyHR(mockUser);

      // Assert
      expect(companyService.getCompanyHRList).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(ResponseDto.successDefault(mockHRUsers));
    });

    /**
     * #### TC-AC-043: Not Company Admin
     * - **Goal:** Verify that getCompanyHR throws ForbiddenException when user is not a company admin
     * - **Input:**
     *   - User: Regular user (not company admin)
     * - **Expected Output:**
     *   - ForbiddenException
     */
    it('TC-AC-043: Not Company Admin: should propagate ForbiddenException when user is not company admin', async () => {
      // Arrange
      const regularUser: User = {
        ...mockUser,
        role: Role.USER
      };
      
      const error = new ForbiddenException();
      companyService.getCompanyHRList.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getCompanyHR(regularUser)).rejects.toThrow(error);
      expect(companyService.getCompanyHRList).toHaveBeenCalledWith(regularUser);
    });

    /**
     * #### TC-AC-044: No HR Users
     * - **Goal:** Verify that getCompanyHR returns empty array when no HR users exist
     * - **Input:**
     *   - User: Company admin user (with no HR users)
     * - **Expected Output:**
     *   - Success response containing empty array
     */
    it('TC-AC-044: No HR Users: should return empty array when no HR users found', async () => {
      // Arrange
      companyService.getCompanyHRList.mockResolvedValue([]);

      // Act
      const result = await controller.getCompanyHR(mockUser);

      // Assert
      expect(companyService.getCompanyHRList).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(ResponseDto.successDefault([]));
    });

    /**
     * #### TC-AC-045: No Company Association
     * - **Goal:** Verify that getCompanyHR handles user not associated with any company
     * - **Input:**
     *   - User: User with companyId: null
     * - **Expected Output:**
     *   - ForbiddenException with message "User not associated with company"
     */
    it('TC-AC-045: No Company Association: should handle user not associated with any company', async () => {
      const user = { ...mockUser, companyId: null };
      const error = new ForbiddenException('User not associated with company');
      companyService.getCompanyHRList.mockRejectedValue(error);
      await expect(controller.getCompanyHR(user)).rejects.toThrow(error);
      expect(companyService.getCompanyHRList).toHaveBeenCalledWith(user);
    });

    /**
     * #### TC-AC-046: Null User
     * - **Goal:** Verify that getCompanyHR handles null user
     * - **Input:**
     *   - User: null
     * - **Expected Output:**
     *   - ForbiddenException with message "User is null"
     */
    it('TC-AC-046: Null User: should handle null user', async () => {
      const error = new ForbiddenException('User is null');
      companyService.getCompanyHRList.mockRejectedValue(error);
      await expect(controller.getCompanyHR(null as any)).rejects.toThrow(error);
      expect(companyService.getCompanyHRList).toHaveBeenCalledWith(null);
    });
  });

  // Tests for deleteCompanyHR method
  describe('deleteCompanyHR', () => {
    /**
     * #### TC-AC-047: Valid ID and User
     * - **Goal:** Verify that deleteCompanyHR successfully deletes an HR user with valid ID
     * - **Input:**
     *   - HR ID: 2
     *   - User: Company admin user
     * - **Expected Output:**
     *   - Success response with no data
     *   - Success message: "Company HR deleted successfully"
     */
    it('TC-AC-047: Valid ID and User: should return success response when HR user deleted successfully', async () => {
      // Arrange
      const hrId = 2;
      companyService.deleteCompanyHR.mockResolvedValue(undefined);

      // Act
      const result = await controller.deleteCompanyHR(hrId, mockUser);

      // Assert
      expect(companyService.deleteCompanyHR).toHaveBeenCalledWith(hrId, mockUser);
      expect(result).toEqual(ResponseDto.successWithoutData(Message.COMPANY_HR_DELETED));
    });

    /**
     * #### TC-AC-048: Not Company Admin
     * - **Goal:** Verify that deleteCompanyHR throws ForbiddenException when user is not a company admin
     * - **Input:**
     *   - HR ID: 2
     *   - User: Regular user (not company admin)
     * - **Expected Output:**
     *   - ForbiddenException
     */
    it('TC-AC-048: Not Company Admin: should propagate ForbiddenException when user is not company admin', async () => {
      // Arrange
      const hrId = 2;
      const regularUser: User = {
        ...mockUser,
        role: Role.USER
      };
      
      const error = new ForbiddenException();
      companyService.deleteCompanyHR.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.deleteCompanyHR(hrId, regularUser)).rejects.toThrow(error);
      expect(companyService.deleteCompanyHR).toHaveBeenCalledWith(hrId, regularUser);
    });

    /**
     * #### TC-AC-049: HR Not Found
     * - **Goal:** Verify that deleteCompanyHR handles HR ID that does not exist
     * - **Input:**
     *   - HR ID: 9999 (non-existent)
     *   - User: Company admin user
     * - **Expected Output:**
     *   - NotFoundException with message "HR not found"
     */
    it('TC-AC-049: HR Not Found: should handle HR ID does not exist', async () => {
      const error = new NotFoundException('HR not found');
      companyService.deleteCompanyHR.mockRejectedValue(error);
      await expect(controller.deleteCompanyHR(9999, mockUser)).rejects.toThrow(error);
      expect(companyService.deleteCompanyHR).toHaveBeenCalledWith(9999, mockUser);
    });

    /**
     * #### TC-AC-050: HR From Another Company
     * - **Goal:** Verify that deleteCompanyHR handles HR ID belonging to another company
     * - **Input:**
     *   - HR ID: 2 (belongs to company 1)
     *   - User: Company admin user (from company 999)
     * - **Expected Output:**
     *   - ForbiddenException with message "HR does not belong to your company"
     */
    it('TC-AC-050: HR From Another Company: should handle HR ID belongs to another company', async () => {
      const error = new ForbiddenException('HR does not belong to your company');
      companyService.deleteCompanyHR.mockRejectedValue(error);
      await expect(controller.deleteCompanyHR(2, { ...mockUser, companyId: 999 })).rejects.toThrow(error);
      expect(companyService.deleteCompanyHR).toHaveBeenCalledWith(2, { ...mockUser, companyId: 999 });
    });

    /**
     * #### TC-AC-051: Invalid HR ID
     * - **Goal:** Verify that deleteCompanyHR handles negative or zero HR ID
     * - **Input:**
     *   - HR ID: 0 or -1
     *   - User: Company admin user
     * - **Expected Output:**
     *   - BadRequestException with message "Invalid HR ID"
     */
    it('TC-AC-051: Invalid HR ID: should handle HR ID is negative or zero', async () => {
      const error = new BadRequestException('Invalid HR ID');
      companyService.deleteCompanyHR.mockRejectedValue(error);
      await expect(controller.deleteCompanyHR(0, mockUser)).rejects.toThrow(error);
      await expect(controller.deleteCompanyHR(-1, mockUser)).rejects.toThrow(error);
      expect(companyService.deleteCompanyHR).toHaveBeenCalledWith(0, mockUser);
      expect(companyService.deleteCompanyHR).toHaveBeenCalledWith(-1, mockUser);
    });
  });
}); 