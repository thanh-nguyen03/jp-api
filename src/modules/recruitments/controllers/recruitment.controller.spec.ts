import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, NotFoundException, ForbiddenException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from '../recruitment.service';
import { ApplicationService } from '../../applications/application.service';
import { RecruitmentDto } from '../dtos/recruitment.dto';
import { RecruitmentFilter } from '../dtos/recruitment-filter.dto';
import ResponseDto from '../../../constants/response.dto';
import { User, $Enums } from '@prisma/client';

// ### Test Case Set 1: GET /recruitments (getAll)
describe('RecruitmentController - GET /recruitments', () => {
  let app: INestApplication;
  let recruitmentService: jest.Mocked<RecruitmentService>;
  let applicationService: jest.Mocked<ApplicationService>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'hashed',
    displayName: 'John Doe',
    avatar: 'avatar.png',
    role: $Enums.Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    companyId: 1,
  };

  const mockRecruitment: RecruitmentDto = {
    id: 1,
    title: 'Test Recruitment',
    content: 'desc',
    jobType: 'FULL_TIME',
    minSalary: 1000,
    maxSalary: 2000,
    experience: 2,
    deadline: new Date(),
    companyId: 1,
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
    } as any;
    const applicationServiceMock = {
      findByRecruitmentAndUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecruitmentController],
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
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  /**
   * TC-RC-001: Success: Returns recruitments for valid filter and user
   * - Goal: Should return a list of recruitments for valid filter and user
   * - Input:
   *   - user: { role: 'USER', companyId: 1, ... }
   *   - filter: { title: '', jobType: null, companyId: 1, minSalary: 0, maxSalary: 0, experience: 0, limit: 10, offset: 0, sort: [] }
   * - Expected Output:
   *   - Status code: 200 OK
   *   - Response contains a list of recruitments matching the filter
   *   - ResponseDto.successDefault with correct pagination and data
   * - Notes: None
   */
  it('TC-RC-001: Success: Returns recruitments for valid filter and user', async () => {
    recruitmentService.findAll.mockResolvedValue(mockRecruitmentPage);
    const filter: RecruitmentFilter = { title: '', jobType: undefined, companyId: 1, minSalary: 0, maxSalary: 0, experience: 0, limit: 10, offset: 0, sort: [] };
    const response = await request(app.getHttpServer())
      .get('/recruitments')
      .set('x-current-user', JSON.stringify(mockUser))
      .query(filter)
      .expect(200);
    console.log('[TEST]', 'TC-RC-001: Success - Returns recruitments for valid filter and user');
    console.log('Input:', { filter, user: mockUser });
    console.log('Expected Output:', ResponseDto.successDefault(mockRecruitmentPage));
    console.log('Actual Output:', response.body);
    expect(recruitmentService.findAll).toHaveBeenCalledWith(expect.any(Object), mockUser);
    const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault(mockRecruitmentPage)));
    expect(response.body).toEqual(expected);
  });

  /**
   * TC-RC-002: Not Found: Service throws NotFoundException
   * - Goal: Should propagate NotFoundException from service
   * - Input:
   *   - Valid filter, valid user, service throws NotFoundException
   * - Expected Output:
   *   - 404 Not Found
   * - Notes: None
   */
  it('TC-RC-002: Not Found: Service throws NotFoundException', async () => {
    recruitmentService.findAll.mockRejectedValue(new NotFoundException('Not found'));
    const filter: RecruitmentFilter = { title: '', jobType: undefined, companyId: 1, minSalary: 0, maxSalary: 0, experience: 0, limit: 10, offset: 0, sort: [] };
    const response = await request(app.getHttpServer())
      .get('/recruitments')
      .set('x-current-user', JSON.stringify(mockUser))
      .query(filter)
      .expect(404);
    console.log('[TEST]', 'TC-RC-002: Not Found - Service throws NotFoundException');
    console.log('Input:', { filter, user: mockUser });
    console.log('Expected Output:', '404 Not Found');
    console.log('Actual Output:', response.body);
  });

  /**
   * TC-RC-003: Unauthorized: No user provided
   * - Goal: Should return 401 if user is not provided
   * - Input:
   *   - No x-current-user header
   * - Expected Output:
   *   - 401 Unauthorized
   * - Notes: None
   */
  it('TC-RC-003: Unauthorized: No user provided', async () => {
    const response = await request(app.getHttpServer())
      .get('/recruitments')
      .query({})
      .expect(401);
    console.log('[TEST]', 'TC-RC-003: Unauthorized - No user provided');
    console.log('Input:', { filter: {}, user: null });
    console.log('Expected Output:', '401 Unauthorized');
    console.log('Actual Output:', response.body);
    expect(recruitmentService.findAll).not.toHaveBeenCalled();
  });

  /**
   * TC-RC-004: Invalid Input: Invalid query params
   * - Goal: Should return 400 for invalid query params
   * - Input:
   *   - Invalid query (e.g., non-numeric limit)
   * - Expected Output:
   *   - 400 Bad Request
   * - Notes: None
   */
  it('TC-RC-004: Invalid Input: Invalid query params', async () => {
    const response = await request(app.getHttpServer())
      .get('/recruitments')
      .set('x-current-user', JSON.stringify(mockUser))
      .query({ limit: 'not-a-number' })
      .expect(400);
    console.log('[TEST]', 'TC-RC-004: Invalid Input - Invalid query params');
    console.log('Input:', { filter: { limit: 'not-a-number' }, user: mockUser });
    console.log('Expected Output:', '400 Bad Request');
    console.log('Actual Output:', response.body);
    expect(recruitmentService.findAll).not.toHaveBeenCalled();
  });

  /**
   * TC-RC-005: Edge: Empty filter values
   * - Goal: Should return 200 OK with empty data for empty filter values
   * - Input:
   *   - filter: all fields empty or undefined
   * - Expected Output:
   *   - 200 OK
   *   - ResponseDto.successDefault with empty data
   * - Notes: None
   */
  it('TC-RC-005: Edge: Empty filter values', async () => {
    recruitmentService.findAll.mockResolvedValue({ data: [], total: 0, offset: 0, limit: 10 });
    const filter: RecruitmentFilter = { title: '', jobType: undefined, companyId: undefined, minSalary: undefined, maxSalary: undefined, experience: undefined, limit: 10, offset: 0, sort: [] };
    const response = await request(app.getHttpServer())
      .get('/recruitments')
      .set('x-current-user', JSON.stringify(mockUser))
      .query(filter)
      .expect(200);
    console.log('[TEST]', 'TC-RC-005: Edge - Empty filter values');
    console.log('Input:', { filter, user: mockUser });
    console.log('Expected Output:', ResponseDto.successDefault({ data: [], total: 0, offset: 0, limit: 10 }));
    console.log('Actual Output:', response.body);
    const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault({ data: [], total: 0, offset: 0, limit: 10 })));
    expect(response.body).toEqual(expected);
  });

  /**
   * TC-RC-006: Edge: Whitespace filter values
   * - Goal: Should return 200 OK with empty data for whitespace filter values
   * - Input:
   *   - filter: title is whitespace
   * - Expected Output:
   *   - 200 OK
   *   - ResponseDto.successDefault with empty data
   * - Notes: None
   */
  it('TC-RC-006: Edge: Whitespace filter values', async () => {
    recruitmentService.findAll.mockResolvedValue({ data: [], total: 0, offset: 0, limit: 10 });
    const filter: RecruitmentFilter = { title: '   ', jobType: undefined, companyId: undefined, minSalary: undefined, maxSalary: undefined, experience: undefined, limit: 10, offset: 0, sort: [] };
    const response = await request(app.getHttpServer())
      .get('/recruitments')
      .set('x-current-user', JSON.stringify(mockUser))
      .query(filter)
      .expect(200);
    console.log('[TEST]', 'TC-RC-006: Edge - Whitespace filter values');
    console.log('Input:', { filter, user: mockUser });
    console.log('Expected Output:', ResponseDto.successDefault({ data: [], total: 0, offset: 0, limit: 10 }));
    console.log('Actual Output:', response.body);
    const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault({ data: [], total: 0, offset: 0, limit: 10 })));
    expect(response.body).toEqual(expected);
  });

  /**
   * TC-RC-007: Edge: Very large limit/offset
   * - Goal: Should return 200 OK with empty data for very large limit/offset
   * - Input:
   *   - filter: limit and offset are very large numbers
   * - Expected Output:
   *   - 200 OK
   *   - ResponseDto.successDefault with empty data
   * - Notes: None
   */
  it('TC-RC-007: Edge: Very large limit/offset', async () => {
    recruitmentService.findAll.mockResolvedValue({ data: [], total: 0, offset: 1e6, limit: 1e6 });
    const filter: RecruitmentFilter = { title: '', jobType: undefined, companyId: 1, minSalary: 0, maxSalary: 0, experience: 0, limit: 1e6, offset: 1e6, sort: [] };
    const response = await request(app.getHttpServer())
      .get('/recruitments')
      .set('x-current-user', JSON.stringify(mockUser))
      .query(filter)
      .expect(200);
    console.log('[TEST]', 'TC-RC-007: Edge - Very large limit/offset');
    console.log('Input:', { filter, user: mockUser });
    console.log('Expected Output:', ResponseDto.successDefault({ data: [], total: 0, offset: 1e6, limit: 1e6 }));
    console.log('Actual Output:', response.body);
    const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault({ data: [], total: 0, offset: 1e6, limit: 1e6 })));
    expect(response.body).toEqual(expected);
  });

  /**
   * TC-RC-008: Edge: Negative limit/offset
   * - Goal: Should return 400 Bad Request for negative limit/offset
   * - Input:
   *   - filter: limit and offset are negative numbers
   * - Expected Output:
   *   - 400 Bad Request
   * - Notes: None
   */
  it('TC-RC-008: Edge: Negative limit/offset', async () => {
    const filter: RecruitmentFilter = { title: '', jobType: undefined, companyId: 1, minSalary: 0, maxSalary: 0, experience: 0, limit: -10, offset: -5, sort: [] };
    const response = await request(app.getHttpServer())
      .get('/recruitments')
      .set('x-current-user', JSON.stringify(mockUser))
      .query(filter)
      .expect(400);
    console.log('[TEST]', 'TC-RC-008: Edge - Negative limit/offset');
    console.log('Input:', { filter, user: mockUser });
    console.log('Expected Output:', '400 Bad Request');
    console.log('Actual Output:', response.body);
  });

  /**
   * TC-RC-009: Edge: Special/unicode characters in filter
   * - Goal: Should return 200 OK with empty data for special/unicode characters in filter
   * - Input:
   *   - filter: title contains special/unicode characters
   * - Expected Output:
   *   - 200 OK
   *   - ResponseDto.successDefault with empty data
   * - Notes: None
   */
  it('TC-RC-009: Edge: Special/unicode characters in filter', async () => {
    recruitmentService.findAll.mockResolvedValue({ data: [], total: 0, offset: 0, limit: 10 });
    const filter: RecruitmentFilter = { title: '公司-测试-🚀', jobType: undefined, companyId: 1, minSalary: 0, maxSalary: 0, experience: 0, limit: 10, offset: 0, sort: [] };
    const response = await request(app.getHttpServer())
      .get('/recruitments')
      .set('x-current-user', JSON.stringify(mockUser))
      .query(filter)
      .expect(200);
    console.log('[TEST]', 'TC-RC-009: Edge - Special/unicode characters in filter');
    console.log('Input:', { filter, user: mockUser });
    console.log('Expected Output:', ResponseDto.successDefault({ data: [], total: 0, offset: 0, limit: 10 }));
    console.log('Actual Output:', response.body);
    const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault({ data: [], total: 0, offset: 0, limit: 10 })));
    expect(response.body).toEqual(expected);
  });

  /**
   * TC-RC-010: Edge: minSalary > maxSalary
   * - Goal: Should return 200 OK with empty data when minSalary > maxSalary
   * - Input:
   *   - filter: minSalary > maxSalary
   * - Expected Output:
   *   - 200 OK
   *   - ResponseDto.successDefault with empty data
   * - Notes: None
   */
  it('TC-RC-010: Edge: minSalary > maxSalary', async () => {
    recruitmentService.findAll.mockResolvedValue({ data: [], total: 0, offset: 0, limit: 10 });
    const filter: RecruitmentFilter = { title: '', jobType: undefined, companyId: 1, minSalary: 2000, maxSalary: 1000, experience: 0, limit: 10, offset: 0, sort: [] };
    const response = await request(app.getHttpServer())
      .get('/recruitments')
      .set('x-current-user', JSON.stringify(mockUser))
      .query(filter)
      .expect(200);
    console.log('[TEST]', 'TC-RC-010: Edge - minSalary > maxSalary');
    console.log('Input:', { filter, user: mockUser });
    console.log('Expected Output:', ResponseDto.successDefault({ data: [], total: 0, offset: 0, limit: 10 }));
    console.log('Actual Output:', response.body);
    const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault({ data: [], total: 0, offset: 0, limit: 10 })));
    expect(response.body).toEqual(expected);
  });

  /**
   * TC-RC-011: Edge: Invalid jobType
   * - Goal: Should return 400 Bad Request for invalid jobType
   * - Input:
   *   - filter: jobType is invalid
   * - Expected Output:
   *   - 400 Bad Request
   * - Notes: None
   */
  it('TC-RC-011: Edge: Invalid jobType', async () => {
    const filter: RecruitmentFilter = { title: '', jobType: 'INVALID_JOBTYPE' as any, companyId: 1, minSalary: 0, maxSalary: 0, experience: 0, limit: 10, offset: 0, sort: [] };
    const response = await request(app.getHttpServer())
      .get('/recruitments')
      .set('x-current-user', JSON.stringify(mockUser))
      .query(filter)
      .expect(400);
    console.log('[TEST]', 'TC-RC-011: Edge - Invalid jobType');
    console.log('Input:', { filter, user: mockUser });
    console.log('Expected Output:', '400 Bad Request');
    console.log('Actual Output:', response.body);
  });

  /**
   * TC-RC-012: Edge: Missing required fields (companyId)
   * - Goal: Should return 200 OK with empty data when companyId is missing
   * - Input:
   *   - filter: companyId missing
   * - Expected Output:
   *   - 200 OK
   *   - ResponseDto.successDefault with empty data
   * - Notes: None
   */
  it('TC-RC-012: Edge: Missing required fields (companyId)', async () => {
    recruitmentService.findAll.mockResolvedValue({ data: [], total: 0, offset: 0, limit: 10 });
    const filter: RecruitmentFilter = { title: '', jobType: undefined, minSalary: 0, maxSalary: 0, experience: 0, limit: 10, offset: 0, sort: [] } as any;
    const response = await request(app.getHttpServer())
      .get('/recruitments')
      .set('x-current-user', JSON.stringify(mockUser))
      .query(filter)
      .expect(200);
    console.log('[TEST]', 'TC-RC-012: Edge - Missing required fields (companyId)');
    console.log('Input:', { filter, user: mockUser });
    console.log('Expected Output:', ResponseDto.successDefault({ data: [], total: 0, offset: 0, limit: 10 }));
    console.log('Actual Output:', response.body);
    const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault({ data: [], total: 0, offset: 0, limit: 10 })));
    expect(response.body).toEqual(expected);
  });
});

// ### Test Case Set 2: GET /recruitments/:id (getById)
describe('RecruitmentController - GET /recruitments/:id', () => {
  let app: INestApplication;
  let recruitmentService: jest.Mocked<RecruitmentService>;
  let applicationService: jest.Mocked<ApplicationService>;

  const mockRecruitment: RecruitmentDto = {
    id: 1,
    title: 'Test Recruitment',
    content: 'desc',
    jobType: 'FULL_TIME',
    minSalary: 1000,
    maxSalary: 2000,
    experience: 2,
    deadline: new Date(),
    companyId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const recruitmentServiceMock = {
      findAll: jest.fn(),
      findById: jest.fn(),
    } as any;
    const applicationServiceMock = {
      findByRecruitmentAndUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecruitmentController],
      providers: [
        { provide: RecruitmentService, useValue: recruitmentServiceMock },
        { provide: ApplicationService, useValue: applicationServiceMock },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    recruitmentService = module.get(RecruitmentService);
    applicationService = module.get(ApplicationService);
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  /**
   * TC-RC-013: Success - Returns recruitment by ID
   * - Goal: Should return recruitment for valid ID
   * - Input:
   *   Valid recruitment ID
   * - Expected Output:
   *   - 200 OK, ResponseDto.successDefault with recruitment
   */
  it('TC-RC-013: Success - Returns recruitment by ID', async () => {
    recruitmentService.findById.mockResolvedValue(mockRecruitment);
    const response = await request(app.getHttpServer())
      .get('/recruitments/1')
      .expect(200);
    console.log('[TEST]', 'TC-RC-013: Success - Returns recruitment by ID');
    console.log('Input:', { id: 1 });
    console.log('Expected Output:', ResponseDto.successDefault(mockRecruitment));
    console.log('Actual Output:', response.body);
    expect(recruitmentService.findById).toHaveBeenCalledWith(1);
    const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault(mockRecruitment)));
    expect(response.body).toEqual(expected);
  });

  /**
   * TC-RC-014: Not Found - Service throws NotFoundException
   * - Goal: Should propagate NotFoundException from service
   * - Input:
   *   Non-existent recruitment ID
   * - Expected Output:
   *   - 404 Not Found
   */
  it('TC-RC-014: Not Found - Service throws NotFoundException', async () => {
    recruitmentService.findById.mockRejectedValue(new NotFoundException('Not found'));
    const response = await request(app.getHttpServer())
      .get('/recruitments/999')
      .expect(404);
    console.log('[TEST]', 'TC-RC-014: Not Found - Service throws NotFoundException');
    console.log('Input:', { id: 999 });
    console.log('Expected Output:', '404 Not Found');
    console.log('Actual Output:', response.body);
  });

  /**
   * TC-RC-015: Invalid Input - Non-numeric ID
   * - Goal: Should return 400 for non-numeric ID
   * - Input:
   *   Non-numeric ID
   * - Expected Output:
   *   - 400 Bad Request
   */
  it('TC-RC-015: Invalid Input - Non-numeric ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/recruitments/not-a-number')
      .expect(400);
    console.log('[TEST]', 'TC-RC-015: Invalid Input - Non-numeric ID');
    console.log('Input:', { id: 'not-a-number' });
    console.log('Expected Output:', '400 Bad Request');
    console.log('Actual Output:', response.body);
    expect(recruitmentService.findById).not.toHaveBeenCalled();
  });
});

// ### Test Case Set 3: GET /recruitments/:recruitmentId/user-application (getApplicationOfRecruitmentAndUser)
describe('RecruitmentController - GET /recruitments/:recruitmentId/user-application', () => {
  let app: INestApplication;
  let recruitmentService: jest.Mocked<RecruitmentService>;
  let applicationService: jest.Mocked<ApplicationService>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'hashed',
    displayName: 'John Doe',
    avatar: 'avatar.png',
    role: $Enums.Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    companyId: 1,
  };

  const mockApplication = {
    id: 1,
    message: 'test',
    recruitmentId: 1,
    userId: 1,
    status: $Enums.ApplicationStatus.PENDING,
    cvId: 'cv1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const recruitmentServiceMock = {
      findAll: jest.fn(),
      findById: jest.fn(),
    } as any;
    const applicationServiceMock = {
      findByRecruitmentAndUser: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecruitmentController],
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
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  /**
   * TC-RC-016: Success - Returns application for recruitment and user
   * - Goal: Should return application for valid recruitmentId and user
   * - Input:
   *   Valid recruitmentId, valid user
   * - Expected Output:
   *   - 200 OK, ResponseDto.successDefault with application
   */
  it('TC-RC-016: Success - Returns application for recruitment and user', async () => {
    applicationService.findByRecruitmentAndUser.mockResolvedValue(mockApplication);
    const response = await request(app.getHttpServer())
      .get('/recruitments/1/user-application')
      .set('x-current-user', JSON.stringify(mockUser))
      .expect(200);
    console.log('[TEST]', 'TC-RC-016: Success - Returns application for recruitment and user');
    console.log('Input:', { recruitmentId: 1, user: mockUser });
    console.log('Expected Output:', ResponseDto.successDefault(mockApplication));
    console.log('Actual Output:', response.body);
    expect(applicationService.findByRecruitmentAndUser).toHaveBeenCalledWith(1, mockUser);
    const expected = JSON.parse(JSON.stringify(ResponseDto.successDefault(mockApplication)));
    expect(response.body).toEqual(expected);
  });

  /**
   * TC-RC-017: Not Found - Service throws NotFoundException
   * - Goal: Should propagate NotFoundException from service
   * - Input:
   *   Non-existent recruitmentId, valid user
   * - Expected Output:
   *   - 404 Not Found
   */
  it('TC-RC-017: Not Found - Service throws NotFoundException', async () => {
    applicationService.findByRecruitmentAndUser.mockRejectedValue(new NotFoundException('Not found'));
    const response = await request(app.getHttpServer())
      .get('/recruitments/999/user-application')
      .set('x-current-user', JSON.stringify(mockUser))
      .expect(404);
    console.log('[TEST]', 'TC-RC-017: Not Found - Service throws NotFoundException');
    console.log('Input:', { recruitmentId: 999, user: mockUser });
    console.log('Expected Output:', '404 Not Found');
    console.log('Actual Output:', response.body);
  });

  /**
   * TC-RC-018: Unauthorized - No user provided
   * - Goal: Should return 401 if user is not provided
   * - Input:
   *   No x-current-user header
   * - Expected Output:
   *   - 401 Unauthorized
   */
  it('TC-RC-018: Unauthorized - No user provided', async () => {
    const response = await request(app.getHttpServer())
      .get('/recruitments/1/user-application')
      .expect(401);
    console.log('[TEST]', 'TC-RC-018: Unauthorized - No user provided');
    console.log('Input:', { recruitmentId: 1, user: null });
    console.log('Expected Output:', '401 Unauthorized');
    console.log('Actual Output:', response.body);
    expect(applicationService.findByRecruitmentAndUser).not.toHaveBeenCalled();
  });

  /**
   * TC-RC-019: Invalid Input - Non-numeric recruitmentId
   * - Goal: Should return 400 for non-numeric recruitmentId
   * - Input:
   *   Non-numeric recruitmentId
   * - Expected Output:
   *   - 400 Bad Request
   */
  it('TC-RC-019: Invalid Input - Non-numeric recruitmentId', async () => {
    const response = await request(app.getHttpServer())
      .get('/recruitments/not-a-number/user-application')
      .set('x-current-user', JSON.stringify(mockUser))
      .expect(400);
    console.log('[TEST]', 'TC-RC-019: Invalid Input - Non-numeric recruitmentId');
    console.log('Input:', { recruitmentId: 'not-a-number', user: mockUser });
    console.log('Expected Output:', '400 Bad Request');
    console.log('Actual Output:', response.body);
    expect(applicationService.findByRecruitmentAndUser).not.toHaveBeenCalled();
  });
}); 