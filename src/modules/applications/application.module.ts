import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  ApplicationService,
  ApplicationServiceImpl,
} from './application.service';
import { ApplicationController } from './controllers/application.controller';
import { FilesModule } from '../files/file.module';
import { MailModule } from '../mail/mail.module';
import { ManageApplicationController } from './controllers/manage-application.controller';
import { AmqpModule } from '../amqp/amqp.module';

/*
Reference: company.service.ts test cases
Test case names:
- TC-CS-001: should create a company and company admin account successfully
- TC-CS-002: should throw BadRequestException when company code already exists
- TC-CS-003: should throw error for invalid company data
- TC-CS-004: should throw error for invalid company account data
- TC-CS-005: should throw error when all string fields are empty or whitespace
- TC-CS-006: should throw error when company admin email already exists
- TC-CS-007: should throw error for very long company name/description/address
- TC-CS-008: should return companies matching the code filter
- TC-CS-009: should return companies matching the name filter
- TC-CS-010: should return paginated results
- TC-CS-011: should return sorted results
- TC-CS-012: should return empty array when no companies match the filter
- TC-CS-013: should handle filter with special characters
- TC-CS-014: should handle filter with extremely large offset/limit
- TC-CS-015: should return a company when valid ID is provided
- TC-CS-016: should throw NotFoundException when company with ID does not exist
- TC-CS-017: should throw NotFoundException for ID = 0
- TC-CS-018: should throw NotFoundException for negative ID
- TC-CS-019: should throw NotFoundException for very large ID
- TC-CS-020: should return a company when valid code is provided
- TC-CS-021: should throw NotFoundException when company with code does not exist
- TC-CS-022: should throw NotFoundException for whitespace-only code
- TC-CS-023: should throw NotFoundException for very long code
- TC-CS-024: should throw NotFoundException for code with special/unicode characters
- TC-CS-025: should update and return the company when valid data is provided
- TC-CS-026: should throw NotFoundException when company with ID does not exist
- TC-CS-027: should update company with no changes
- TC-CS-028: should update company with only one field changed
- TC-CS-029: should throw error for update with invalid data
- TC-CS-030: should throw error for update with extremely long values
- TC-CS-031: should delete the company and its associated users when valid ID is provided
- TC-CS-032: should throw NotFoundException when company with ID does not exist
- TC-CS-033: should throw NotFoundException when deleting company twice
- TC-CS-034: should create company HR users when called by company admin
- TC-CS-035: should throw ForbiddenException when user is not company admin
- TC-CS-036: should throw UnauthorizedException when user does not exist
- TC-CS-037: should throw error when HR data array is empty
- TC-CS-038: should throw error when HR data has duplicate emails
- TC-CS-039: should throw error when HR data has invalid email/password
- TC-CS-040: should return list of company HR users when called by company admin
- TC-CS-041: should throw ForbiddenException when user is not company admin
- TC-CS-042: should throw UnauthorizedException when user does not exist
- TC-CS-043: should throw error when user not associated with any company
- TC-CS-044: should delete company HR user when called by company admin
- TC-CS-045: should throw ForbiddenException when user is not company admin
- TC-CS-046: should throw UnauthorizedException when user does not exist
- TC-CS-047: should throw error when HR ID does not exist
- TC-CS-048: should not delete HR user from another company
- TC-CS-049: should throw error when HR ID is negative or zero
*/

@Module({
  imports: [PrismaModule, FilesModule, MailModule, AmqpModule],
  controllers: [ApplicationController, ManageApplicationController],
  providers: [
    {
      provide: ApplicationService,
      useClass: ApplicationServiceImpl,
    },
  ],
  exports: [ApplicationService],
})
export class ApplicationModule {}
