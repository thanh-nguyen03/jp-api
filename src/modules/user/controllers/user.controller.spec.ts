import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import * as request from 'supertest';
import { UserController } from './user.controller';
import { UserService } from '../user.service';
import { Role, User } from '@prisma/client';
import ResponseDto from '../../../constants/response.dto';
import { ChangePasswordDto } from '../dtos/change-password.dto';

describe('UserController - PUT /users/change-password (Integration)', () => {
  let app: INestApplication;
  let userService: jest.Mocked<UserService>;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'hashed',
    displayName: 'John Doe',
    avatar: 'avatar.png',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    companyId: 1,
  };

  const mockChangePasswordDto: ChangePasswordDto = {
    currentPassword: 'oldPass123',
    newPassword: 'newPass123',
  };

  beforeEach(async () => {
    const userServiceMock = {
      changePassword: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: userServiceMock,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    userService = module.get<UserService>(
      UserService,
    ) as jest.Mocked<UserService>;

    // Middleware to set request.user from x-current-user header
    app.use((req, res, next) => {
      console.log('Request headers:', req.headers); // Debug: Log headers
      const userData = req.headers['x-current-user']
        ? JSON.parse(req.headers['x-current-user'])
        : null;
      if (userData) {
        // Convert createdAt and updatedAt to Date objects
        req.user = {
          ...userData,
          createdAt: new Date(userData.createdAt),
          updatedAt: new Date(userData.updatedAt),
        };
      } else {
        req.user = null;
      }
      next();
    });

    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  // TC1: Valid user and valid ChangePasswordDto - Success
  it('TC1: should return success response for valid user and DTO', async () => {
    userService.changePassword.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .put('/users/change-password')
      .set('x-current-user', JSON.stringify(mockUser))
      .send(mockChangePasswordDto)
      .expect(200);

    expect(userService.changePassword).toHaveBeenCalledWith(
      mockChangePasswordDto,
      mockUser,
    );
    expect(response.body).toEqual(ResponseDto.successDefault(undefined));
  });

  // TC2: Null user - Unauthorized (401)
  it('TC2: should return 401 for null user', async () => {
    await request(app.getHttpServer())
      .put('/users/change-password')
      .send(mockChangePasswordDto)
      .expect(401);

    expect(userService.changePassword).not.toHaveBeenCalled();
  });

  // TC3: Service throws error - Propagates error
  it('TC3: should return 400 for invalid current password', async () => {
    const error = new BadRequestException('Invalid current password');
    userService.changePassword.mockRejectedValue(error);

    await request(app.getHttpServer())
      .put('/users/change-password')
      .set('x-current-user', JSON.stringify(mockUser))
      .send(mockChangePasswordDto)
      .expect(400);

    expect(userService.changePassword).toHaveBeenCalledWith(
      mockChangePasswordDto,
      mockUser,
    );
  });

  // TC4: Invalid ChangePasswordDto - Validation error (400)
  it('TC4: should return 400 for invalid DTO', async () => {
    const invalidDto = {
      currentPassword: '', // Violates @IsNotEmpty
      newPassword: '123', // Violates @MinLength(6)
    };

    await request(app.getHttpServer())
      .put('/users/change-password')
      .set('x-current-user', JSON.stringify(mockUser))
      .send(invalidDto)
      .expect(400);

    expect(userService.changePassword).not.toHaveBeenCalled();
  });
});
