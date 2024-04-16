import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../../decorators/role.decorator';
import { RecruitmentService } from '../recruitment.service';
import { RecruitmentFilter } from '../dtos/recruitment-filter.dto';
import { CurrentUser } from '../../../decorators/current-user.decorator';
import { Role, User } from '@prisma/client';
import ResponseDto from '../../../constants/response.dto';

@Controller('admin/recruitments')
@Roles(Role.ADMIN)
export class AdminRecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Get('all')
  async getAllRecruitments(
    @Query() filter: RecruitmentFilter,
    @CurrentUser() user: User,
  ) {
    return ResponseDto.successDefault(
      await this.recruitmentService.findAll(filter, user),
    );
  }
}
