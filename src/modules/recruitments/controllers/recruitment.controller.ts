import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { RecruitmentService } from '../recruitment.service';
import { RecruitmentFilter } from '../dtos/recruitment-filter.dto';
import ResponseDto from '../../../constants/response.dto';
import { User } from '@prisma/client';
import { CurrentUser } from '../../../decorators/current-user.decorator';

@Controller('recruitments')
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Get()
  async getAll(@Query() filter: RecruitmentFilter, @CurrentUser() user: User) {
    return ResponseDto.successDefault(
      await this.recruitmentService.findAll(filter, user),
    );
  }

  @Get(':id')
  async getById(@Param('id', ParseIntPipe) recruitmentId: number) {
    return ResponseDto.successDefault(
      await this.recruitmentService.findById(recruitmentId),
    );
  }
}
