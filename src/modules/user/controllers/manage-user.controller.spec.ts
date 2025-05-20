// import { Test, TestingModule } from '@nestjs/testing';
// import { ManageUserController } from './manage-user.controller';
// import { UserService } from '../user.service';
// import { Role, User } from '@prisma/client';
// import ResponseDto from '../../../constants/response.dto';
// import { NotFoundException, BadRequestException } from '@nestjs/common';
// import { UserFilter } from '../dtos/user-filter.dto';

// describe('ManageUserController', () => {
//   let controller: ManageUserController;
//   let userService: jest.Mocked<UserService>;

//   const mockUser: User = {
//     id: 1,
//     email: 'test@example.com',
//     firstName: 'John',
//     lastName: 'Doe',
//     password: 'hashed',
//     displayName: 'John Doe',
//     avatar: 'avatar.png',
//     role: Role.ADMIN,
//     createdAt: new Date(),
//     updatedAt: new Date(),
//     companyId: 1,
//   };

//   const mockUsers: User[] = [
//     mockUser,
//     {
//       ...mockUser,
//       id: 2,
//       email: 'jane@example.com',
//       firstName: 'Jane',
//       displayName: 'Jane Doe',
//       role: Role.COMPANY_HR,
//     },
//   ];

//   beforeEach(async () => {
//     const userServiceMock = {
//       findAll: jest.fn(),
//       getUserById: jest.fn(),
//     };

//     const module: TestingModule = await Test.createTestingModule({
//       controllers: [ManageUserController],
//       providers: [
//         {
//           provide: UserService,
//           useValue: userServiceMock,
//         },
//       ],
//     }).compile();

//     controller = module.get<ManageUserController>(ManageUserController);
//     userService = module.get<UserService>(
//       UserService,
//     ) as jest.Mocked<UserService>;
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   describe('getAll', () => {
//     // TC1: Get all users – no filters
//     it('TC1: should return all users without filters', async () => {
//       const filter: UserFilter = {};
//       userService.findAll.mockResolvedValue(mockUsers);

//       const result = await controller.getAll(filter);

//       expect(userService.findAll).toHaveBeenCalledWith(filter);
//       expect(result).toEqual(ResponseDto.successDefault(mockUsers));
//     });

//     // TC2: Get users with email filter (replacing role filter)
//     it('TC2: should return users filtered by email', async () => {
//       const filter: UserFilter = { email: 'jane@example.com' };
//       const filteredUsers = [mockUsers[1]];
//       userService.findAll.mockResolvedValue(filteredUsers);

//       const result = await controller.getAll(filter);

//       expect(userService.findAll).toHaveBeenCalledWith(filter);
//       expect(result).toEqual(ResponseDto.successDefault(filteredUsers));
//     });

//     // TC3: Get users with name filter
//     it('TC3: should return users filtered by name', async () => {
//       const filter: UserFilter = { name: 'John' };
//       const filteredUsers = [mockUsers[0]];
//       userService.findAll.mockResolvedValue(filteredUsers);

//       const result = await controller.getAll(filter);

//       expect(userService.findAll).toHaveBeenCalledWith(filter);
//       expect(result).toEqual(ResponseDto.successDefault(filteredUsers));
//     });

//     // TC4: Get users – empty result
//     it('TC4: should return empty array when no users match filter', async () => {
//       const filter: UserFilter = { name: 'NonExistent' };
//       userService.findAll.mockResolvedValue([]);

//       const result = await controller.getAll(filter);

//       expect(userService.findAll).toHaveBeenCalledWith(filter);
//       expect(result).toEqual(ResponseDto.successDefault([]));
//     });

//     // TC5: Get users – service throws error
//     it('TC5: should propagate service error', async () => {
//       const filter: UserFilter = { name: 'John' };
//       const error = new Error('Service error');
//       userService.findAll.mockRejectedValue(error);

//       await expect(controller.getAll(filter)).rejects.toThrow(error);
//       expect(userService.findAll).toHaveBeenCalledWith(filter);
//     });
//   });

//   describe('getDetail', () => {
//     // TC6: Get user by ID – valid
//     it('TC6: should return user details for valid ID', async () => {
//       userService.getUserById.mockResolvedValue(mockUser);

//       const result = await controller.getDetail(1);

//       expect(userService.getUserById).toHaveBeenCalledWith(1);
//       expect(result).toEqual(ResponseDto.successDefault(mockUser));
//     });

//     // TC7: Get user by ID – user not found
//     it('TC7: should throw NotFoundException for non-existent user', async () => {
//       userService.getUserById.mockRejectedValue(
//         new NotFoundException('User not found'),
//       );

//       await expect(controller.getDetail(999)).rejects.toThrow(
//         NotFoundException,
//       );
//       expect(userService.getUserById).toHaveBeenCalledWith(999);
//     });

//     // TC8: Get user by ID – service throws error
//     it('TC8: should propagate service error', async () => {
//       const error = new Error('Service error');
//       userService.getUserById.mockRejectedValue(error);

//       await expect(controller.getDetail(1)).rejects.toThrow(error);
//       expect(userService.getUserById).toHaveBeenCalledWith(1);
//     });

//     // TC9: Get user by ID – invalid ID type
//     it('TC9: should throw BadRequestException for non-numeric ID', async () => {
//       jest.spyOn(userService, 'getUserById').mockClear();

//       await expect(controller.getDetail(NaN)).rejects.toThrow(
//         BadRequestException,
//       );
//       expect(userService.getUserById).not.toHaveBeenCalled();
//     });
//   });
// });

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ExecutionContext,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as request from 'supertest';
import { ManageUserController } from './manage-user.controller';
import { UserService } from '../user.service';
import { Role, User } from '@prisma/client';
import ResponseDto from '../../../constants/response.dto';

describe('ManageUserController', () => {
  let app: INestApplication;
  let userService: jest.Mocked<UserService>;

  // Fixed mock dates to avoid flakiness (not `new Date()` at runtime)
  const fixedCreatedAt = new Date('2025-05-17T11:43:57.328Z');
  const fixedUpdatedAt = new Date('2025-05-17T11:43:57.328Z');

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    password: 'hashed',
    displayName: 'John Doe',
    avatar: 'avatar.png',
    role: Role.ADMIN,
    createdAt: fixedCreatedAt,
    updatedAt: fixedUpdatedAt,
    companyId: 1,
  };

  const mockUsers: User[] = [
    mockUser,
    {
      ...mockUser,
      id: 2,
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      displayName: 'Jane Doe',
      role: Role.COMPANY_HR,
    },
  ];

  beforeEach(async () => {
    const userServiceMock = {
      findAll: jest.fn(),
      getUserById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ManageUserController],
      providers: [
        {
          provide: UserService,
          useValue: userServiceMock,
        },
      ],
    }).compile();

    app = module.createNestApplication();

    userService = module.get(UserService) as jest.Mocked<UserService>;

    // Mock the CurrentUser decorator to pull user info from request header x-current-user
    jest
      .spyOn(
        require('../../../decorators/current-user.decorator'),
        'CurrentUser',
      )
      .mockImplementation(() => (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        if (req.headers['x-current-user']) {
          const userRaw = JSON.parse(req.headers['x-current-user']);
          return {
            ...userRaw,
            createdAt: new Date(userRaw.createdAt),
            updatedAt: new Date(userRaw.updatedAt),
          };
        }
        return null;
      });

    // Middleware to parse x-current-user header and attach user to request
    app.use((req, res, next) => {
      if (req.headers['x-current-user']) {
        const rawUser = JSON.parse(req.headers['x-current-user']);
        req.user = {
          ...rawUser,
          createdAt: new Date(rawUser.createdAt),
          updatedAt: new Date(rawUser.updatedAt),
        };
      }
      next();
    });

    app.setGlobalPrefix('api');

    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  describe('GET /api/manage/users', () => {
    describe('GET /api/admin/users', () => {
      it('should return all users without filters', async () => {
        userService.findAll.mockResolvedValue(mockUsers);

        const response = await request(app.getHttpServer())
          .get('/api/admin/users')
          .set('x-current-user', JSON.stringify(mockUser))
          .expect(200);

        const mockUsersWithStringDates = mockUsers.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          role: user.role.toString(),
        }));

        expect(userService.findAll).toHaveBeenCalledWith({});
        expect(response.body).toEqual(
          ResponseDto.successDefault(mockUsersWithStringDates),
        );
      });

      it('should return users filtered by email', async () => {
        const filter = { email: 'jane@example.com' };
        const filteredUsers = mockUsers.filter(
          (user) => user.email === 'jane@example.com',
        );
        const filteredUsersWithStringDates = filteredUsers.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          role: user.role.toString(),
        }));

        userService.findAll.mockResolvedValue(filteredUsers);

        const response = await request(app.getHttpServer())
          .get('/api/admin/users')
          .query(filter)
          .set('x-current-user', JSON.stringify(mockUser))
          .expect(200);

        expect(userService.findAll).toHaveBeenCalledWith(filter);
        expect(response.body).toEqual(
          ResponseDto.successDefault(filteredUsersWithStringDates),
        );
      });

      it('should return users filtered by name', async () => {
        const filter = { name: 'John' };
        const filteredUsers = mockUsers.filter(
          (user) =>
            user.firstName.includes('John') || user.lastName.includes('John'),
        );

        const filteredUsersWithStringDates = filteredUsers.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          role: user.role.toString(),
        }));

        userService.findAll.mockResolvedValue(filteredUsers);

        const response = await request(app.getHttpServer())
          .get('/api/admin/users')
          .query(filter)
          .set('x-current-user', JSON.stringify(mockUser))
          .expect(200);

        expect(userService.findAll).toHaveBeenCalledWith(filter);
        expect(response.body).toEqual(
          ResponseDto.successDefault(filteredUsersWithStringDates),
        );
      });

      it('should return empty array when no users match filter', async () => {
        const filter = { name: 'NonExistent' };
        userService.findAll.mockResolvedValue([]);

        const response = await request(app.getHttpServer())
          .get('/api/admin/users')
          .query(filter)
          .set('x-current-user', JSON.stringify(mockUser))
          .expect(200);

        expect(userService.findAll).toHaveBeenCalledWith(filter);
        expect(response.body).toEqual(ResponseDto.successDefault([]));
      });

      it('should return 500 for service error', async () => {
        const filter = { name: 'John' };
        const error = new Error('Service error');
        userService.findAll.mockRejectedValue(error);

        await request(app.getHttpServer())
          .get('/api/admin/users')
          .query(filter)
          .set('x-current-user', JSON.stringify(mockUser))
          .expect(500);

        expect(userService.findAll).toHaveBeenCalledWith(filter);
      });

      it('should return 401 when no user is provided', async () => {
        await request(app.getHttpServer()).get('/api/admin/users').expect(401);

        expect(userService.findAll).not.toHaveBeenCalled();
      });

      it('should return 403 for invalid role', async () => {
        const invalidUser = { ...mockUser, role: Role.USER };

        await request(app.getHttpServer())
          .get('/api/admin/users')
          .set('x-current-user', JSON.stringify(invalidUser))
          .expect(403);

        expect(userService.findAll).not.toHaveBeenCalled();
      });
    });

    describe('GET /api/admin/users/:id', () => {
      it('should return user details for valid ID', async () => {
        userService.getUserById.mockResolvedValue(mockUser);

        const response = await request(app.getHttpServer())
          .get('/api/admin/users/1')
          .set('x-current-user', JSON.stringify(mockUser))
          .expect(200);

        // convert mockUser dates to strings to match response format
        const mockUserWithStringDates = {
          ...mockUser,
          createdAt: mockUser.createdAt.toISOString(),
          updatedAt: mockUser.updatedAt.toISOString(),
          role: mockUser.role.toString(),
        };

        expect(userService.getUserById).toHaveBeenCalledWith(1);
        expect(response.body).toEqual(
          ResponseDto.successDefault(mockUserWithStringDates),
        );
      });

      it('should return 404 for non-existent user', async () => {
        userService.getUserById.mockRejectedValue(
          new NotFoundException('User not found'),
        );

        await request(app.getHttpServer())
          .get('/api/admin/users/999')
          .set('x-current-user', JSON.stringify(mockUser))
          .expect(404);

        expect(userService.getUserById).toHaveBeenCalledWith(999);
      });

      it('should return 500 for service error', async () => {
        const error = new Error('Service error');
        userService.getUserById.mockRejectedValue(error);

        await request(app.getHttpServer())
          .get('/api/admin/users/1')
          .set('x-current-user', JSON.stringify(mockUser))
          .expect(500);

        expect(userService.getUserById).toHaveBeenCalledWith(1);
      });

      it('should return 400 for invalid ID format', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/users/invalid-id')
          .set('x-current-user', JSON.stringify(mockUser))
          .expect(400);

        expect(userService.getUserById).not.toHaveBeenCalled();
      });

      it('should return 401 when no user is provided', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/users/1')
          .expect(401);

        expect(userService.getUserById).not.toHaveBeenCalled();
      });

      it('should return 403 for invalid role', async () => {
        const invalidUser = { ...mockUser, role: Role.USER };

        await request(app.getHttpServer())
          .get('/api/admin/users/1')
          .set('x-current-user', JSON.stringify(invalidUser))
          .expect(403);

        expect(userService.getUserById).not.toHaveBeenCalled();
      });
    });
  });
});
