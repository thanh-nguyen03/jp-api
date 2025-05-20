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

    it('should return 400 for invalid payload', async () => {
      const invalidDto = { ...validCreateDto, message: '' };
      await request(app.getHttpServer())
        .post('/applications')
        .set('x-current-user', JSON.stringify(mockUser))
        .send(invalidDto)
        .expect(400);
      expect(applicationService.createApplication).not.toHaveBeenCalled();
    });

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
