import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
} from '@nestjs/common';
import { ApplicationService } from '../application.service';
import ResponseDto from '../../../constants/response.dto';
import { User } from '@prisma/client';
import { CurrentUser } from '../../../decorators/current-user.decorator';

@Controller('admin/applications')
export class ManageApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get(':applicationId')
  async findApplicationDetail(
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @CurrentUser() user: User,
  ) {
    return ResponseDto.successDefault(
      await this.applicationService.getApplicationDetail(applicationId, user),
    );
  }

  @Put(':applicationId/status')
  async approveApplication(
    @Param('applicationId') applicationId: number,
    @CurrentUser() user: User,
    @Body() body: { isApproved: boolean },
  ) {
    const { isApproved } = body;

    if (isApproved !== true && isApproved !== false) {
      throw new BadRequestException();
    }

    return ResponseDto.successDefault(
      await this.applicationService.updateApplicationStatus(
        applicationId,
        user,
        isApproved,
      ),
    );
  }
}
