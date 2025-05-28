import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as request from 'supertest';
import { ManageApplicationController } from './manage-application.controller';
import { ApplicationService } from '../application.service';
import { $Enums, User } from '@prisma/client';
import ResponseDto from '../../../constants/response.dto';
import { Message } from '../../../constants/message';

const mockUser: User = {
  id: 1,
  email: 'admin_thanhnd@example.com',
  firstName: 'Admin',
  lastName: 'User',
  password: 'hashed',
  displayName: 'Admin User',
  avatar: null,
  role: $Enums.Role.COMPANY_ADMIN,
  createdAt: new Date(),
  updatedAt: new Date(),
  companyId: 1,
};

describe('ManageApplicationController', () => {
  let app: INestApplication;
  let applicationService: jest.Mocked<ApplicationService>;

  const validApplication = {
    id: 1,
    message: 'Test application_thanhnd',
    status: $Enums.ApplicationStatus.PENDING,
    cvId: 'test-cv-id_thanhnd',
    recruitmentId: 123,
    userId: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const applicationServiceMock = {
      getApplicationDetail: jest.fn(),
      updateApplicationStatus: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManageApplicationController],
      providers: [
        { provide: ApplicationService, useValue: applicationServiceMock },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    applicationService = module.get(ApplicationService);

    // Middleware to set request.user from x-current-user header
    app.use((req, res, next) => {
      const userData = req.headers['x-current-user']
        ? JSON.parse(req.headers['x-current-user'])
        : null;
      req.user = userData;
      next();
    });

    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  describe('GET /admin/applications/:applicationId', () => {
    /**
     * Test Case ID: TC-MAC-001
     * Objective: Verify that GET /admin/applications/:applicationId returns application detail with valid data
     * Input: applicationId and authenticated admin user
     * Expected Output: 200 response with application detail
     * White-Box: Tests the path where application exists and user is authorized
     */
    it('should return application detail (200)', async () => {
      applicationService.getApplicationDetail.mockResolvedValue(
        validApplication,
      );
      const response = await request(app.getHttpServer())
        .get('/admin/applications/1')
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(200);
      expect(applicationService.getApplicationDetail).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          ...mockUser,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
      expect(response.body).toEqual(
        ResponseDto.successDefault(
          expect.objectContaining({
            ...validApplication,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        ),
      );
    });

    /**
     * Test Case ID: TC-MAC-002
     * Objective: Verify that GET /admin/applications/:applicationId returns 404 if not found
     * Input: non-existent applicationId and authenticated admin user
     * Expected Output: 404 response
     * White-Box: Tests the path where application does not exist
     */
    it('should return 404 if not found', async () => {
      applicationService.getApplicationDetail.mockRejectedValue(
        new NotFoundException('Not found'),
      );
      await request(app.getHttpServer())
        .get('/admin/applications/1')
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(404);
      expect(applicationService.getApplicationDetail).toHaveBeenCalled();
    });

    /**
     * Test Case ID: TC-MAC-003
     * Objective: Verify that GET /admin/applications/:applicationId returns 403 if forbidden
     * Input: applicationId and authenticated admin user without permission
     * Expected Output: 403 response
     * White-Box: Tests the path where user is forbidden
     */
    it('should return 403 if forbidden', async () => {
      applicationService.getApplicationDetail.mockRejectedValue(
        new ForbiddenException('Forbidden'),
      );
      await request(app.getHttpServer())
        .get('/admin/applications/1')
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(403);
      expect(applicationService.getApplicationDetail).toHaveBeenCalled();
    });

    /**
     * Test Case ID: TC-MAC-004
     * Objective: Verify that GET /admin/applications/:applicationId returns 401 if unauthorized
     * Input: applicationId and unauthorized user
     * Expected Output: 401 response
     * White-Box: Tests the path where user is unauthorized
     */
    it('should return 401 if unauthorized', async () => {
      applicationService.getApplicationDetail.mockRejectedValue(
        new UnauthorizedException('Unauthorized'),
      );
      await request(app.getHttpServer())
        .get('/admin/applications/1')
        .set('x-current-user', JSON.stringify(mockUser))
        .expect(401);
      expect(applicationService.getApplicationDetail).toHaveBeenCalled();
    });
  });

  describe('PUT /admin/applications/:applicationId/status', () => {
    /**
     * Test Case ID: TC-MAC-005
     * Objective: Verify that PUT /admin/applications/:applicationId/status updates application status with valid data
     * Input: applicationId, authenticated admin user, valid isApproved
     * Expected Output: 200 response with updated application
     * White-Box: Tests the path where status update is successful
     */
    it('should update application status (200)', async () => {
      applicationService.updateApplicationStatus.mockResolvedValue(
        validApplication,
      );
      const response = await request(app.getHttpServer())
        .put('/admin/applications/1/status')
        .set('x-current-user', JSON.stringify(mockUser))
        .send({ isApproved: true })
        .expect(200);
      expect(applicationService.updateApplicationStatus).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          ...mockUser,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
        true,
      );
      expect(response.body).toEqual(
        ResponseDto.successDefault(
          expect.objectContaining({
            ...validApplication,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
        ),
      );
    });

    /**
     * Test Case ID: TC-MAC-006
     * Objective: Verify that PUT /admin/applications/:applicationId/status returns 400 for invalid isApproved
     * Input: applicationId, authenticated admin user, invalid isApproved
     * Expected Output: 400 response
     * White-Box: Tests the path where validation fails for isApproved
     */
    it('should return 400 for invalid isApproved', async () => {
      await request(app.getHttpServer())
        .put('/admin/applications/1/status')
        .set('x-current-user', JSON.stringify(mockUser))
        .send({ isApproved: 'not-a-boolean' })
        .expect(400);
      expect(applicationService.updateApplicationStatus).not.toHaveBeenCalled();
    });

    /**
     * Test Case ID: TC-MAC-007
     * Objective: Verify that PUT /admin/applications/:applicationId/status returns 404 if not found
     * Input: non-existent applicationId, authenticated admin user, valid isApproved
     * Expected Output: 404 response
     * White-Box: Tests the path where application does not exist
     */
    it('should return 404 if not found', async () => {
      applicationService.updateApplicationStatus.mockRejectedValue(
        new NotFoundException('Not found'),
      );
      await request(app.getHttpServer())
        .put('/admin/applications/1/status')
        .set('x-current-user', JSON.stringify(mockUser))
        .send({ isApproved: true })
        .expect(404);
      expect(applicationService.updateApplicationStatus).toHaveBeenCalled();
    });

    /**
     * Test Case ID: TC-MAC-008
     * Objective: Verify that PUT /admin/applications/:applicationId/status returns 403 if forbidden
     * Input: applicationId, authenticated admin user without permission, valid isApproved
     * Expected Output: 403 response
     * White-Box: Tests the path where user is forbidden
     */
    it('should return 403 if forbidden', async () => {
      applicationService.updateApplicationStatus.mockRejectedValue(
        new ForbiddenException('Forbidden'),
      );
      await request(app.getHttpServer())
        .put('/admin/applications/1/status')
        .set('x-current-user', JSON.stringify(mockUser))
        .send({ isApproved: true })
        .expect(403);
      expect(applicationService.updateApplicationStatus).toHaveBeenCalled();
    });

    /**
     * Test Case ID: TC-MAC-009
     * Objective: Verify that PUT /admin/applications/:applicationId/status returns 401 if unauthorized
     * Input: applicationId, unauthorized user, valid isApproved
     * Expected Output: 401 response
     * White-Box: Tests the path where user is unauthorized
     */
    it('should return 401 if unauthorized', async () => {
      applicationService.updateApplicationStatus.mockRejectedValue(
        new UnauthorizedException('Unauthorized'),
      );
      await request(app.getHttpServer())
        .put('/admin/applications/1/status')
        .set('x-current-user', JSON.stringify(mockUser))
        .send({ isApproved: true })
        .expect(401);
      expect(applicationService.updateApplicationStatus).toHaveBeenCalled();
    });
  });
});
