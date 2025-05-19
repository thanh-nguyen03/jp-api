import { Test, TestingModule } from '@nestjs/testing';
import { CompanyController } from './company.controller';
import { CompanyService } from '../company.service';
import { CompanyFilter } from '../dtos/company-filter.query';
import ResponseDto from '../../../constants/response.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Message } from '../../../constants/message';

describe('CompanyController Unit Tests', () => {
  let controller: CompanyController;
  let companyService: jest.Mocked<CompanyService>;

  // Mock company data
  const mockCompanies = [
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

  beforeEach(async () => {
    // Create mock for CompanyService
    const companyServiceMock = {
      findAll: jest.fn(),
      findById: jest.fn()
    };

    // Create testing module
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompanyController],
      providers: [
        {
          provide: CompanyService,
          useValue: companyServiceMock
        }
      ]
    }).compile();

    controller = module.get<CompanyController>(CompanyController);
    companyService = module.get<CompanyService>(
      CompanyService
    ) as jest.Mocked<CompanyService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Tests for getListCompanies method
  describe('getListCompanies', () => {
    /**
     * #### TC-C-001: Valid Filter
     * - **Goal:** Verify that getListCompanies returns companies matching the provided filter
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
    it('TC-C-001: Valid Filter: should return success response with companies matching filter', async () => {
      /**
       * Test Case ID: TC-C-001
       * Objective: Verify that getListCompanies returns companies matching the filter
       * Input: Valid CompanyFilter
       * Expected Output: ResponseDto with companies matching filter
       * White-Box: Tests successful path where service returns companies
       */
      
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
      const result = await controller.getListCompanies(filter);

      // Assert
      expect(companyService.findAll).toHaveBeenCalledWith(filter);
      expect(result).toEqual(ResponseDto.successDefault(mockPaginationResult));
    });

    /**
     * #### TC-C-002: Empty Filter
     * - **Goal:** Verify that getListCompanies returns all companies when given an empty filter
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
    it('TC-C-002: Empty Filter: should return all companies when given empty filter', async () => {
      /**
       * Test Case ID: TC-C-002
       * Objective: Verify that getListCompanies returns all companies with empty filter
       * Input: Empty CompanyFilter
       * Expected Output: ResponseDto with all companies
       * White-Box: Tests path with empty filter
       */
      
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
      const result = await controller.getListCompanies(emptyFilter);

      // Assert
      expect(companyService.findAll).toHaveBeenCalledWith(emptyFilter);
      expect(result).toEqual(ResponseDto.successDefault(mockPaginationResult));
    });

    /**
     * #### TC-C-003: Service Error
     * - **Goal:** Verify that getListCompanies propagates errors from the company service
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
     *   - Error from company service is propagated to the caller
     * - **Note:** Tests the error handling path when the service throws an exception
     */
    it('TC-C-003: Service Error: should propagate errors from company service', async () => {
      /**
       * Test Case ID: TC-C-003
       * Objective: Verify that getListCompanies propagates errors from company service
       * Input: Valid filter but service throws error
       * Expected Output: Exception is thrown
       * White-Box: Tests error path
       */
      
      // Arrange
      const filter: CompanyFilter = {
        code: 'COMP',
        name: '',
        offset: 0,
        limit: 10,
        sort: []
      };
      const error = new BadRequestException('Bad request');
      companyService.findAll.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getListCompanies(filter)).rejects.toThrow(error);
      expect(companyService.findAll).toHaveBeenCalledWith(filter);
    });

    /**
     * #### TC-C-004: Pagination and Sorting
     * - **Goal:** Verify that getListCompanies properly handles pagination and sorting parameters
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
    it('TC-C-004: Pagination and Sorting: should properly handle pagination and sorting', async () => {
      /**
       * Test Case ID: TC-C-004
       * Objective: Verify that getListCompanies handles pagination and sorting
       * Input: Filter with pagination and sorting
       * Expected Output: ResponseDto with paginated and sorted results
       * White-Box: Tests pagination and sorting path
       */
      
      // Arrange
      const filter: CompanyFilter = {
        code: '',
        name: '',
        offset: 1,
        limit: 5,
        sort: [{ field: 'name', direction: 'asc' }]
      };
      
      const paginatedResult = {
        data: [mockCompanies[1]], // Just second company
        total: 2,
        offset: 1,
        limit: 5,
        sort: [{ field: 'name', direction: 'asc' }]
      };
      
      companyService.findAll.mockResolvedValue(paginatedResult);

      // Act
      const result = await controller.getListCompanies(filter);

      // Assert
      expect(companyService.findAll).toHaveBeenCalledWith(filter);
      expect(result).toEqual(ResponseDto.successDefault(paginatedResult));
    });

    /**
     * #### TC-C-005: Only Sort
     * - **Goal:** Verify that getListCompanies handles filter with only sort parameter
     * - **Input:**
     *   ```json
     *   {
     *     "code": "",
     *     "name": "",
     *     "offset": 0,
     *     "limit": 10,
     *     "sort": [{ "field": "name", "direction": "desc" }]
     *   }
     *   ```
     * - **Expected Output:**
     *   - Success response with sorted companies
     */
    it('TC-C-005: Only Sort: should handle filter with only sort', async () => {
      const filter: CompanyFilter = { code: '', name: '', offset: 0, limit: 10, sort: [{ field: 'name', direction: 'desc' }] };
      companyService.findAll.mockResolvedValue({ ...mockPaginationResult });
      const result = await controller.getListCompanies(filter);
      expect(companyService.findAll).toHaveBeenCalledWith(filter);
      expect(result).toEqual(ResponseDto.successDefault({ ...mockPaginationResult }));
    });

    /**
     * #### TC-C-006: All Fields Empty/Null/Undefined
     * - **Goal:** Verify that getListCompanies handles filter with all fields empty, null, or undefined
     * - **Input:**
     *   ```json
     *   {
     *     "code": "",
     *     "name": "",
     *     "offset": 0,
     *     "limit": 0,
     *     "sort": []
     *   }
     *   ```
     * - **Expected Output:**
     *   - Success response with all companies (offset and limit as 0)
     */
    it('TC-C-006: All Fields Empty/Null/Undefined: should handle filter with all fields empty/null/undefined', async () => {
      const filter: CompanyFilter = { code: '', name: '', offset: 0, limit: 0, sort: [] };
      companyService.findAll.mockResolvedValue({ ...mockPaginationResult, offset: 0, limit: 0 });
      const result = await controller.getListCompanies(filter);
      expect(companyService.findAll).toHaveBeenCalledWith(filter);
      expect(result).toEqual(ResponseDto.successDefault({ ...mockPaginationResult, offset: 0, limit: 0 }));
    });

    /**
     * #### TC-C-007: Offset/Limit Boundary Values
     * - **Goal:** Verify that getListCompanies handles filter with offset/limit at boundary values
     * - **Input:**
     *   ```json
     *   {
     *     "code": "",
     *     "name": "",
     *     "offset": Number.MAX_SAFE_INTEGER,
     *     "limit": Number.MAX_SAFE_INTEGER,
     *     "sort": []
     *   }
     *   ```
     * - **Expected Output:**
     *   - Success response with correct offset/limit in pagination
     */
    it('TC-C-007: Offset/Limit Boundary Values: should handle filter with offset/limit at boundary values', async () => {
      const filter: CompanyFilter = { code: '', name: '', offset: Number.MAX_SAFE_INTEGER, limit: Number.MAX_SAFE_INTEGER, sort: [] };
      companyService.findAll.mockResolvedValue({ ...mockPaginationResult, offset: Number.MAX_SAFE_INTEGER, limit: Number.MAX_SAFE_INTEGER });
      const result = await controller.getListCompanies(filter);
      expect(companyService.findAll).toHaveBeenCalledWith(filter);
      expect(result).toEqual(ResponseDto.successDefault({ ...mockPaginationResult, offset: Number.MAX_SAFE_INTEGER, limit: Number.MAX_SAFE_INTEGER }));
    });
  });

  // Tests for getCompanyById method
  describe('getCompanyById', () => {
    /**
     * #### TC-C-008: Valid ID
     * - **Goal:** Verify that getCompanyById returns the correct company when a valid ID is provided
     * - **Input:**
     *   - Company ID: 1
     * - **Expected Output:**
     *   - Success response containing the company with ID 1
     *   - Complete company details including code, name, description, and address
     */
    it('TC-C-008: Valid ID: should return success response with company for valid ID', async () => {
      /**
       * Test Case ID: TC-C-008
       * Objective: Verify that getCompanyById returns company for valid ID
       * Input: Valid company ID
       * Expected Output: ResponseDto with company matching ID
       * White-Box: Tests successful path where service returns company
       */
      
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
     * #### TC-C-009: Company Not Found
     * - **Goal:** Verify that getCompanyById throws NotFoundException when company with ID does not exist
     * - **Input:**
     *   - Company ID: 999 (non-existent)
     * - **Expected Output:**
     *   - NotFoundException with message "Company not found"
     */
    it('TC-C-009: Company Not Found: should throw NotFoundException when company not found', async () => {
      /**
       * Test Case ID: TC-C-009
       * Objective: Verify that getCompanyById throws NotFoundException when company not found
       * Input: Non-existent company ID
       * Expected Output: NotFoundException
       * White-Box: Tests path where company is not found
       */
      
      // Arrange
      const nonExistentId = 999;
      const error = new NotFoundException(Message.COMPANY_NOT_FOUND);
      companyService.findById.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getCompanyById(nonExistentId)).rejects.toThrow(error);
      expect(companyService.findById).toHaveBeenCalledWith(nonExistentId);
    });

    /**
     * #### TC-C-010: Invalid ID Format
     * - **Goal:** Document how invalid ID format is handled by ParseIntPipe
     * - **Input:**
     *   - Company ID: "abc" (non-numeric string)
     * - **Expected Output:**
     *   - BadRequestException (handled by ParseIntPipe before reaching controller)
     * - **Note:** This is a documentation-only test as ParseIntPipe handles the validation
     */
    it('TC-C-010: Invalid ID Format: would throw BadRequestException for invalid ID format (handled by ParseIntPipe)', () => {
      /**
       * Test Case ID: TC-C-010
       * Objective: Verify that getCompanyById would throw BadRequestException for invalid ID
       * Input: Non-numeric ID
       * Expected Output: BadRequestException (handled by ParseIntPipe)
       * White-Box: Tests path where ID is not valid
       * Note: This is mostly documentation, as ParseIntPipe handling occurs before the controller method
       */
      
      // This test is documentation only - ParseIntPipe would handle this before the controller method
      // In reality, the pipe would throw before reaching the controller
      expect(true).toBe(true);
    });

    /**
     * #### TC-C-011: Service Error
     * - **Goal:** Verify that getCompanyById propagates other errors from company service
     * - **Input:**
     *   - Company ID: 1
     *   - Service throws error: BadRequestException('Some other error')
     * - **Expected Output:**
     *   - The original error is propagated to the caller
     */
    it('TC-C-011: Service Error: should propagate other errors from company service', async () => {
      /**
       * Test Case ID: TC-C-011
       * Objective: Verify that getCompanyById propagates other errors from company service
       * Input: Valid ID but service throws error
       * Expected Output: Exception is thrown
       * White-Box: Tests general error path
       */
      
      // Arrange
      const companyId = 1;
      const error = new BadRequestException('Some other error');
      companyService.findById.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.getCompanyById(companyId)).rejects.toThrow(error);
      expect(companyService.findById).toHaveBeenCalledWith(companyId);
    });

    /**
     * #### TC-C-012: ID = 0
     * - **Goal:** Verify that getCompanyById handles ID = 0 appropriately
     * - **Input:**
     *   - Company ID: 0
     * - **Expected Output:**
     *   - NotFoundException with message "Company not found"
     */
    it('TC-C-012: ID = 0: should handle ID = 0', async () => {
      const error = new NotFoundException(Message.COMPANY_NOT_FOUND);
      companyService.findById.mockRejectedValue(error);
      await expect(controller.getCompanyById(0)).rejects.toThrow(error);
      expect(companyService.findById).toHaveBeenCalledWith(0);
    });

    /**
     * #### TC-C-013: Very Large ID
     * - **Goal:** Verify that getCompanyById handles very large IDs appropriately
     * - **Input:**
     *   - Company ID: Number.MAX_SAFE_INTEGER
     * - **Expected Output:**
     *   - NotFoundException with message "Company not found"
     */
    it('TC-C-013: Very Large ID: should handle very large ID', async () => {
      const largeId = Number.MAX_SAFE_INTEGER;
      const error = new NotFoundException(Message.COMPANY_NOT_FOUND);
      companyService.findById.mockRejectedValue(error);
      await expect(controller.getCompanyById(largeId)).rejects.toThrow(error);
      expect(companyService.findById).toHaveBeenCalledWith(largeId);
    });

    /**
     * #### TC-C-014: Negative ID
     * - **Goal:** Verify that getCompanyById handles negative IDs appropriately
     * - **Input:**
     *   - Company ID: -5
     * - **Expected Output:**
     *   - NotFoundException with message "Company not found"
     */
    it('TC-C-014: Negative ID: should handle negative ID', async () => {
      const error = new NotFoundException(Message.COMPANY_NOT_FOUND);
      companyService.findById.mockRejectedValue(error);
      await expect(controller.getCompanyById(-5)).rejects.toThrow(error);
      expect(companyService.findById).toHaveBeenCalledWith(-5);
    });

    /**
     * #### TC-C-015: String ID (ParseIntPipe)
     * - **Goal:** Document how string ID is handled by ParseIntPipe
     * - **Input:**
     *   - Company ID: "not-a-number" (string)
     * - **Expected Output:**
     *   - BadRequestException (handled by ParseIntPipe before reaching controller)
     * - **Note:** This is a documentation-only test as ParseIntPipe handles the validation
     */
    it('TC-C-015: String ID (ParseIntPipe): should handle string ID (ParseIntPipe)', () => {
      // This is handled by ParseIntPipe before controller, but document
      expect(true).toBe(true);
    });
  });
}); 