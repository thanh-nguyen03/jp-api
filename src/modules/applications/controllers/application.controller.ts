import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApplicationService } from '../application.service';
import { CreateApplicationDto } from '../dtos/create-application.dto';
import { CurrentUser } from '../../../decorators/current-user.decorator';
import { User } from '@prisma/client';
import ResponseDto from '../../../constants/response.dto';
import { Message } from '../../../constants/message';
import { ApplicationDto } from '../dtos/application.dto';

@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  async apply(@Body() data: CreateApplicationDto, @CurrentUser() user: User) {
    return ResponseDto.success(
      await this.applicationService.createApplication(data, user.id),
      Message.CREATE_APPLICATION_SUCCESSFULLY,
    );
  }

  @Put(':applicationId')
  async update(
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @Body() data: ApplicationDto,
  ) {
    return ResponseDto.success(
      await this.applicationService.updateApplication(applicationId, data),
      Message.UPDATE_APPLICATION_SUCCESSFULLY,
    );
  }
}
