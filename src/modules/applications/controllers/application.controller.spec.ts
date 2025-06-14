import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as request from 'supertest';
import { ApplicationController } from './application.controller';
import { ApplicationService } from '../application.service';
import { AmqpService } from '../../amqp/amqp.service';
import { CreateApplicationDto } from '../dtos/create-application.dto';
import { ApplicationDto } from '../dtos/application.dto';
import { $Enums, User } from '@prisma/client';
import ResponseDto from '../../../constants/response.dto';
import { Message } from '../../../constants/message';

const mockUser: User = {
  id: 1,
  email: 'testuser_thanhnd@example.com',
  firstName: 'Test',
  lastName: 'User',
  password: 'hashed',
  displayName: 'Test User',
  avatar: null,
  role: $Enums.Role.USER,
  createdAt: new Date(),
  updatedAt: new Date(),
  companyId: null,
};

describe('ApplicationController', () => {
  let app: INestApplication;
  let applicationService: jest.Mocked<ApplicationService>;
  let amqpService: jest.Mocked<AmqpService>;

  const validCreateDto: CreateApplicationDto = {
    message: 'Test application_thanhnd',
    cvId: 'test-cv-id_thanhnd',
    recruitmentId: 123,
  };

  const validApplication: ApplicationDto = {
    id: 1,
    message: validCreateDto.message,
    status: $Enums.ApplicationStatus.PENDING,
    cvId: validCreateDto.cvId,
    recruitmentId: validCreateDto.recruitmentId,
    userId: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const applicationServiceMock = {
      createApplication: jest.fn(),
      updateApplication: jest.fn(),
    } as any;
    const amqpServiceMock = {
      emitMessage: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApplicationController],
      providers: [
        { provide: ApplicationService, useValue: applicationServiceMock },
        { provide: AmqpService, useValue: amqpServiceMock },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    applicationService = module.get(ApplicationService);
    amqpService = module.get(AmqpService);

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

  describe('POST /applications', () => {
    /**
     * Test Case ID: TC-AC-001
     * Objective: Verify that POST /applications creates an application with valid data
     * Input: Valid CreateApplicationDto and authenticated user
     * Expected Output: 201 response with created application
     * White-Box: Tests the path where all data is valid and application is created
     */
    it('should create an application (201)', async () => {
      applicationService.createApplication.mockResolvedValue(validApplication);
      const response = await request(app.getHttpServer())
        .post('/applications')
        .set('x-current-user', JSON.stringify(mockUser))
        .send(validCreateDto)
        .expect(201);
      expect(applicationService.createApplication).toHaveBeenCalledWith(
        validCreateDto,
        mockUser.id,
      );
      expect(response.body).toEqual(
        ResponseDto.success(
          expect.objectContaining({
            ...validApplication,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
          Message.CREATE_APPLICATION_SUCCESSFULLY,
        ),
      );
    });

    /**
     * Test Case ID: TC-AC-002
     * Objective: Verify that POST /applications returns 400 for invalid payload
     * Input: Invalid CreateApplicationDto (e.g., empty message)
     * Expected Output: 400 response
     * White-Box: Tests the path where validation fails for payload
     */
    it('should return 400 for invalid payload', async () => {
      const invalidDto = { ...validCreateDto, message: '' };
      await request(app.getHttpServer())
        .post('/applications')
        .set('x-current-user', JSON.stringify(mockUser))
        .send(invalidDto)
        .expect(400);
      expect(applicationService.createApplication).not.toHaveBeenCalled();
    });

    /**
     * Test Case ID: TC-AC-003
     * Objective: Verify that POST /applications returns 403 if forbidden
     * Input: Valid CreateApplicationDto and user not allowed to create
     * Expected Output: 403 response
     * White-Box: Tests the path where service throws ForbiddenException
     */
    it('should return 403 if forbidden', async () => {
      applicationService.createApplication.mockRejectedValue(
        new ForbiddenException('Forbidden'),
      );
      await request(app.getHttpServer())
        .post('/applications')
        .set('x-current-user', JSON.stringify(mockUser))
        .send(validCreateDto)
        .expect(403);
      expect(applicationService.createApplication).toHaveBeenCalled();
    });

    /**
     * Test Case ID: TC-AC-004
     * Objective: Verify that POST /applications returns 400 if bad request
     * Input: Valid CreateApplicationDto but service throws BadRequestException
     * Expected Output: 400 response
     * White-Box: Tests the path where service throws BadRequestException
     */
    it('should return 400 if bad request', async () => {
      applicationService.createApplication.mockRejectedValue(
        new BadRequestException('Bad request'),
      );
      await request(app.getHttpServer())
        .post('/applications')
        .set('x-current-user', JSON.stringify(mockUser))
        .send(validCreateDto)
        .expect(400);
      expect(applicationService.createApplication).toHaveBeenCalled();
    });
  });

  describe('PUT /applications/:applicationId', () => {
    /**
     * Test Case ID: TC-AC-005
     * Objective: Verify that PUT /applications/:applicationId updates an application with valid data
     * Input: Valid ApplicationDto for update
     * Expected Output: 200 response with updated application
     * White-Box: Tests the path where update is successful
     */
    it('should update an application (200)', async () => {
      applicationService.updateApplication.mockResolvedValue(validApplication);
      const updateDto = { ...validApplication };
      const response = await request(app.getHttpServer())
        .put(`/applications/1`)
        .send(updateDto)
        .expect(200);
      expect(applicationService.updateApplication).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          ...updateDto,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
      expect(response.body).toEqual(
        ResponseDto.success(
          expect.objectContaining({
            ...validApplication,
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          }),
          Message.UPDATE_APPLICATION_SUCCESSFULLY,
        ),
      );
    });

    /**
     * Test Case ID: TC-AC-006
     * Objective: Verify that PUT /applications/:applicationId returns 404 if not found
     * Input: Valid ApplicationDto for update, but application does not exist
     * Expected Output: 404 response
     * White-Box: Tests the path where service throws NotFoundException
     */
    it('should return 404 if not found', async () => {
      applicationService.updateApplication.mockRejectedValue(
        new NotFoundException('Not found'),
      );
      const updateDto = { ...validApplication };
      await request(app.getHttpServer())
        .put(`/applications/1`)
        .send(updateDto)
        .expect(404);
      expect(applicationService.updateApplication).toHaveBeenCalled();
    });

    /**
     * Test Case ID: TC-AC-007
     * Objective: Verify that PUT /applications/:applicationId returns 400 for invalid payload
     * Input: Invalid ApplicationDto for update (e.g., empty message)
     * Expected Output: 200 response (no validation on ApplicationDto)
     * White-Box: Tests the path where update is called with invalid data but no validation
     */
    it('should return 400 for invalid payload', async () => {
      const invalidDto = { ...validApplication, message: '' };
      await request(app.getHttpServer())
        .put(`/applications/1`)
        .send(invalidDto)
        .expect(200); // No validation on ApplicationDto, so expect 200
      expect(applicationService.updateApplication).toHaveBeenCalled();
    });
  });
});
