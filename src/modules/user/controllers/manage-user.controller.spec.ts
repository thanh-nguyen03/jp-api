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
      /**
       * Test Case: TC01_MUC_AllUsers_NoFilter
       * Objective: Verify that all users are returned when no filters are applied
       * Input: No query parameters
       * Expected Output: Array of all users with correct fields and date formats
       * Notes: Ensures basic endpoint functionality for admin access
       */
      it('TC01_MUC_AllUsers_NoFilter', async () => {
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
      /**
       * Test Case: TC02_MUC_Users_FilterByEmail
       * Objective: Verify that users can be filtered by email
       * Input: Query param `email=jane@example.com`
       * Expected Output: Array containing only users with matching email
       * Notes: Filters by unique email value
       */
      it('TC02_MUC_Users_FilterByEmail', async () => {
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
      /**
       * Test Case: TC03_MUC_Users_FilterByName
       * Objective: Verify that users can be filtered by name
       * Input: Query param `name=John`
       * Expected Output: Array of users whose first or last name includes "John"
       * Notes: Tests name-based search functionality
       */
      it('TC03_MUC_Users_FilterByName', async () => {
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
      /**
       * Test Case: TC04_MUC_Users_EmptyResult
       * Objective: Verify that endpoint returns an empty array when no user matches filter
       * Input: Query param `name=NonExistent`
       * Expected Output: Empty array with success response
       * Notes: Validates empty results without error
       */
      it('TC04_MUC_Users_EmptyResult_should return empty array when no users match filter', async () => {
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
      /**
       * Test Case: TC05_MUC_Users_ServiceError
       * Objective: Verify that 500 error is returned when service throws an error
       * Input: Query param `name=John` with service throwing exception
       * Expected Output: HTTP 500 error
       * Notes: Simulates service layer failure
       */
      it('TC05_MUC_Users_ServiceError_should return 500 for service error', async () => {
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
      /**
       * Test Case: TC06_MUC_Users_Unauthorized
       * Objective: Verify that request without current user is rejected
       * Input: No `x-current-user` header
       * Expected Output: HTTP 401 Unauthorized
       * Notes: Validates auth guard behavior
       */
      it('TC06_MUC_Users_Unauthorized_should return 401 when no user is provided', async () => {
        await request(app.getHttpServer()).get('/api/admin/users').expect(401);

        expect(userService.findAll).not.toHaveBeenCalled();
      });

      /**
       * Test Case: TC07_MUC_Users_ForbiddenRole
       * Objective: Verify that user with non-admin role is forbidden
       * Input: Valid user with role USER
       * Expected Output: HTTP 403 Forbidden
       * Notes: Ensures role-based access control is enforced
       */
      it('TC07_MUC_Users_ForbiddenRole_should return 403 for invalid role', async () => {
        const invalidUser = { ...mockUser, role: Role.USER };

        await request(app.getHttpServer())
          .get('/api/admin/users')
          .set('x-current-user', JSON.stringify(invalidUser))
          .expect(403);

        expect(userService.findAll).not.toHaveBeenCalled();
      });
    });

    describe('GET /api/admin/users/:id', () => {
      /**
       * Test Case: TC08_MUC_UserDetails_ValidId
       * Objective: Verify that valid user ID returns detailed user info
       * Input: ID = 1
       * Expected Output: JSON with user data and string-formatted dates
       * Notes: Valid ID, authorized request
       */
      it('TC08_MUC_UserDetails_ValidId_should return user details for valid ID', async () => {
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
      /**
       * Test Case: TC09_MUC_UserDetails_NotFound
       * Objective: Verify that non-existent user ID returns 404
       * Input: ID = 999
       * Expected Output: HTTP 404 Not Found
       * Notes: User does not exist in DB
       */
      it('TC09_MUC_UserDetails_NotFound_should return 404 for non-existent user', async () => {
        userService.getUserById.mockRejectedValue(
          new NotFoundException('User not found'),
        );

        await request(app.getHttpServer())
          .get('/api/admin/users/999')
          .set('x-current-user', JSON.stringify(mockUser))
          .expect(404);

        expect(userService.getUserById).toHaveBeenCalledWith(999);
      });
      /**
       * Test Case: TC10_MUC_UserDetails_ServiceError
       * Objective: Verify that 500 error is returned when service throws an error
       * Input: ID = 1, service throws exception
       * Expected Output: HTTP 500 Internal Server Error
       * Notes: Simulates backend failure scenario
       */
      it('TC10_MUC_UserDetails_ServiceError_should return 500 for service error', async () => {
        const error = new Error('Service error');
        userService.getUserById.mockRejectedValue(error);

        await request(app.getHttpServer())
          .get('/api/admin/users/1')
          .set('x-current-user', JSON.stringify(mockUser))
          .expect(500);

        expect(userService.getUserById).toHaveBeenCalledWith(1);
      });
      /**
       * Test Case: TC11_MUC_UserDetails_InvalidId
       * Objective: Verify that invalid ID format returns 400
       * Input: ID = 'invalid-id'
       * Expected Output: HTTP 400 Bad Request
       * Notes: Ensures input validation catches wrong format
       */

      it('TC11_MUC_UserDetails_InvalidId_should return 400 for invalid ID format', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/users/invalid-id')
          .set('x-current-user', JSON.stringify(mockUser))
          .expect(400);

        expect(userService.getUserById).not.toHaveBeenCalled();
      });
      /**
       * Test Case: TC12_MUC_UserDetails_Unauthorized
       * Objective: Verify that request without current user is rejected
       * Input: No `x-current-user` header
       * Expected Output: HTTP 401 Unauthorized
       * Notes: Validates authentication enforcement
       */
      it('TC12_MUC_UserDetails_Unauthorized_should return 401 when no user is provided', async () => {
        await request(app.getHttpServer())
          .get('/api/admin/users/1')
          .expect(401);

        expect(userService.getUserById).not.toHaveBeenCalled();
      });
      /**
       * Test Case: TC13_MUC_UserDetails_ForbiddenRole
       * Objective: Verify that user with USER role cannot access user details
       * Input: Valid ID, role: USER
       * Expected Output: HTTP 403 Forbidden
       * Notes: Ensures role-based permission checks
       */
      it('TC13_MUC_UserDetails_ForbiddenRole_should return 403 for invalid role', async () => {
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
