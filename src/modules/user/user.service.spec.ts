import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UserServiceImpl } from './user.service';
import { UserFilter } from './dtos/user-filter.dto';
import { INestApplication } from '@nestjs/common';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Role, $Enums } from '@prisma/client';
import { Message } from '../../constants/message';
import * as bcrypt from 'bcrypt';

// Note: Using the same database as production, so we must ensure cleanup after each test
describe('UserServiceImpl - findAll (Same DB)', () => {
  let app: INestApplication;
  let userService: UserServiceImpl;
  let prismaService: PrismaService;

  // Setup testing module before all tests
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserServiceImpl,
        PrismaService, // Uses the same PrismaService as production
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    userService = module.get<UserServiceImpl>(UserServiceImpl);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // Clean up before each test to remove potential residual data
  beforeEach(async () => {
    const residual = await prismaService.user.findMany({
      where: { email: { contains: 'test1-' } },
    });
    // await prismaService.application.deleteMany({
    //   where: { user: { email: { contains: 'test-' } } },
    // });
    // await prismaService.recruitment.deleteMany({
    //   where: {
    //     company: {
    //       users: { some: { email: { contains: 'test-' } } },
    //     },
    //   },
    // });
    // await prismaService.company.deleteMany({
    //   where: {
    //     users: { some: { email: { contains: 'test-' } } },
    //   },
    // });
    await prismaService.user.deleteMany({
      where: {
        OR: [
          { firstName: { contains: 'John' } },
          { lastName: { contains: 'John' } },
          { email: { contains: 'test-' } },
          { email: { contains: 'test1-' } },
          {
            email: {
              in: [
                'john.doe@example.com',
                'jane.smith@example.com',
                'bob@example.com',
                'alice@example.com',
                'jane.smith@other.com',
                'john.johnson@example.com',
                'john.doe@test.com',
                'john.doe@testt.com',
                'bb@example.com',
                'aice@example.com',
                'bbb@example.com',
                'aiice@example.com',
                'test1-aiice@example.com',
                'test1-bbb@example.com',
              ],
            },
          },
        ],
      },
    });
  });

  // Clean up after each test to prevent data pollution
  afterEach(async () => {
    // await prismaService.application.deleteMany({
    //   where: { user: { email: { contains: 'test-' } } },
    // });
    // await prismaService.recruitment.deleteMany({
    //   where: {
    //     company: {
    //       users: { some: { email: { contains: 'test-' } } },
    //     },
    //   },
    // });
    // await prismaService.company.deleteMany({
    //   where: {
    //     users: { some: { email: { contains: 'test-' } } },
    //   },
    // });
    await prismaService.user.deleteMany({
      where: {
        OR: [
          {
            email: {
              contains: 'test1-',
            },
          },
          { email: { contains: 'test-' } },
          { email: { contains: '-example1.com' } },
          {
            email: {
              in: [
                'john.doe@example.com',
                'jane.smith@example.com',
                'bob@example.com',
                'alice@example.com',
                'jane.smith@other.com',
                'john.johnson@example.com',
                'john.doe@test.com',
                'john.doe@testt.com',
                'bb@example.com',
                'aice@example.com',
                'bbb@example.com',
                'aiice@example.com',
                'test1-aiice@example.com',
                'test1-bbb@example.com',
              ],
            },
          },
        ],
      },
    });
    // });
  });

  // Close database connection after all tests
  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  // Common test data setup with unique email
  const baseUserData = (
    email: string,
    firstName: string,
    lastName: string,
  ) => ({
    email,
    firstName,
    lastName,
    password: 'hashed',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    companyId: null,
    displayName: `${firstName} ${lastName}`,
    avatar: null,
  });

  /**
   * Test Case: TC01_US_FindAll_NameFilter
   * Objective: Verify that findAll returns users matching the provided name filter
   * Input: UserFilter { name: 'John', email: '', sort: [] }
   * Expected Output: Array of UserDto objects with firstName and lastName containing 'John'
   * Notes: Uses production database with cleanup. Inserts data outside transaction for visibility.
   */
  describe('TC01_US_FindAll_NameFilter', () => {
    it('should return users matching the name filter', async () => {
      // Test Case Metadata
      /**
       * Test Case ID: TC-2.3.1
       * Objective: Verify that findAll returns users matching the provided name filter
       * Input: UserFilter { name: 'John' }
       * Expected Output: Array of UserDto objects with both firstName and lastName containing 'John'
       * Note: Inserts and cleans up test data in the production database. Adapted to findAll's AND condition for firstName and lastName. Data inserted outside transaction to ensure visibility to findAll.
       */

      // Arrange: Insert test data outside transaction to ensure visibility
      const uniqueEmail = `john.doe.${Date.now()}@example.com`;
      await prismaService.user.createMany({
        data: [
          baseUserData(uniqueEmail, 'John', 'Johnson'),
          baseUserData('jane.smith@example.com', 'Jane', 'Smith'),
        ],
      });

      // Verify inserted data
      const insertedUsers = await prismaService.user.findMany({
        where: { email: uniqueEmail },
      });
      expect(insertedUsers).toHaveLength(1);
      expect(insertedUsers[0]).toMatchObject({
        email: uniqueEmail,
        firstName: 'John',
        lastName: 'Johnson',
        displayName: 'John Johnson',
      });

      const filter: UserFilter = { name: 'John', email: '', sort: [] };

      // Act
      const result = await userService.findAll(filter);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        firstName: 'John',
        lastName: 'Johnson',
        email: uniqueEmail,
        role: Role.USER,
        companyId: null,
        displayName: 'John Johnson',
        avatar: null,
      });

      // Verify database state within transaction
      await prismaService.$transaction(async (tx) => {
        const dbUsers = await tx.user.findMany({
          where: {
            firstName: { contains: 'John' },
            lastName: { contains: 'John' },
          },
        });
        expect(dbUsers).toHaveLength(1);
        expect(dbUsers[0]).toMatchObject({
          email: uniqueEmail,
          firstName: 'John',
          lastName: 'Johnson',
          displayName: 'John Johnson',
        });
      });

      // Cleanup: Handled by afterEach
    });
  });
  /**
   * Test Case: TC02_US_FindAll_EmailFilter
   * Objective: Verify that findAll returns users matching the provided email filter
   * Input: UserFilter { name: '', email: 'example.com', sort: [] }
   * Expected Output: Array of UserDto objects with email containing 'example.com'
   * Notes: Uses production database with cleanup. Inserts data outside transaction for visibility.
   */
  describe('TC02_US_FindAll_EmailFilter', () => {
    it('should return users matching the email filter', async () => {
      // Arrange: Insert test data outside transaction to ensure visibility
      const uniqueEmail = `test-john.doe.${Date.now()}@example1.com`;
      await prismaService.user.createMany({
        data: [
          baseUserData(uniqueEmail, 'John', 'Doe'),
          baseUserData('test-jane.smith@other.com', 'Jane', 'Smith'),
        ],
      });

      // Verify inserted data
      const insertedUsers = await prismaService.user.findMany({
        where: { email: uniqueEmail },
      });
      console.log('TC-2.3.2 inserted users:', insertedUsers);
      expect(insertedUsers).toHaveLength(1);
      expect(insertedUsers[0]).toMatchObject({
        email: uniqueEmail,
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
      });

      const filter: UserFilter = { name: '', email: 'example1.com', sort: [] };

      // Act
      const result = await userService.findAll(filter);
      console.log('TC-2.3.2 findAll result:', result);
      console.log('TC-2.3.2 all users:', await prismaService.user.findMany({}));

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        email: uniqueEmail,
        firstName: 'John',
        lastName: 'Doe',
        role: Role.USER,
        companyId: null,
        displayName: 'John Doe',
        avatar: null,
      });
      //   expect(result[0]).not.toHaveProperty('password');

      // Verify database state within transaction for rollback
      await prismaService.$transaction(async (tx) => {
        const dbUsers = await tx.user.findMany({
          where: { email: { contains: 'example1.com' } },
        });
        expect(dbUsers).toHaveLength(1);
        expect(dbUsers[0]).toMatchObject({
          email: uniqueEmail,
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'John Doe',
        });
      });

      // Cleanup: Handled by afterEach
    });
  });

  /**
   * Test Case: TC03_US_FindAll_Sorted
   * Objective: Verify that findAll returns users sorted by firstName in ascending order
   * Input: UserFilter { name: '', email: 'test1-', sort: [{ field: 'firstName', direction: 'asc' }] }
   * Expected Output: Array of UserDto objects sorted by firstName in ascending order
   * Notes: Uses production database with cleanup. Inserts data outside transaction for visibility.
   */
  describe('TC03_US_FindAll_Sorted', () => {
    it('should return sorted users based on sort parameter', async () => {
      // Arrange: Insert test data outside transaction to ensure visibility
      await prismaService.user.createMany({
        data: [
          baseUserData('test1-bbb@example.com', 'Bob', 'Jones'),
          baseUserData('test1-aiice@example.com', 'Alice', 'Smith'),
        ],
      });

      // Verify inserted data
      const insertedUsers = await prismaService.user.findMany({
        where: {
          email: { in: ['test1-bbb@example.com', 'test1-aiice@example.com'] },
        },
      });
      console.log('TC-2.3.3 inserted users:', insertedUsers);
      expect(insertedUsers).toHaveLength(2);

      const filter: UserFilter = {
        name: '',
        email: 'test1-',
        sort: [{ field: 'firstName', direction: 'asc' }],
      };

      // Act
      const result = await userService.findAll(filter);
      console.log('TC-2.3.3 findAll result:', result);
      console.log('TC-2.3.3 all users:', await prismaService.user.findMany({}));

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        email: 'test1-aiice@example.com',
        firstName: 'Alice',
        lastName: 'Smith',
        displayName: 'Alice Smith',
      });
      expect(result[1]).toMatchObject({
        email: 'test1-bbb@example.com',
        firstName: 'Bob',
        lastName: 'Jones',
        displayName: 'Bob Jones',
      });

      // Verify database state within transaction for rollback
      await prismaService.$transaction(async (tx) => {
        const dbUsers = await tx.user.findMany({
          where: { email: { contains: 'test1-' } },
          orderBy: { firstName: 'asc' },
        });
        expect(dbUsers).toHaveLength(2);
        expect(dbUsers[0]).toMatchObject({
          email: 'test1-aiice@example.com',
          firstName: 'Alice',
          lastName: 'Smith',
          displayName: 'Alice Smith',
        });
        expect(dbUsers[1]).toMatchObject({
          email: 'test1-bbb@example.com',
          firstName: 'Bob',
          lastName: 'Jones',
          displayName: 'Bob Jones',
        });
      });

      // Cleanup: Handled by afterEach
    });
  });

  /**
   * Test Case: TC04_US_FindAll_NoMatches
   * Objective: Verify that findAll returns an empty array when no users match the name filter
   * Input: UserFilter { name: 'Nonexistent', email: '', sort: [] }
   * Expected Output: Empty array []
   * Notes: Uses production database with cleanup. Tests empty results.
   */
  describe('TC04_US_FindAll_NoMatches', () => {
    it('should return empty array when no users match the filter', async () => {
      await prismaService.$transaction(async (tx) => {
        // Arrange: Insert unrelated data
        const uniqueEmail = `john.doe.${Date.now()}@example.com`;
        await tx.user.create({
          data: baseUserData(uniqueEmail, 'John', 'Doe'),
        });

        const filter: UserFilter = { name: 'Nonexistent', email: '', sort: [] };

        // Act
        const result = await userService.findAll(filter);

        // Assert
        expect(result).toEqual([]);
        expect(result).toHaveLength(0);

        // Verify database state
        const dbUsers = await tx.user.findMany({
          where: {
            OR: [
              { firstName: { contains: 'Nonexistent' } },
              { lastName: { contains: 'Nonexistent' } },
            ],
          },
        });
        expect(dbUsers).toHaveLength(0);
      });
    });
  });
});

// Note: Using the same database as production, so we must ensure cleanup after each test
describe('UserServiceImpl - getUserById (Same DB)', () => {
  let app: INestApplication;
  let userService: UserServiceImpl;
  let prismaService: PrismaService;

  // Setup testing module before all tests
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserServiceImpl,
        PrismaService, // Uses the same PrismaService as production
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    userService = module.get<UserServiceImpl>(UserServiceImpl);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // Clean up before each test to remove potential residual data
  beforeEach(async () => {
    // ... (your existing beforeEach code)
    // Ensure all test data related to potential recruitments and companies is cleaned up
    const testUsers = await prismaService.user.findMany({
      where: { email: { contains: 'test-' } },
      include: { company: true },
    });

    const testUserIds = testUsers.map((u) => u.id);
    const testCompanyIds = testUsers
      .map((u) => u.companyId)
      .filter(Boolean) as number[];

    // Ensure applications are deleted first if they reference recruitments
    await prismaService.application.deleteMany({
      where: {
        OR: [
          { userId: { in: testUserIds } },
          // Add this if applications can be linked to recruitments from test companies directly
          // { recruitment: { companyId: { in: testCompanyIds } } }
        ],
      },
    });

    await prismaService.recruitment.deleteMany({
      where: { companyId: { in: testCompanyIds } },
    });

    await prismaService.company.deleteMany({
      where: { id: { in: testCompanyIds } },
    });
    await prismaService.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-' } },
          {
            email: {
              in: [
                'test-john.doe@example.com',
                'test-jane.smith@example.com',
                'test-bob@example.com',
                'test-alice@example.com',
              ],
            },
          },
        ],
      },
    });
  });

  // Clean up after each test to prevent data pollution
  afterEach(async () => {
    // ... (your existing afterEach code, ensure it's comprehensive)
    const testUsers = await prismaService.user.findMany({
      where: { email: { contains: 'test-' } },
      include: { company: true },
    });

    const testUserIds = testUsers.map((u) => u.id);
    const testCompanyIds = testUsers
      .map((u) => u.companyId)
      .filter(Boolean) as number[];

    await prismaService.application.deleteMany({
      where: { userId: { in: testUserIds } },
    });

    await prismaService.recruitment.deleteMany({
      where: { companyId: { in: testCompanyIds } },
    });

    await prismaService.company.deleteMany({
      where: { id: { in: testCompanyIds } },
    });
    await prismaService.user.deleteMany({
      where: { email: { contains: 'test-' } }, // Clean all test users
    });
  });

  // Close database connection after all tests
  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  // Common test data setup for User
  const baseUserData = (
    email: string,
    firstName: string,
    lastName: string,
    companyId?: number,
  ) => ({
    email,
    firstName,
    lastName,
    password: 'hashed', // Ensure this is appropriately handled or mocked if not testing auth
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    companyId,
    displayName: `${firstName} ${lastName}`,
    avatar: null,
  });

  // Common test data setup for Company
  const baseCompanyData = (name: string) => ({
    name,
    code: 'TECH123', // 3-10 characters
    description: 'A technology company specializing in software solutions.',
    address: '123 Tech Street, Innovation City',
    logo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Common test data setup for Recruitment
  const baseRecruitmentData = (title: string, companyId: number) => ({
    title,
    company: { connect: { id: companyId } },
    content: 'Job description for software engineer position.',
    // Use the $Enums.JobType for the jobType field
    jobType: $Enums.JobType.FULL_TIME, // Assuming FULL_TIME is a valid member of your JobType enum
    minSalary: 50000,
    maxSalary: 100000,
    experience: 2,
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Common test data setup for Application
  const baseApplicationData = (
    userId: number,
    recruitmentId: number,
    message = 'I am interested in this role.',
    cvId: string | null = null,
  ) => ({
    user: { connect: { id: userId } },
    recruitment: { connect: { id: recruitmentId } },
    message,
    // cvId, // Pass in the actual string or null
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  /**
   * Test Case: TC05_US_GetUserById_NoRelatedData
   * Objective: Verify that getUserById returns a user with no related company or applications
   * Input: Valid userId of an existing user
   * Expected Output: UserDto-like object with no company and empty applications array
   * Notes: Uses production database with cleanup. Inserts data outside transaction for visibility.
   */
  describe('TC05_US_GetUserById_NoRelatedData', () => {
    it('should return user without company or applications', async () => {
      // Test Case Metadata
      /**
       * Test Case ID: TC-1.1
       * Objective: Verify that getUserById returns a user with no related company or applications
       * Input: userId of an existing user
       * Expected Output: UserDto-like object with no company and empty applications array
       * Note: Inserts and cleans up test data in the production database. Data inserted outside transaction for visibility.
       * Assumes getUserById returns raw Prisma result including company and applications.
       */

      // Arrange: Insert test user outside transaction
      const email = `test-john.doe.${Date.now()}@example.com`;
      const user = await prismaService.user.create({
        data: baseUserData(email, 'John', 'Doe'),
      });

      // Act
      const result = await userService.getUserById(user.id);
      console.log('TC-1.1 getUserById result:', result);

      // Assert
      expect(result).toMatchObject({
        id: user.id,
        email,
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        role: Role.USER,
        companyId: null,
        company: null,
        applications: [],
      });
    });
  });

  /**
   * Test Case: TC06_US_GetUserById_WithRelatedData
   * Objective: Verify that getUserById returns a user with related company and applications
   * Input: Valid userId of an existing user with company and applications
   * Expected Output: UserDto-like object with company and applications including recruitment details
   * Notes: Uses production database with cleanup. Inserts data outside transaction for visibility.
   */
  describe('TC06_US_GetUserById_WithRelatedData', () => {
    it('should return user with company and applications', async () => {
      // Arrange: Insert test data outside transaction
      const email = `test-jane.smith.${Date.now()}@example.com`;
      const company = await prismaService.company.create({
        data: baseCompanyData('Tech Corp'),
      });
      const user = await prismaService.user.create({
        data: baseUserData(email, 'Jane', 'Smith', company.id),
      });

      // Ensure baseRecruitmentData provides all required fields as per your Prisma schema
      // and uses correct types.
      const recruitmentData = baseRecruitmentData(
        'Software Engineer',
        company.id,
      );

      const recruitment = await prismaService.recruitment.create({
        data: recruitmentData, // Use the modified baseRecruitmentData
      });
      const application = await prismaService.application.create({
        data: baseApplicationData(
          user.id,
          recruitment.id,
          'I am interested in this role.',
          // `cv-${Date.now()}.pdf`,
        ),
      });

      // Act
      const result = await userService.getUserById(user.id);
      console.log(
        'TC-1.2 getUserById result:',
        JSON.stringify(result, null, 2),
      ); // For better nested object logging

      // Assert
      expect(result).toMatchObject({
        id: user.id,
        email,
        firstName: 'Jane',
        lastName: 'Smith',
        displayName: 'Jane Smith',
        role: Role.USER,
        companyId: company.id,
        company: expect.objectContaining({
          id: company.id,
          name: 'Tech Corp',
        }),
        applications: expect.arrayContaining([
          expect.objectContaining({
            id: application.id,
            userId: user.id,
            recruitmentId: recruitment.id,
            message: 'I am interested in this role.',
            cvId: application.cvId, // Ensure cvId is asserted if it's part of the application data returned
            recruitment: expect.objectContaining({
              id: recruitment.id,
              title: 'Software Engineer',
              companyId: company.id,
              jobType: $Enums.JobType.FULL_TIME, // Assert with enum value
              experience: 2, // Assert with the numeric value used
              company: expect.objectContaining({
                id: company.id,
                name: 'Tech Corp',
              }),
            }),
          }),
        ]),
      });
    });
  });

  /**
   * Test Case: TC07_US_GetUserById_NonExistent
   * Objective: Verify that getUserById throws NotFoundException for a non-existent user ID
   * Input: Non-existent userId (999999)
   * Expected Output: NotFoundException with message including userId
   * Notes: Uses production database, no data insertion needed.
   */
  describe('TC07_US_GetUserById_NonExistent', () => {
    it('should throw NotFoundException for non-existent user ID', async () => {
      // Arrange
      const nonExistentId = 999999;

      // Act & Assert
      await expect(userService.getUserById(nonExistentId)).rejects.toThrow(
        new NotFoundException(Message.USER_NOT_FOUND(nonExistentId.toString())),
      );
    });
  });
});

// Note: Using the production database, so we must ensure cleanup of test users
describe('UserServiceImpl - getUserByEmail (Integration Tests with Real DB)', () => {
  let app: INestApplication;
  let userService: UserServiceImpl;
  let prismaService: PrismaService;

  // Setup testing module before all tests
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserServiceImpl,
        PrismaService, // Uses the real PrismaService
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    userService = module.get<UserServiceImpl>(UserServiceImpl);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // Clean up before each test to remove residual user data
  beforeEach(async () => {
    const residualUsers = await prismaService.user.findMany({
      where: { email: { contains: 'test-' } },
    });
    console.log('Residual users before cleanup:', residualUsers);

    await prismaService.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-' } },
          {
            email: {
              in: [
                'test-john.doe@example.com',
                'test-jane.smith@example.com',
                'test-bob@example.com',
                'test-alice@example.com',
              ],
            },
          },
        ],
      },
    });
  });

  // Clean up after each test to prevent data pollution
  afterEach(async () => {
    await prismaService.user.deleteMany({
      where: { email: { contains: 'test-' } },
    });
  });

  // Close database connection after all tests
  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  // Common test data setup for User
  const baseUserData = (
    email: string,
    firstName: string,
    lastName: string,
  ) => ({
    email,
    firstName,
    lastName,
    password: 'hashed',
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    displayName: `${firstName} ${lastName}`,
    avatar: null,
  });

  /**
   * Test Case: TC8_US_GetUserByEmail_Existing
   * Objective: Verify that getUserByEmail returns a UserDto for an existing user
   * Input: Valid email of an existing user
   * Expected Output: UserDto with correct fields, no company or applications
   * Notes: Uses production database with cleanup. Tests path where user is found.
   */
  describe('TC8_US_GetUserByEmail_Existing', () => {
    it('should return UserDto when user is found', async () => {
      const email = `test-john.doe.${Date.now()}@example.com`;
      const user = await prismaService.user.create({
        data: baseUserData(email, 'John', 'Doe'),
      });

      const result = await userService.getUserByEmail(email);
      console.log('TC-1 getUserByEmail result:', result);

      expect(result).toMatchObject({
        id: user.id,
        email,
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        role: Role.USER,
        avatar: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  /**
   * Test Case: TC09_US_GetUserByEmail_NonExistent
   * Objective: Verify that getUserByEmail throws NotFoundException for a non-existent email
   * Input: Non-existent email
   * Expected Output: NotFoundException with message including email
   * Notes: Uses production database, no data insertion needed.
   */
  describe('TC09_US_GetUserByEmail_NonExistent', () => {
    it('should throw NotFoundException for non-existent email', async () => {
      const nonExistentEmail = 'nonexistent@example.com';

      await expect(
        userService.getUserByEmail(nonExistentEmail),
      ).rejects.toThrow(
        new NotFoundException(Message.USER_NOT_FOUND(nonExistentEmail)),
      );
    });
  });

  /**
   * Test Case: TC10_US_GetUserByEmail_EmptyEmail
   * Objective: Verify that getUserByEmail throws NotFoundException for an empty email string
   * Input: Empty email string
   * Expected Output: NotFoundException with message for empty email
   * Notes: Uses production database, tests invalid input handling.
   */
  describe('TC10_US_GetUserByEmail_EmptyEmail', () => {
    it('should throw NotFoundException for empty email', async () => {
      const emptyEmail = '';

      await expect(userService.getUserByEmail(emptyEmail)).rejects.toThrow(
        new NotFoundException(Message.USER_NOT_FOUND(emptyEmail)),
      );
    });
  });
});

// Note: Using the production database, so we must ensure cleanup of test users
describe('UserServiceImpl - createUser (Integration Tests with Real DB)', () => {
  let app: INestApplication;
  let userService: UserServiceImpl;
  let prismaService: PrismaService;

  // Setup testing module before all tests
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserServiceImpl,
        PrismaService, // Uses the real PrismaService
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    userService = module.get<UserServiceImpl>(UserServiceImpl);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // Clean up before each test to remove residual user data
  beforeEach(async () => {
    const residualUsers = await prismaService.user.findMany({
      where: { email: { contains: 'test-' } },
    });
    console.log('Residual users before cleanup:', residualUsers);

    await prismaService.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-' } },
          {
            email: {
              in: [
                'test-john.doe@example.com',
                'test-jane.smith@example.com',
                'test-bob@example.com',
                'test-alice@example.com',
              ],
            },
          },
        ],
      },
    });
  });

  // Clean up after each test to prevent data pollution
  afterEach(async () => {
    await prismaService.user.deleteMany({
      where: { email: { contains: 'test-' } },
    });
  });

  // Close database connection after all tests
  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  // Common test data setup for User
  const baseUserData = (
    email: string,
    firstName: string,
    lastName: string,
    password: string = 'plain-password',
  ) => ({
    email,
    firstName,
    lastName,
    password,
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    displayName: `${firstName} ${lastName}`,
    avatar: null,
  });

  /**
   * Test Case: TC11_US_CreateUser_Success
   * Objective: Verify that createUser creates a user when no existing user is found
   * Input: Valid UserCreateInput with email, firstName, lastName, password
   * Expected Output: UserDto with hashed password and role 'USER'
   * Notes: Uses production database with cleanup. Tests successful user creation path.
   */
  describe('TC11_US_CreateUser_Success', () => {
    it('should create and return UserDto when user does not exist', async () => {
      const inputData = baseUserData(
        `test-john.doe.${Date.now()}@example.com`,
        'John',
        'Doe',
      );

      const result = await userService.createUser(inputData);
      console.log('TC-1 createUser result:', result);

      expect(result).toMatchObject({
        email: inputData.email,
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        role: Role.USER,
        avatar: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result.id).toBeDefined();
    });
  });

  /**
   * Test Case: TC12_US_CreateUser_ExistingEmail
   * Objective: Verify that createUser throws BadRequestException for an existing email
   * Input: UserCreateInput with an existing email
   * Expected Output: BadRequestException with message indicating user already exists
   * Notes: Uses production database with cleanup. Tests duplicate email handling.
   */
  describe(' TC12_US_CreateUser_ExistingEmail', () => {
    it('should throw BadRequestException when user already exists', async () => {
      const email = `test-jane.smith.${Date.now()}@example.com`;
      const inputData = baseUserData(email, 'Jane', 'Smith');
      await prismaService.user.create({ data: inputData });

      await expect(userService.createUser(inputData)).rejects.toThrow(
        new BadRequestException(Message.USER_ALREADY_EXISTS(email)),
      );
    });
  });

  /**
   * Test Case: TC13_US_CreateUser_EmptyEmail
   * Objective: Verify that createUser throws an error for an empty email
   * Input: UserCreateInput with empty email
   * Expected Output: PrismaClientValidationError due to schema constraints
   * Notes: Uses production database. Tests invalid input validation.
   */
  describe('TC13_US_CreateUser_EmptyEmail', () => {
    it('should throw Prisma error for empty email', async () => {
      const inputData = baseUserData('', 'John', 'Doe');

      await expect(userService.createUser(inputData)).rejects.toThrow(
        expect.objectContaining({
          name: 'PrismaClientValidationError',
        }),
      );
    });
  });

  /**
   * Test Case: TC14_US_CreateUser_EmptyPassword
   * Objective: Verify that createUser throws an error for an empty password
   * Input: UserCreateInput with empty password
   * Expected Output: PrismaClientValidationError due to schema constraints
   * Notes: Uses production database. Tests invalid input validation.
   */
  describe('TC14_US_CreateUser_EmptyPassword', () => {
    it('should throw Prisma error for empty password', async () => {
      const inputData = baseUserData(
        `test-bob.${Date.now()}@example.com`,
        'Bob',
        'Smith',
        '',
      );

      await expect(userService.createUser(inputData)).rejects.toThrow(
        expect.objectContaining({
          name: 'PrismaClientValidationError',
        }),
      );
    });
  });
});

// Note: Using the production database, so we must ensure cleanup of test users
describe('UserServiceImpl - createCompanyAdminAccount (Integration Tests with Real DB)', () => {
  let app: INestApplication;
  let userService: UserServiceImpl;
  let prismaService: PrismaService;

  // Setup testing module before all tests
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserServiceImpl,
        PrismaService, // Uses the real PrismaService
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    userService = module.get<UserServiceImpl>(UserServiceImpl);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // Clean up before each test to remove residual user data
  beforeEach(async () => {
    const residualUsers = await prismaService.user.findMany({
      where: { email: { contains: 'test-' } },
    });
    console.log('Residual users before cleanup:', residualUsers);

    await prismaService.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-' } },
          {
            email: {
              in: [
                'test-john.doe@example.com',
                'test-jane.smith@example.com',
                'test-bob@example.com',
                'test-alice@example.com',
              ],
            },
          },
        ],
      },
    });
  });

  // Clean up after each test to prevent data pollution
  afterEach(async () => {
    await prismaService.user.deleteMany({
      where: { email: { contains: 'test-' } },
    });
  });

  // Close database connection after all tests
  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  // Common test data setup for User
  const baseUserData = (
    email: string,
    firstName: string,
    lastName: string,
    password: string = 'plain-password',
  ) => ({
    email,
    firstName,
    lastName,
    password,
    createdAt: new Date(),
    updatedAt: new Date(),
    displayName: `${firstName} ${lastName}`,
    avatar: null,
  });

  /**
   * Test Case: TC15_US_CreateCompanyAdmin_Success
   * Objective: Verify that createCompanyAdminAccount creates a user with COMPANY_ADMIN role
   * Input: Valid UserCreateInput with email, firstName, lastName, password
   * Expected Output: UserDto with hashed password and role 'COMPANY_ADMIN'
   * Notes: Uses production database with cleanup. Tests successful admin creation path.
   */
  describe('TC15_US_CreateCompanyAdmin_Success', () => {
    it('should create and return UserDto with COMPANY_ADMIN role when user does not exist', async () => {
      const inputData = baseUserData(
        `test-john.doe.${Date.now()}@example.com`,
        'John',
        'Doe',
      );

      const result = await userService.createCompanyAdminAccount(inputData);
      console.log('TC-1 createCompanyAdminAccount result:', result);

      expect(result).toMatchObject({
        email: inputData.email,
        firstName: 'John',
        lastName: 'Doe',
        displayName: 'John Doe',
        role: Role.COMPANY_ADMIN,
        avatar: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result.id).toBeDefined();
      expect(result.role).toBe(Role.COMPANY_ADMIN);
    });
  });

  /**
   * Test Case: TC16_US_CreateCompanyAdmin_ExistingEmail
   * Objective: Verify that createCompanyAdminAccount throws BadRequestException for an existing email
   * Input: UserCreateInput with an existing email
   * Expected Output: BadRequestException with message indicating user already exists
   * Notes: Uses production database with cleanup. Tests duplicate email handling.
   */
  describe('TC16_US_CreateCompanyAdmin_ExistingEmail', () => {
    it('should throw BadRequestException when user already exists', async () => {
      const email = `test-jane.smith.${Date.now()}@example.com`;
      const inputData = baseUserData(email, 'Jane', 'Smith');
      await prismaService.user.create({
        data: { ...inputData, role: Role.USER },
      });

      await expect(
        userService.createCompanyAdminAccount(inputData),
      ).rejects.toThrow(
        new BadRequestException(Message.USER_ALREADY_EXISTS(email)),
      );
    });
  });

  /**
   * Test Case: TC17_US_CreateCompanyAdmin_EmptyEmail
   * Objective: Verify that createCompanyAdminAccount throws an error for an empty email
   * Input: UserCreateInput with empty email
   * Expected Output: PrismaClientValidationError due to schema constraints
   * Notes: Uses production database. Tests invalid input validation.
   */

  describe('TC17_US_CreateCompanyAdmin_EmptyEmail', () => {
    it('should throw Prisma error for empty email', async () => {
      const inputData = baseUserData('', 'John', 'Doe');

      await expect(
        userService.createCompanyAdminAccount(inputData),
      ).rejects.toThrow(
        expect.objectContaining({
          name: 'PrismaClientValidationError',
        }),
      );
    });
  });

  /**
   * Test Case: TC18_US_CreateCompanyAdmin_EmptyPassword
   * Objective: Verify that createCompanyAdminAccount throws an error for an empty password
   * Input: UserCreateInput with empty password
   * Expected Output: PrismaClientValidationError due to schema constraints
   * Notes: Uses production database. Tests invalid input validation.
   */
  describe('TC18_US_CreateCompanyAdmin_EmptyPassword', () => {
    it('should throw Prisma error for empty password', async () => {
      const inputData = baseUserData(
        `test-bob.${Date.now()}@example.com`,
        'Bob',
        'Smith',
        '',
      );

      await expect(
        userService.createCompanyAdminAccount(inputData),
      ).rejects.toThrow(
        expect.objectContaining({
          name: 'PrismaClientValidationError',
        }),
      );
    });
  });
});

// Note: Using the production database, so we must ensure cleanup of test users
describe('UserServiceImpl - changePassword (Integration Tests with Real DB)', () => {
  let app: INestApplication;
  let userService: UserServiceImpl;
  let prismaService: PrismaService;

  // Setup testing module before all tests
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserServiceImpl,
        PrismaService, // Uses the real PrismaService
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    userService = module.get<UserServiceImpl>(UserServiceImpl);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // Clean up before each test to remove residual user data
  beforeEach(async () => {
    const residualUsers = await prismaService.user.findMany({
      where: { email: { contains: 'test-' } },
    });
    console.log('Residual users before cleanup:', residualUsers);

    await prismaService.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'test-' } },
          {
            email: {
              in: [
                'test-john.doe@example.com',
                'test-jane.smith@example.com',
                'test-bob@example.com',
                'test-alice@example.com',
              ],
            },
          },
        ],
      },
    });
  });

  // Clean up after each test to prevent data pollution
  afterEach(async () => {
    await prismaService.user.deleteMany({
      where: { email: { contains: 'test-' } },
    });
  });

  // Close database connection after all tests
  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  // Common test data setup for User
  const baseUserData = (
    email: string,
    firstName: string,
    lastName: string,
    password: string,
  ) => ({
    email,
    firstName,
    lastName,
    password,
    role: Role.USER,
    createdAt: new Date(),
    updatedAt: new Date(),
    displayName: `${firstName} ${lastName}`,
    avatar: null,
    companyId: null,
  });

  /**
   * Test Case: TC19_US_ChangePassword_Success
   * Objective: Verify that changePassword updates the password for a valid user with correct current password
   * Input: Valid ChangePasswordDto with currentPassword, newPassword, and authenticated user
   * Expected Output: Resolves (void), password updated in database
   * Notes: Uses production database with cleanup. Tests successful password change path.
   */
  describe('TC19_US_ChangePassword_Success', () => {
    it('should change password when user exists and current password is correct', async () => {
      // Arrange
      const email = `test-john.doe.${Date.now()}@example.com`;
      const currentPassword = 'current-password';
      const hashedCurrentPassword = await bcrypt.hash(currentPassword, 12);
      const userData = baseUserData(
        email,
        'John',
        'Doe',
        hashedCurrentPassword,
      );
      const createdUser = await prismaService.user.create({ data: userData });
      const changePasswordDto = {
        currentPassword,
        newPassword: 'new-password',
      };
      const authenticatedUser = {
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        password: createdUser.password,
        displayName: createdUser.displayName,
        avatar: createdUser.avatar,
        role: createdUser.role,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt,
        companyId: createdUser.companyId,
      };

      // Act
      await userService.changePassword(changePasswordDto, authenticatedUser);

      // Assert
      const updatedUser = await prismaService.user.findUnique({
        where: { id: createdUser.id },
      });
      expect(updatedUser).toBeDefined();
      expect(
        await bcrypt.compare(
          changePasswordDto.newPassword,
          updatedUser!.password,
        ),
      ).toBe(true);
      expect(await bcrypt.compare(currentPassword, updatedUser!.password)).toBe(
        false,
      );
    });
  });

  /**
   * Test Case: TC20_US_ChangePassword_NonExistent
   * Objective: Verify that changePassword throws BadRequestException for a non-existent user
   * Input: Valid ChangePasswordDto and non-existent user
   * Expected Output: BadRequestException with message indicating wrong current password
   * Notes: Uses production database. Tests non-existent user handling.
   */
  describe('TC20_US_ChangePassword_NonExistent', () => {
    it('should throw BadRequestException when user does not exist', async () => {
      // Arrange
      const changePasswordDto = {
        currentPassword: 'current-password',
        newPassword: 'new-password',
      };
      const authenticatedUser = {
        id: 999,
        email: 'nonexistent@example.com',
        firstName: 'Non',
        lastName: 'Existent',
        password: 'hashed-password',
        displayName: 'Non Existent',
        avatar: null,
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        companyId: null,
      };

      // Act & Assert
      await expect(
        userService.changePassword(changePasswordDto, authenticatedUser),
      ).rejects.toThrow(
        new BadRequestException(Message.WRONG_CURRENT_PASSWORD),
      );
    });
  });

  /**
   * Test Case: TC21_US_ChangePassword_IncorrectCurrent
   * Objective: Verify that changePassword throws BadRequestException for an incorrect current password
   * Input: Valid ChangePasswordDto with incorrect currentPassword
   * Expected Output: BadRequestException with message indicating wrong current password
   * Notes: Uses production database with cleanup. Tests incorrect password validation.
   */
  describe('TC21_US_ChangePassword_IncorrectCurrent', () => {
    it('should throw BadRequestException when current password is incorrect', async () => {
      // Arrange
      const email = `test-jane.smith.${Date.now()}@example.com`;
      const currentPassword = 'current-password';
      const hashedCurrentPassword = await bcrypt.hash(currentPassword, 12);
      const userData = baseUserData(
        email,
        'Jane',
        'Smith',
        hashedCurrentPassword,
      );
      const createdUser = await prismaService.user.create({ data: userData });
      const changePasswordDto = {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      };
      const authenticatedUser = {
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        password: createdUser.password,
        displayName: createdUser.displayName,
        avatar: createdUser.avatar,
        role: createdUser.role,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt,
        companyId: createdUser.companyId,
      };

      // Act & Assert
      await expect(
        userService.changePassword(changePasswordDto, authenticatedUser),
      ).rejects.toThrow(
        new BadRequestException(Message.WRONG_CURRENT_PASSWORD),
      );
    });
  });

  /**
   * Test Case: TC22_US_ChangePassword_EmptyCurrent
   * Objective: Verify that changePassword throws BadRequestException for an empty current password
   * Input: ChangePasswordDto with empty currentPassword
   * Expected Output: BadRequestException with message indicating wrong current password
   * Notes: Uses production database with cleanup. Tests empty current password handling.
   */
  describe('TC22_US_ChangePassword_EmptyCurrent', () => {
    it('should throw BadRequestException for empty current password', async () => {
      // Arrange
      const email = `test-bob.${Date.now()}@example.com`;
      const currentPassword = 'current-password';
      const hashedCurrentPassword = await bcrypt.hash(currentPassword, 12);
      const userData = baseUserData(
        email,
        'Bob',
        'Smith',
        hashedCurrentPassword,
      );
      const createdUser = await prismaService.user.create({ data: userData });
      const changePasswordDto = {
        currentPassword: '',
        newPassword: 'new-password',
      };
      const authenticatedUser = {
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        password: createdUser.password,
        displayName: createdUser.displayName,
        avatar: createdUser.avatar,
        role: createdUser.role,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt,
        companyId: createdUser.companyId,
      };

      // Act & Assert
      await expect(
        userService.changePassword(changePasswordDto, authenticatedUser),
      ).rejects.toThrow(
        new BadRequestException(Message.WRONG_CURRENT_PASSWORD),
      );
    });
  });

  /**
   * Test Case: TC23_US_ChangePassword_EmptyNew
   * Objective: Verify that changePassword throws an error for an empty new password
   * Input: ChangePasswordDto with empty newPassword
   * Expected Output: Error due to bcrypt.hash failure
   * Notes: Uses production database with cleanup. Tests empty new password handling.
   */
  describe('TC23_US_ChangePassword_EmptyNew', () => {
    it('should throw error for empty new password', async () => {
      // Arrange
      const email = `test-alice.${Date.now()}@example.com`;
      const currentPassword = 'current-password';
      const hashedCurrentPassword = await bcrypt.hash(currentPassword, 12);
      const userData = baseUserData(
        email,
        'Alice',
        'Johnson',
        hashedCurrentPassword,
      );
      const createdUser = await prismaService.user.create({ data: userData });
      const changePasswordDto = {
        currentPassword,
        newPassword: '',
      };
      const authenticatedUser = {
        id: createdUser.id,
        email: createdUser.email,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        password: createdUser.password,
        displayName: createdUser.displayName,
        avatar: createdUser.avatar,
        role: createdUser.role,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt,
        companyId: createdUser.companyId,
      };

      // Act & Assert
      await expect(
        userService.changePassword(changePasswordDto, authenticatedUser),
      ).rejects.toThrow();
    });
  });
});
