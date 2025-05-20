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

  /**
   * Test Case: TC01_UC_ChangePassword_Success
   * Objective: Verify successful password change with valid user and input
   * Input: Valid x-current-user header, valid ChangePasswordDto
   * Expected Output: 200 OK, changePassword() called with correct args
   */
  it('TC01_UC_ChangePassword_Success', async () => {
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

  /**
   * Test Case: TC02_UC_ChangePassword_Unauthorized
   * Objective: Ensure unauthorized access is blocked if no user in request
   * Input: No x-current-user header
   * Expected Output: 401 Unauthorized, service not called
   */
  it('TC02_UC_ChangePassword_Unauthorized', async () => {
    await request(app.getHttpServer())
      .put('/users/change-password')
      .send(mockChangePasswordDto)
      .expect(401);

    expect(userService.changePassword).not.toHaveBeenCalled();
  });

  /**
   * Test Case: TC03_UC_ChangePassword_BadRequest
   * Objective: Propagate error if service throws BadRequestException
   * Input: Valid user, valid DTO, service throws BadRequestException
   * Expected Output: 400 Bad Request, proper error response
   */
  it('Test Case: TC03_UC_ChangePassword_BadRequest', async () => {
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

  /**
   * Test Case: TC04_UC_ChangePassword_InvalidDTO
   * Objective: Validate input fields and block bad DTO data
   * Input: Empty currentPassword, short newPassword
   * Expected Output: 400 Bad Request, validation failure
   */
  it('TC04_UC_ChangePassword_InvalidDTO', async () => {
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
