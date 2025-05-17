import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UserServiceImpl } from './user.service';
import { UserFilter } from './dtos/user-filter.dto';
import { INestApplication } from '@nestjs/common';

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

  // Clean up after each test to prevent data pollution
  afterEach(async () => {
    // Delete test users created during the test
    await prismaService.user.deleteMany({
      where: {
        email: {
          in: [
            'john.doe@example.com',
            'jane.smith@example.com',
            'bob@example.com',
            'alice@example.com',
            'jane.smith@other.com',
          ],
        },
      },
    });
  });

  // Close database connection after all tests
  afterAll(async () => {
    await prismaService.$disconnect();
    await app.close();
  });

  // Test Case 2.3.1: Successfully retrieve users with name filter
  describe('TC-2.3.1: Filter users by name', () => {
    it('should return users matching the name filter', async () => {
      // Test Case Metadata
      /**
       * Test Case ID: TC-2.3.1
       * Objective: Verify that findAll returns users matching the provided name filter
       * Input: UserFilter { name: 'John' }
       * Expected Output: Array of UserDto objects with firstName or lastName containing 'John'
       * Note: Inserts and cleans up test data in the production database
       */

      // Arrange: Insert test data
      await prismaService.user.createMany({
        data: [
          {
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            password: 'hashed',
            role: 'USER',
          },
          {
            email: 'jane.smith@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            password: 'hashed',
            role: 'USER',
          },
        ],
      });

      const filter: UserFilter = { name: 'John' };

      // Act
      const result = await userService.findAll(filter);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      });

      // Verify database state
      const dbUsers = await prismaService.user.findMany({
        where: {
          OR: [
            { firstName: { contains: 'John' } },
            { lastName: { contains: 'John' } },
          ],
        },
      });
      expect(dbUsers).toHaveLength(1);
      expect(dbUsers[0].email).toBe('john.doe@example.com');

      // Rollback: Handled in afterEach by deleting test users
    });
  });

  // Test Case 2.3.2: Successfully retrieve users with email filter
  describe('TC-2.3.2: Filter users by email', () => {
    it('should return users matching the email filter', async () => {
      // Test Case Metadata
      /**
       * Test Case ID: TC-2.3.2
       * Objective: Verify that findAll returns users matching the provided email filter
       * Input: UserFilter { email: 'example.com' }
       * Expected Output: Array of UserDto objects with email containing 'example.com'
       * Note: Uses production database with careful cleanup
       */

      // Arrange: Insert test data
      await prismaService.user.createMany({
        data: [
          {
            email: 'john.doe@example.com',
            firstName: 'John',
            lastName: 'Doe',
            password: 'hashed',
            role: 'USER',
          },
          {
            email: 'jane.smith@other.com',
            firstName: 'Jane',
            lastName: 'Smith',
            password: 'hashed',
            role: 'USER',
          },
        ],
      });

      const filter: UserFilter = { email: 'example.com' };

      // Act
      const result = await userService.findAll(filter);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        email: 'john.doe@example.com',
      });

      // Verify database state
      const dbUsers = await prismaService.user.findMany({
        where: { email: { contains: 'example.com' } },
      });
      expect(dbUsers).toHaveLength(1);
      expect(dbUsers[0].email).toBe('john.doe@example.com');

      // Rollback: Handled in afterEach
    });
  });

  // Test Case 2.3.3: Retrieve users with sorting
  describe('TC-2.3.3: Filter users with sorting', () => {
    it('should return sorted users based on sort parameter', async () => {
      // Test Case Metadata
      /**
       * Test Case ID: TC-2.3.3
       * Objective: Verify that findAll returns users sorted according to sort parameter
       * Input: UserFilter { sort: 'email:asc' }
       * Expected Output: Array of UserDto objects sorted by email in ascending order
       * Note: Tests sorting in production database
       */

      // Arrange: Insert test data
      await prismaService.user.createMany({
        data: [
          {
            email: 'bob@example.com',
            firstName: 'Bob',
            lastName: 'Jones',
            password: 'hashed',
            role: 'USER',
          },
          {
            email: 'alice@example.com',
            firstName: 'Alice',
            lastName: 'Smith',
            password: 'hashed',
            role: 'USER',
          },
        ],
      });

      const filter: UserFilter = { sort: 'email:asc' };

      // Act
      const result = await userService.findAll(filter);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('alice@example.com');
      expect(result[1].email).toBe('bob@example.com');

      // Verify database state
      const dbUsers = await prismaService.user.findMany({
        orderBy: { email: 'asc' },
      });
      expect(dbUsers).toHaveLength(2);
      expect(dbUsers[0].email).toBe('alice@example.com');
      expect(dbUsers[1].email).toBe('bob@example.com');

      // Rollback: Handled in afterEach
    });
  });

  // Test Case 2.3.4: Empty result for no matching users
  describe('TC-2.3.4: No matching users', () => {
    it('should return empty array when no users match the filter', async () => {
      // Test Case Metadata
      /**
       * Test Case ID: TC-2.3.4
       * Objective: Verify that findAll returns empty array when no users match
       * Input: UserFilter { name: 'Nonexistent' }
       * Expected Output: Empty array []
       * Note: Tests empty results in production database
       */

      // Arrange: Insert unrelated data
      await prismaService.user.create({
        data: {
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          password: 'hashed',
          role: 'USER',
        },
      });

      const filter: UserFilter = { name: 'Nonexistent' };

      // Act
      const result = await userService.findAll(filter);

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);

      // Verify database state
      const dbUsers = await prismaService.user.findMany({
        where: {
          OR: [
            { firstName: { contains: 'Nonexistent' } },
            { lastName: { contains: 'Nonexistent' } },
          ],
        },
      });
      expect(dbUsers).toHaveLength(0);

      // Rollback: Handled in afterEach
    });
  });
});
