import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, ForbiddenException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ManageRecruitmentCompanyController } from './manage-recruitment-company.controller';
import { RecruitmentService } from '../recruitment.service';
import { ApplicationService } from '../../applications/application.service';
import { RecruitmentDto } from '../dtos/recruitment.dto';
import { RecruitmentFilter } from '../dtos/recruitment-filter.dto';
import ResponseDto from '../../../constants/response.dto';
import { User, $Enums } from '@prisma/client';
import { Message } from '../../../constants/message';
import { RoleGuard } from '../../auth/guards/role.guard';
import { Reflector } from '@nestjs/core';

describe('ManageRecruitmentCompanyController', () => {
  let app: INestApplication;
  let recruitmentService: jest.Mocked<RecruitmentService>;
  let applicationService: jest.Mocked<ApplicationService>;

  const mockUser: User = {
    id: 1,
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    password: 'hashed',
    displayName: 'Admin User',
    avatar: 'avatar.png',
    role: 'COMPANY_ADMIN' as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    companyId: 10,
  };

  const mockRecruitment: RecruitmentDto = {
    id: 1,
    title: 'Admin Recruitment',
    content: 'desc',
    jobType: 'FULL_TIME',
    minSalary: 1000,
    maxSalary: 2000,
    experience: 2,
    deadline: new Date(),
    companyId: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRecruitmentPage = {
    data: [mockRecruitment],
    total: 1,
    offset: 0,
    limit: 10,
  };

  beforeEach(async () => {
    const recruitmentServiceMock = {
      findAll: jest.fn(),
      findById: jest.fn(),
      createRecruitment: jest.fn(),
      updateRecruitment: jest.fn(),
      deleteRecruitment: jest.fn(),
    } as any;
    const applicationServiceMock = {
      findByRecruitment: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManageRecruitmentCompanyController],
      providers: [
        { provide: RecruitmentService, useValue: recruitmentServiceMock },
        { provide: ApplicationService, useValue: applicationServiceMock },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    // Middleware to set request.user from x-current-user header
    app.use((req, res, next) => {
      const userData = req.headers['x-current-user']
        ? JSON.parse(req.headers['x-current-user'])
        : null;
      req.user = userData
        ? { ...userData, createdAt: new Date(userData.createdAt), updatedAt: new Date(userData.updatedAt) }
        : null;
      next();
    });
    recruitmentService = module.get(RecruitmentService);
    applicationService = module.get(ApplicationService);

    // Apply RoleGuard globally
    app.useGlobalGuards(new RoleGuard(app.get(Reflector)));

    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  // --- GET /admin/recruitments ---
  describe('GET /admin/recruitments', () => {
    /**
     * #### TC-MRC-001: Success
     * - **Goal:** Should return a list of recruitments for the company when a valid user and filter are provided
     * - **Input:**
     *   - User: { role: 'COMPANY_ADMIN', companyId: 10, ... }
     *   - Filter:
     *     ```json
     *     { "title": "", "jobType": null, "minSalary": 0, "maxSalary": 0, "experience": 0, "limit": 10, "offset": 0, "sort": [] }
     *     ```
     * - **Expected Output:**
     *   - Status code: 200 OK
     *   - Response contains a list of recruitments for the user's company
     *   - ResponseDto.successDefault with correct pagination and data
     */
    it('TC-MRC-001: Success: should return recruitments for company', async () => {
      recruitmentService.findAll.mockResolvedValue(mockRecruitmentPage);
      const filter: RecruitmentFilter = { title: '', jobType: undefined, minSalary: 0, maxSalary: 0, experience: 0, limit: 10, offset: 0, sort: [] };
      const response = await request(app.getHttpServer())
        .get('/admin/recruitments')
        .set('x-current-user', JSON.stringify(mockUser))
        .query(filter)
        .expect(200);
      console.log('[TEST]', 'TC-MRC-001: Success - Returns recruitments for company');
      console.log('Input:', { filter, user: mockUser });
      console.log('Expected Output:', ResponseDto.successDefault(mockRecruitmentPage));
      console.log('Actual Output:', response.body);
      const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault(mockRecruitmentPage)));
      expect(response.body).toEqual(expected);
    });

    /**
     * #### TC-MRC-002: Pagination
     * - **Goal:** Should return paginated recruitments for the company
     * - **Input:**
     *   - User: { role: 'COMPANY_ADMIN', companyId: 10, ... }
     *   - Filter:
     *     ```json
     *     { "limit": 1, "offset": 10, ... }
     *     ```
     * - **Expected Output:**
     *   - Status code: 200 OK
     *   - Response contains paginated recruitments
     */
    it('TC-MRC-002: Pagination: should return paginated recruitments for company', async () => {
      const paginatedPage = {
        data: [mockRecruitment],
        total: 5,
        offset: 10,
        limit: 1,
      };
      recruitmentService.findAll.mockResolvedValue(paginatedPage);
      const filter: RecruitmentFilter = { title: '', jobType: undefined, minSalary: 0, maxSalary: 0, experience: 0, limit: 1, offset: 10, sort: [] };
      const response = await request(app.getHttpServer())
        .get('/admin/recruitments')
        .set('x-current-user', JSON.stringify(mockUser))
        .query(filter)
        .expect(200);
      console.log('[TEST]', 'TC-MRC-002: Pagination - Returns paginated recruitments for company');
      console.log('Input:', { filter, user: mockUser });
      console.log('Expected Output:', ResponseDto.successDefault(paginatedPage));
      console.log('Actual Output:', response.body);
      const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault(paginatedPage)));
      expect(response.body).toEqual(expected);
    });

    /**
     * #### TC-MRC-003: Filter
     * - **Goal:** Should return filtered recruitments for the company
     * - **Input:**
     *   - User: { role: 'COMPANY_ADMIN', companyId: 10, ... }
     *   - Filter:
     *     ```json
     *     { "title": "Filtered Title", "jobType": "PART_TIME", ... }
     *     ```
     * - **Expected Output:**
     *   - Status code: 200 OK
     *   - Response contains filtered recruitments
     */
    it('TC-MRC-003: Filter: should return filtered recruitments for company', async () => {
      const filteredRecruitment = { ...mockRecruitment, id: 2, title: 'Filtered Title', jobType: $Enums.JobType.PART_TIME };
      const filteredPage = {
        data: [filteredRecruitment],
        total: 1,
        offset: 0,
        limit: 10,
      };
      recruitmentService.findAll.mockResolvedValue(filteredPage);
      const filter: RecruitmentFilter = { title: 'Filtered Title', jobType: 'PART_TIME', minSalary: 0, maxSalary: 0, experience: 0, limit: 10, offset: 0, sort: [] };
      const response = await request(app.getHttpServer())
        .get('/admin/recruitments')
        .set('x-current-user', JSON.stringify(mockUser))
        .query(filter)
        .expect(200);
      console.log('[TEST]', 'TC-MRC-003: Filter - Returns filtered recruitments for company');
      console.log('Input:', { filter, user: mockUser });
      console.log('Expected Output:', ResponseDto.successDefault(filteredPage));
      console.log('Actual Output:', response.body);
      const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault(filteredPage)));
      expect(response.body).toEqual(expected);
    });

    /**
     * #### TC-MRC-004: Forbidden - No companyId on user
     * - **Goal:** Should return 403 Forbidden if user has no companyId
     * - **Input:**
     *   - User: { ...companyId: null }
     *   - Filter: valid
     * - **Expected Output:**
     *   - Status code: 403 Forbidden
     */
    it('TC-MRC-004: Forbidden: should return 403 if no companyId on user', async () => {
      const user = { ...mockUser, companyId: null };
      const filter: RecruitmentFilter = { title: '', jobType: undefined, minSalary: 0, maxSalary: 0, experience: 0, limit: 10, offset: 0, sort: [] };
      const response = await request(app.getHttpServer())
        .get('/admin/recruitments')
        .set('x-current-user', JSON.stringify(user))
        .query(filter)
        .expect(403);
      console.log('[TEST]', 'TC-MRC-004: Forbidden - No companyId on user');
      console.log('Input:', { filter, user });
      console.log('Expected Output:', '403 Forbidden');
      console.log('Actual Output:', response.body);
    });

    /**
     * #### TC-MRC-005: Edge - Large companyId
     * - **Goal:** Should return 200 OK with empty data for large companyId
     * - **Input:**
     *   - User: { ...companyId: 1e9 }
     *   - Filter: valid
     * - **Expected Output:**
     *   - Status code: 200 OK
     *   - Empty data array
     */
    it('TC-MRC-005: Edge Large companyId: should return 200 with empty data for large companyId', async () => {
      const user = { ...mockUser, companyId: 1e9 };
      recruitmentService.findAll.mockResolvedValue({ data: [], total: 0, offset: 0, limit: 10 });
      const filter: RecruitmentFilter = { title: '', jobType: undefined, minSalary: 0, maxSalary: 0, experience: 0, limit: 10, offset: 0, sort: [] };
      const response = await request(app.getHttpServer())
        .get('/admin/recruitments')
        .set('x-current-user', JSON.stringify(user))
        .query(filter)
        .expect(200);
      console.log('[TEST]', 'TC-MRC-005: Edge - Large companyId');
      console.log('Input:', { filter, user });
      console.log('Expected Output:', '200 OK');
      console.log('Actual Output:', response.body);
    });

    /**
     * #### TC-MRC-006: Edge - Negative companyId
     * - **Goal:** Should return 200 OK with empty data for negative companyId
     * - **Input:**
     *   - User: { ...companyId: -1 }
     *   - Filter: valid
     * - **Expected Output:**
     *   - Status code: 200 OK
     *   - Empty data array
     */
    it('TC-MRC-006: Edge Negative companyId: should return 200 with empty data for negative companyId', async () => {
      const user = { ...mockUser, companyId: -1 };
      recruitmentService.findAll.mockResolvedValue({ data: [], total: 0, offset: 0, limit: 10 });
      const filter: RecruitmentFilter = { title: '', jobType: undefined, minSalary: 0, maxSalary: 0, experience: 0, limit: 10, offset: 0, sort: [] };
      const response = await request(app.getHttpServer())
        .get('/admin/recruitments')
        .set('x-current-user', JSON.stringify(user))
        .query(filter)
        .expect(200);
      console.log('[TEST]', 'TC-MRC-006: Edge - Negative companyId');
      console.log('Input:', { filter, user });
      console.log('Expected Output:', '200 OK');
      console.log('Actual Output:', response.body);
    });

    /**
     * #### TC-MRC-007: Edge - Zero companyId
     * - **Goal:** Should return 403 Forbidden for zero companyId
     * - **Input:**
     *   - User: { ...companyId: 0 }
     *   - Filter: valid
     * - **Expected Output:**
     *   - Status code: 403 Forbidden
     */
    it('TC-MRC-007: Edge Zero companyId: should return 403 for zero companyId', async () => {
      const user = { ...mockUser, companyId: 0 };
      recruitmentService.findAll.mockResolvedValue({ data: [], total: 0, offset: 0, limit: 10 });
      const filter: RecruitmentFilter = { title: '', jobType: undefined, minSalary: 0, maxSalary: 0, experience: 0, limit: 10, offset: 0, sort: [] };
      const response = await request(app.getHttpServer())
        .get('/admin/recruitments')
        .set('x-current-user', JSON.stringify(user))
        .query(filter)
        .expect(403);
      console.log('[TEST]', 'TC-MRC-007: Edge - Zero companyId');
      console.log('Input:', { filter, user });
      console.log('Expected Output:', '403 Forbidden');
      console.log('Actual Output:', response.body);
    });

    /**
     * #### TC-MRC-008: Edge - Undefined companyId
     * - **Goal:** Should return 403 Forbidden for undefined companyId
     * - **Input:**
     *   - User: { ...companyId: undefined }
     *   - Filter: valid
     * - **Expected Output:**
     *   - Status code: 403 Forbidden
     */
    it('TC-MRC-008: Edge Undefined companyId: should return 403 for undefined companyId', async () => {
      const user = { ...mockUser, companyId: undefined };
      recruitmentService.findAll.mockResolvedValue({ data: [], total: 0, offset: 0, limit: 10 });
      const filter: RecruitmentFilter = { title: '', jobType: undefined, minSalary: 0, maxSalary: 0, experience: 0, limit: 10, offset: 0, sort: [] };
      const response = await request(app.getHttpServer())
        .get('/admin/recruitments')
        .set('x-current-user', JSON.stringify(user))
        .query(filter)
        .expect(403);
      console.log('[TEST]', 'TC-MRC-008: Edge - Undefined companyId');
      console.log('Input:', { filter, user });
      console.log('Expected Output:', '403 Forbidden');
      console.log('Actual Output:', response.body);
    });

    /**
     * #### TC-MRC-009: Edge - Float companyId
     * - **Goal:** Should return 200 OK with empty data for float companyId
     * - **Input:**
     *   - User: { ...companyId: 1.5 }
     *   - Filter: valid
     * - **Expected Output:**
     *   - Status code: 200 OK
     *   - Empty data array
     */
    it('TC-MRC-009: Edge Float companyId: should return 200 with empty data for float companyId', async () => {
      const user = { ...mockUser, companyId: 1.5 };
      recruitmentService.findAll.mockResolvedValue({ data: [], total: 0, offset: 0, limit: 10 });
      const filter: RecruitmentFilter = { title: '', jobType: undefined, minSalary: 0, maxSalary: 0, experience: 0, limit: 10, offset: 0, sort: [] };
      const response = await request(app.getHttpServer())
        .get('/admin/recruitments')
        .set('x-current-user', JSON.stringify(user))
        .query(filter)
        .expect(200);
      console.log('[TEST]', 'TC-MRC-009: Edge - Float companyId');
      console.log('Input:', { filter, user });
      console.log('Expected Output:', '200 OK');
      console.log('Actual Output:', response.body);
    });
  });

  // --- GET /admin/recruitments/:id ---
  describe('GET /admin/recruitments/:id', () => {
    /**
     * #### TC-MRC-010: Success
     * - **Goal:** Should return recruitment detail for the company when a valid user and recruitment ID are provided
     * - **Input:**
     *   - User: { role: 'COMPANY_ADMIN', companyId: 10, ... }
     *   - Recruitment ID: 1
     * - **Expected Output:**
     *   - Status code: 200 OK
     *   - Response contains recruitment detail for the user's company
     *   - ResponseDto.successDefault with correct data
     */
    it('TC-MRC-010: Success: should return recruitment detail for company', async () => {
      recruitmentService.findById.mockResolvedValue(mockRecruitment);
      const response = await request(app.getHttpServer())
        .get('/admin/recruitments/1')
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(200);
      console.log('[TEST]', 'TC-MRC-010: Success - Returns recruitment detail for company');
      console.log('Input:', { id: 1, user: mockUser });
      console.log('Expected Output:', ResponseDto.successDefault(mockRecruitment));
      console.log('Actual Output:', response.body);
      const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault(mockRecruitment)));
      expect(response.body).toEqual(expected);
    });

    /**
     * #### TC-MRC-011: Forbidden - Recruitment not in user company
     * - **Goal:** Should return 403 Forbidden if recruitment does not belong to user's company
     * - **Input:**
     *   - User: { role: 'COMPANY_ADMIN', companyId: 10, ... }
     *   - Recruitment ID: 1 (companyId: 999)
     * - **Expected Output:**
     *   - Status code: 403 Forbidden
     */
    it('TC-MRC-011: Forbidden: should return 403 if recruitment not in user company', async () => {
      recruitmentService.findById.mockResolvedValue({ ...mockRecruitment, companyId: 999 });
      const response = await request(app.getHttpServer())
        .get('/admin/recruitments/1')
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(403);
      console.log('[TEST]', 'TC-MRC-011: Forbidden - Recruitment not in user company');
      console.log('Input:', { id: 1, user: mockUser });
      console.log('Expected Output:', '403 Forbidden');
      console.log('Actual Output:', response.body);
    });

    /**
     * #### TC-MRC-012: Not Found - Recruitment not found
     * - **Goal:** Should return 404 Not Found if recruitment does not exist
     * - **Input:**
     *   - User: { role: 'COMPANY_ADMIN', companyId: 10, ... }
     *   - Recruitment ID: 999 (non-existent)
     * - **Expected Output:**
     *   - Status code: 404 Not Found
     */
    it('TC-MRC-012: Not Found: should return 404 if recruitment not found', async () => {
      recruitmentService.findById.mockRejectedValue(new NotFoundException('Not found'));
      const response = await request(app.getHttpServer())
        .get('/admin/recruitments/999')
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(404);
      console.log('[TEST]', 'TC-MRC-012: Not Found - Recruitment not found');
      console.log('Input:', { id: 999, user: mockUser });
      console.log('Expected Output:', '404 Not Found');
      console.log('Actual Output:', response.body);
    });

    /**
     * #### TC-MRC-013: Invalid Input - Non-numeric id
     * - **Goal:** Should return 400 Bad Request for non-numeric recruitment ID
     * - **Input:**
     *   - Recruitment ID: 'abc'
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-013: Invalid Input Non-numeric id: should return 400 for non-numeric id', async () => {
      const id = 'abc';
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .get(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-013: Invalid Input - Non-numeric id', id);
      console.log('Input:', { id, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-014: Invalid Input - Float id
     * - **Goal:** Should return 400 Bad Request for float recruitment ID
     * - **Input:**
     *   - Recruitment ID: 1.5
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-014: Invalid Input Float id: should return 400 for float id', async () => {
      const id = 1.5;
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .get(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-014: Invalid Input - Float id', id);
      console.log('Input:', { id, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-015: Invalid Input - Negative id
     * - **Goal:** Should return 400 Bad Request for negative recruitment ID
     * - **Input:**
     *   - Recruitment ID: -1
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-015: Invalid Input Negative id: should return 400 for negative id', async () => {
      const id = -1;
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .get(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-015: Invalid Input - Negative id', id);
      console.log('Input:', { id, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-016: Invalid Input - Zero id
     * - **Goal:** Should return 400 Bad Request for zero recruitment ID
     * - **Input:**
     *   - Recruitment ID: 0
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-016: Invalid Input Zero id: should return 400 for zero id', async () => {
      const id = 0;
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .get(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-016: Invalid Input - Zero id', id);
      console.log('Input:', { id, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-017: Invalid Input - Null id
     * - **Goal:** Should return 400 Bad Request for null recruitment ID
     * - **Input:**
     *   - Recruitment ID: null
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-017: Invalid Input Null id: should return 400 for null id', async () => {
      const id = null;
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .get(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-017: Invalid Input - Null id', id);
      console.log('Input:', { id, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-018: Invalid Input - Undefined id
     * - **Goal:** Should return 400 Bad Request for undefined recruitment ID
     * - **Input:**
     *   - Recruitment ID: undefined
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-018: Invalid Input Undefined id: should return 400 for undefined id', async () => {
      const id = undefined;
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .get(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-018: Invalid Input - Undefined id', id);
      console.log('Input:', { id, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-019: Invalid Input - Special char id
     * - **Goal:** Should return 400 Bad Request for special character recruitment ID
     * - **Input:**
     *   - Recruitment ID: '@!#'
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-019: Invalid Input Special char id: should return 400 for special char id', async () => {
      const id = '@!#';
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .get(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-019: Invalid Input - Special char id', id);
      console.log('Input:', { id, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
  });

  // --- POST /admin/recruitments ---
  describe('POST /admin/recruitments', () => {
    /**
     * #### TC-MRC-020: Success
     * - **Goal:** Should create a recruitment when valid data and user are provided
     * - **Input:**
     *   - User: { role: 'COMPANY_ADMIN', companyId: 10, ... }
     *   - Body: valid recruitment data
     * - **Expected Output:**
     *   - Status code: 201 Created
     *   - Response contains created recruitment
     *   - ResponseDto.successDefault with correct data
     */
    it('TC-MRC-020: Success: should create recruitment', async () => {
      recruitmentService.createRecruitment.mockResolvedValue(mockRecruitment);
      const response = await request(app.getHttpServer())
        .post('/admin/recruitments')
        .set('x-current-user', JSON.stringify(mockUser))
        .send(mockRecruitment)
        .expect(201);
      console.log('[TEST]', 'TC-MRC-020: Success - Create recruitment');
      console.log('Input:', { body: mockRecruitment, user: mockUser });
      console.log('Expected Output:', ResponseDto.successDefault(mockRecruitment));
      console.log('Actual Output:', response.body);
      const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault(mockRecruitment)));
      expect(response.body).toEqual(expected);
    });

    /**
     * #### TC-MRC-021: Forbidden - User with wrong role
     * - **Goal:** Should return 403 Forbidden for user with wrong role
     * - **Input:**
     *   - User: { role: 'USER', ... }
     *   - Body: valid recruitment data
     * - **Expected Output:**
     *   - Status code: 403 Forbidden
     */
    it('TC-MRC-021: Forbidden: should return 403 for user with wrong role', async () => {
      const user = { ...mockUser, role: $Enums.Role.USER };
      const response = await request(app.getHttpServer())
        .post('/admin/recruitments')
        .set('x-current-user', JSON.stringify(user))
        .send(mockRecruitment)
        .expect(403);
      console.log('[TEST]', 'TC-MRC-021: Forbidden - User with wrong role');
      console.log('Input:', { body: mockRecruitment, user });
      console.log('Expected Output:', '403 Forbidden');
      console.log('Actual Output:', response.body);
    });

    /**
     * #### TC-MRC-022: Invalid Input - Missing/invalid body fields
     * - **Goal:** Should return 400 Bad Request for missing or invalid body fields
     * - **Input:**
     *   - User: { role: 'COMPANY_ADMIN', companyId: 10, ... }
     *   - Body: invalid recruitment data (e.g., missing fields, invalid types)
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-022: Invalid Input: should return 400 for missing/invalid body fields', async () => {
      const invalidBodies = [
        {},
        { title: '' },
        { minSalary: 'not-a-number' },
        { jobType: 'INVALID' },
      ];
      for (const body of invalidBodies) {
        const response = await request(app.getHttpServer())
          .post('/admin/recruitments')
          .set('x-current-user', JSON.stringify(mockUser))
          .send(body)
          .expect(400);
        console.log('[TEST]', 'TC-MRC-022: Invalid Input - Missing/invalid body fields', body);
        console.log('Input:', { body, user: mockUser });
        console.log('Expected Output:', '400 Bad Request');
        console.log('Actual Output:', response.body);
      }
    });
  });

  // --- PUT /admin/recruitments/:id ---
  describe('PUT /admin/recruitments/:id', () => {
    /**
     * #### TC-MRC-023: Success
     * - **Goal:** Should update a recruitment when valid data and user are provided
     * - **Input:**
     *   - User: { role: 'COMPANY_ADMIN', companyId: 10, ... }
     *   - Recruitment ID: 1
     *   - Body: valid recruitment data
     * - **Expected Output:**
     *   - Status code: 200 OK
     *   - Response contains updated recruitment
     *   - ResponseDto.successDefault with correct data
     */
    it('TC-MRC-023: Success: should update recruitment', async () => {
      recruitmentService.updateRecruitment.mockResolvedValue(mockRecruitment);
      const response = await request(app.getHttpServer())
        .put('/admin/recruitments/1')
        .set('x-current-user', JSON.stringify(mockUser))
        .send(mockRecruitment)
        .expect(200);
      console.log('[TEST]', 'TC-MRC-023: Success - Update recruitment');
      console.log('Input:', { id: 1, body: mockRecruitment, user: mockUser });
      console.log('Expected Output:', ResponseDto.successDefault(mockRecruitment));
      console.log('Actual Output:', response.body);
      const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault(mockRecruitment)));
      expect(response.body).toEqual(expected);
    });

    /**
     * #### TC-MRC-024: Forbidden - User with wrong role
     * - **Goal:** Should return 403 Forbidden for user with wrong role
     * - **Input:**
     *   - User: { role: 'USER', ... }
     *   - Recruitment ID: 1
     *   - Body: valid recruitment data
     * - **Expected Output:**
     *   - Status code: 403 Forbidden
     */
    it('TC-MRC-024: Forbidden: should return 403 for user with wrong role', async () => {
      const user = { ...mockUser, role: $Enums.Role.USER };
      const response = await request(app.getHttpServer())
        .put('/admin/recruitments/1')
        .set('x-current-user', JSON.stringify(user))
        .send(mockRecruitment)
        .expect(403);
      console.log('[TEST]', 'TC-MRC-024: Forbidden - User with wrong role');
      console.log('Input:', { id: 1, body: mockRecruitment, user });
      console.log('Expected Output:', '403 Forbidden');
      console.log('Actual Output:', response.body);
    });

    /**
     * #### TC-MRC-025: Not Found - Recruitment not found
     * - **Goal:** Should return 404 Not Found if recruitment does not exist
     * - **Input:**
     *   - User: { role: 'COMPANY_ADMIN', companyId: 10, ... }
     *   - Recruitment ID: 999 (non-existent)
     *   - Body: valid recruitment data
     * - **Expected Output:**
     *   - Status code: 404 Not Found
     */
    it('TC-MRC-025: Not Found: should return 404 if recruitment not found', async () => {
      recruitmentService.updateRecruitment.mockRejectedValue(new NotFoundException('Not found'));
      const response = await request(app.getHttpServer())
        .put('/admin/recruitments/999')
        .set('x-current-user', JSON.stringify(mockUser))
        .send(mockRecruitment)
        .expect(404);
      console.log('[TEST]', 'TC-MRC-025: Not Found - Recruitment not found');
      console.log('Input:', { id: 999, body: mockRecruitment, user: mockUser });
      console.log('Expected Output:', '404 Not Found');
      console.log('Actual Output:', response.body);
    });

    /**
     * #### TC-MRC-026: Invalid Input - Non-numeric id
     * - **Goal:** Should return 400 Bad Request for non-numeric recruitment ID
     * - **Input:**
     *   - Recruitment ID: 'abc'
     *   - Body: valid recruitment data
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-026: Invalid Input Non-numeric id: should return 400 for non-numeric id', async () => {
      const id = 'abc';
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .put(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .send(mockRecruitment)
        .expect(400);
      console.log('[TEST]', 'TC-MRC-026: Invalid Input - Non-numeric id', id);
      console.log('Input:', { id, body: mockRecruitment, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-027: Invalid Input - Float id
     * - **Goal:** Should return 400 Bad Request for float recruitment ID
     * - **Input:**
     *   - Recruitment ID: 1.5
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-027: Invalid Input Float id: should return 400 for float id', async () => {
      const id = 1.5;
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .put(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .send(mockRecruitment)
        .expect(400);
      console.log('[TEST]', 'TC-MRC-027: Invalid Input - Float id', id);
      console.log('Input:', { id, body: mockRecruitment, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-028: Invalid Input - Negative id
     * - **Goal:** Should return 400 Bad Request for negative recruitment ID
     * - **Input:**
     *   - Recruitment ID: -1
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-028: Invalid Input Negative id: should return 400 for negative id', async () => {
      const id = -1;
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .put(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .send(mockRecruitment)
        .expect(400);
      console.log('[TEST]', 'TC-MRC-028: Invalid Input - Negative id', id);
      console.log('Input:', { id, body: mockRecruitment, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-029: Invalid Input - Zero id
     * - **Goal:** Should return 400 Bad Request for zero recruitment ID
     * - **Input:**
     *   - Recruitment ID: 0
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-029: Invalid Input Zero id: should return 400 for zero id', async () => {
      const id = 0;
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .put(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .send(mockRecruitment)
        .expect(400);
      console.log('[TEST]', 'TC-MRC-029: Invalid Input - Zero id', id);
      console.log('Input:', { id, body: mockRecruitment, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-030: Invalid Input - Null id
     * - **Goal:** Should return 400 Bad Request for null recruitment ID
     * - **Input:**
     *   - Recruitment ID: null
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-030: Invalid Input Null id: should return 400 for null id', async () => {
      const id = null;
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .put(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .send(mockRecruitment)
        .expect(400);
      console.log('[TEST]', 'TC-MRC-030: Invalid Input - Null id', id);
      console.log('Input:', { id, body: mockRecruitment, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-031: Invalid Input - Undefined id
     * - **Goal:** Should return 400 Bad Request for undefined recruitment ID
     * - **Input:**
     *   - Recruitment ID: undefined
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-031: Invalid Input Undefined id: should return 400 for undefined id', async () => {
      const id = undefined;
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .put(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .send(mockRecruitment)
        .expect(400);
      console.log('[TEST]', 'TC-MRC-031: Invalid Input - Undefined id', id);
      console.log('Input:', { id, body: mockRecruitment, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-032: Invalid Input - Special char id
     * - **Goal:** Should return 400 Bad Request for special character recruitment ID
     * - **Input:**
     *   - Recruitment ID: '@!#'
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-032: Invalid Input Special char id: should return 400 for special char id', async () => {
      const id = '@!#';
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .put(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .send(mockRecruitment)
        .expect(400);
      console.log('[TEST]', 'TC-MRC-032: Invalid Input - Special char id', id);
      console.log('Input:', { id, body: mockRecruitment, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
  });

  // --- DELETE /admin/recruitments/:id ---
  describe('DELETE /admin/recruitments/:id', () => {
    /**
     * #### TC-MRC-033: Success
     * - **Goal:** Should delete a recruitment when valid user and recruitment ID are provided
     * - **Input:**
     *   - User: { role: 'COMPANY_ADMIN', companyId: 10, ... }
     *   - Recruitment ID: 1
     * - **Expected Output:**
     *   - Status code: 200 OK
     *   - ResponseDto.successDefault(undefined)
     */
    it('TC-MRC-033: Success: should delete recruitment', async () => {
      recruitmentService.deleteRecruitment.mockResolvedValue(undefined);
      const response = await request(app.getHttpServer())
        .delete('/admin/recruitments/1')
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(200);
      console.log('[TEST]', 'TC-MRC-033: Success - Delete recruitment');
      console.log('Input:', { id: 1, user: mockUser });
      console.log('Expected Output:', ResponseDto.successDefault(undefined));
      console.log('Actual Output:', response.body);
      const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault(undefined)));
      expect(response.body).toEqual(expected);
    });

    /**
     * #### TC-MRC-034: Forbidden - User with wrong role
     * - **Goal:** Should return 403 Forbidden for user with wrong role
     * - **Input:**
     *   - User: { role: 'USER', ... }
     *   - Recruitment ID: 1
     * - **Expected Output:**
     *   - Status code: 403 Forbidden
     */
    it('TC-MRC-034: Forbidden: should return 403 for user with wrong role', async () => {
      const user = { ...mockUser, role: $Enums.Role.USER };
      const response = await request(app.getHttpServer())
        .delete('/admin/recruitments/1')
        .set('x-current-user', JSON.stringify(user))
        .expect(403);
      console.log('[TEST]', 'TC-MRC-034: Forbidden - User with wrong role');
      console.log('Input:', { id: 1, user });
      console.log('Expected Output:', '403 Forbidden');
      console.log('Actual Output:', response.body);
    });

    /**
     * #### TC-MRC-035: Not Found - Recruitment not found
     * - **Goal:** Should return 404 Not Found if recruitment does not exist
     * - **Input:**
     *   - User: { role: 'COMPANY_ADMIN', companyId: 10, ... }
     *   - Recruitment ID: 999 (non-existent)
     * - **Expected Output:**
     *   - Status code: 404 Not Found
     */
    it('TC-MRC-035: Not Found: should return 404 if recruitment not found', async () => {
      recruitmentService.deleteRecruitment.mockRejectedValue(new NotFoundException('Not found'));
      const response = await request(app.getHttpServer())
        .delete('/admin/recruitments/999')
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(404);
      console.log('[TEST]', 'TC-MRC-035: Not Found - Recruitment not found');
      console.log('Input:', { id: 999, user: mockUser });
      console.log('Expected Output:', '404 Not Found');
      console.log('Actual Output:', response.body);
    });

    /**
     * #### TC-MRC-036: Invalid Input - Non-numeric id
     * - **Goal:** Should return 400 Bad Request for non-numeric recruitment ID
     * - **Input:**
     *   - Recruitment ID: 'abc'
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-036: Invalid Input Non-numeric id: should return 400 for non-numeric id', async () => {
      const id = 'abc';
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .delete(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-036: Invalid Input - Non-numeric id', id);
      console.log('Input:', { id, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-037: Invalid Input - Float id
     * - **Goal:** Should return 400 Bad Request for float recruitment ID
     * - **Input:**
     *   - Recruitment ID: 1.5
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-037: Invalid Input Float id: should return 400 for float id', async () => {
      const id = 1.5;
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .delete(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-037: Invalid Input - Float id', id);
      console.log('Input:', { id, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-038: Invalid Input - Negative id
     * - **Goal:** Should return 400 Bad Request for negative recruitment ID
     * - **Input:**
     *   - Recruitment ID: -1
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-038: Invalid Input Negative id: should return 400 for negative id', async () => {
      const id = -1;
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .delete(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-038: Invalid Input - Negative id', id);
      console.log('Input:', { id, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-039: Invalid Input - Zero id
     * - **Goal:** Should return 400 Bad Request for zero recruitment ID
     * - **Input:**
     *   - Recruitment ID: 0
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-039: Invalid Input Zero id: should return 400 for zero id', async () => {
      const id = 0;
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .delete(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-039: Invalid Input - Zero id', id);
      console.log('Input:', { id, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-040: Invalid Input - Null id
     * - **Goal:** Should return 400 Bad Request for null recruitment ID
     * - **Input:**
     *   - Recruitment ID: null
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-040: Invalid Input Null id: should return 400 for null id', async () => {
      const id = null;
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .delete(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-040: Invalid Input - Null id', id);
      console.log('Input:', { id, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-041: Invalid Input - Undefined id
     * - **Goal:** Should return 400 Bad Request for undefined recruitment ID
     * - **Input:**
     *   - Recruitment ID: undefined
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-041: Invalid Input Undefined id: should return 400 for undefined id', async () => {
      const id = undefined;
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .delete(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-041: Invalid Input - Undefined id', id);
      console.log('Input:', { id, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-042: Invalid Input - Special char id
     * - **Goal:** Should return 400 Bad Request for special character recruitment ID
     * - **Input:**
     *   - Recruitment ID: '@!#'
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-042: Invalid Input Special char id: should return 400 for special char id', async () => {
      const id = '@!#';
      const url = `/admin/recruitments/${id}`;
      const response = await request(app.getHttpServer())
        .delete(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-042: Invalid Input - Special char id', id);
      console.log('Input:', { id, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
  });

  // --- GET /admin/recruitments/:recruitmentId/applications ---
  describe('GET /admin/recruitments/:recruitmentId/applications', () => {
    /**
     * #### TC-MRC-043: Success
     * - **Goal:** Should return applications for a recruitment when valid user and recruitmentId are provided
     * - **Input:**
     *   - User: { role: 'COMPANY_ADMIN', companyId: 10, ... }
     *   - RecruitmentId: 1
     * - **Expected Output:**
     *   - Status code: 200 OK
     *   - Response contains applications for the recruitment
     *   - ResponseDto.successDefault with correct data
     */
    it('TC-MRC-043: Success: should return applications for recruitment', async () => {
      const fixedDate = new Date('2025-05-18T00:39:12.928Z');
      applicationService.findByRecruitment.mockResolvedValue([
        { id: 1, message: 'test', status: $Enums.ApplicationStatus.PENDING, cvId: 'cv1', recruitmentId: 1, userId: 1, createdAt: fixedDate, updatedAt: fixedDate }
      ]);
      const response = await request(app.getHttpServer())
        .get('/admin/recruitments/1/applications')
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(200);
      console.log('[TEST]', 'TC-MRC-043: Success - Returns applications for recruitment');
      console.log('Input:', { recruitmentId: 1, user: mockUser });
      console.log('Expected Output:', ResponseDto.successDefault([
        { id: 1, message: 'test', status: $Enums.ApplicationStatus.PENDING, cvId: 'cv1', recruitmentId: 1, userId: 1, createdAt: fixedDate, updatedAt: fixedDate }
      ]));
      console.log('Actual Output:', response.body);
      const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault([
        { id: 1, message: 'test', status: $Enums.ApplicationStatus.PENDING, cvId: 'cv1', recruitmentId: 1, userId: 1, createdAt: fixedDate, updatedAt: fixedDate }
      ])));
      expect(response.body).toEqual(expected);
    });

    /**
     * #### TC-MRC-044: Forbidden - User with wrong role
     * - **Goal:** Should return 403 Forbidden for user with wrong role
     * - **Input:**
     *   - User: { role: 'USER', ... }
     *   - RecruitmentId: 1
     * - **Expected Output:**
     *   - Status code: 403 Forbidden
     */
    it('TC-MRC-044: Forbidden: should return 403 for user with wrong role', async () => {
      const user = { ...mockUser, role: $Enums.Role.USER };
      const response = await request(app.getHttpServer())
        .get('/admin/recruitments/1/applications')
        .set('x-current-user', JSON.stringify(user))
        .expect(403);
      console.log('[TEST]', 'TC-MRC-044: Forbidden - User with wrong role');
      console.log('Input:', { recruitmentId: 1, user });
      console.log('Expected Output:', '403 Forbidden');
      console.log('Actual Output:', response.body);
    });

    /**
     * #### TC-MRC-045: Not Found - Recruitment not found
     * - **Goal:** Should return 404 Not Found if recruitment does not exist
     * - **Input:**
     *   - User: { role: 'COMPANY_ADMIN', companyId: 10, ... }
     *   - RecruitmentId: 999 (non-existent)
     * - **Expected Output:**
     *   - Status code: 404 Not Found
     */
    it('TC-MRC-045: Not Found: should return 404 if recruitment not found', async () => {
      applicationService.findByRecruitment.mockRejectedValue(new NotFoundException('Not found'));
      const response = await request(app.getHttpServer())
        .get('/admin/recruitments/999/applications')
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(404);
      console.log('[TEST]', 'TC-MRC-045: Not Found - Recruitment not found');
      console.log('Input:', { recruitmentId: 999, user: mockUser });
      console.log('Expected Output:', '404 Not Found');
      console.log('Actual Output:', response.body);
    });

    /**
     * #### TC-MRC-046: Invalid Input - Non-numeric recruitmentId
     * - **Goal:** Should return 400 Bad Request for non-numeric recruitmentId
     * - **Input:**
     *   - RecruitmentId: 'abc'
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-046: Invalid Input Non-numeric recruitmentId: should return 400 for non-numeric recruitmentId', async () => {
      const recruitmentId = 'abc';
      const url = `/admin/recruitments/${recruitmentId}/applications`;
      const response = await request(app.getHttpServer())
        .get(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-046: Invalid Input - Non-numeric recruitmentId', recruitmentId);
      console.log('Input:', { recruitmentId, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-047: Invalid Input - Float recruitmentId
     * - **Goal:** Should return 400 Bad Request for float recruitmentId
     * - **Input:**
     *   - RecruitmentId: 1.5
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-047: Invalid Input Float recruitmentId: should return 400 for float recruitmentId', async () => {
      const recruitmentId = 1.5;
      const url = `/admin/recruitments/${recruitmentId}/applications`;
      const response = await request(app.getHttpServer())
        .get(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-047: Invalid Input - Float recruitmentId', recruitmentId);
      console.log('Input:', { recruitmentId, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-048: Invalid Input - Negative recruitmentId
     * - **Goal:** Should return 400 Bad Request for negative recruitmentId
     * - **Input:**
     *   - RecruitmentId: -1
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-048: Invalid Input Negative recruitmentId: should return 400 for negative recruitmentId', async () => {
      const recruitmentId = -1;
      const url = `/admin/recruitments/${recruitmentId}/applications`;
      const response = await request(app.getHttpServer())
        .get(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-048: Invalid Input - Negative recruitmentId', recruitmentId);
      console.log('Input:', { recruitmentId, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-049: Invalid Input - Zero recruitmentId
     * - **Goal:** Should return 400 Bad Request for zero recruitmentId
     * - **Input:**
     *   - RecruitmentId: 0
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-049: Invalid Input Zero recruitmentId: should return 400 for zero recruitmentId', async () => {
      const recruitmentId = 0;
      const url = `/admin/recruitments/${recruitmentId}/applications`;
      const response = await request(app.getHttpServer())
        .get(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-049: Invalid Input - Zero recruitmentId', recruitmentId);
      console.log('Input:', { recruitmentId, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-050: Invalid Input - Null recruitmentId
     * - **Goal:** Should return 400 Bad Request for null recruitmentId
     * - **Input:**
     *   - RecruitmentId: null
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-050: Invalid Input Null recruitmentId: should return 400 for null recruitmentId', async () => {
      const recruitmentId = null;
      const url = `/admin/recruitments/${recruitmentId}/applications`;
      const response = await request(app.getHttpServer())
        .get(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-050: Invalid Input - Null recruitmentId', recruitmentId);
      console.log('Input:', { recruitmentId, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-051: Invalid Input - Undefined recruitmentId
     * - **Goal:** Should return 400 Bad Request for undefined recruitmentId
     * - **Input:**
     *   - RecruitmentId: undefined
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-051: Invalid Input Undefined recruitmentId: should return 400 for undefined recruitmentId', async () => {
      const recruitmentId = undefined;
      const url = `/admin/recruitments/${recruitmentId}/applications`;
      const response = await request(app.getHttpServer())
        .get(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-051: Invalid Input - Undefined recruitmentId', recruitmentId);
      console.log('Input:', { recruitmentId, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
    /**
     * #### TC-MRC-052: Invalid Input - Special char recruitmentId
     * - **Goal:** Should return 400 Bad Request for special character recruitmentId
     * - **Input:**
     *   - RecruitmentId: '@!#'
     * - **Expected Output:**
     *   - Status code: 400 Bad Request
     */
    it('TC-MRC-052: Invalid Input Special char recruitmentId: should return 400 for special char recruitmentId', async () => {
      const recruitmentId = '@!#';
      const url = `/admin/recruitments/${recruitmentId}/applications`;
      const response = await request(app.getHttpServer())
        .get(url)
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(400);
      console.log('[TEST]', 'TC-MRC-052: Invalid Input - Special char recruitmentId', recruitmentId);
      console.log('Input:', { recruitmentId, user: mockUser });
      console.log('Expected Output:', '400 Bad Request');
      console.log('Actual Output:', response.body);
    });
  });
}); 