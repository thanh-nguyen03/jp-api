import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Roles } from '../../../decorators/role.decorator';
import { Role, User } from '@prisma/client';
import { RecruitmentService } from '../recruitment.service';
import { RecruitmentFilter } from '../dtos/recruitment-filter.dto';
import { CurrentUser } from '../../../decorators/current-user.decorator';
import { Message } from '../../../constants/message';
import ResponseDto from '../../../constants/response.dto';
import { RecruitmentDto } from '../dtos/recruitment.dto';
import { ApplicationService } from '../../applications/application.service';

@Controller('admin/recruitments')
@Roles(Role.COMPANY_ADMIN)
export class ManageRecruitmentCompanyController {
  constructor(
    private readonly recruitmentService: RecruitmentService,
    private readonly applicationService: ApplicationService,
  ) {}

  @Get()
  async getRecruitmentsOfCompany(
    @Query() filter: RecruitmentFilter,
    @CurrentUser() user: User,
  ) {
    if (!user.companyId) {
      throw new ForbiddenException(Message.RECRUITMENT_COMPANY_FORBIDDEN);
    }

    filter.companyId = user.companyId;

    return ResponseDto.successDefault(
      await this.recruitmentService.findAll(filter, user),
    );
  }

  @Get(':id')
  async getRecruitmentDetail(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) recruitmentId: number,
  ) {
    const recruitment = await this.recruitmentService.findById(recruitmentId);

    if (recruitment.companyId !== user.companyId) {
      throw new ForbiddenException(Message.RECRUITMENT_COMPANY_FORBIDDEN);
    }

    return ResponseDto.successDefault(recruitment);
  }

  @Post()
  async createRecruitment(
    @Body() data: RecruitmentDto,
    @CurrentUser() user: User,
  ) {
    return ResponseDto.successDefault(
      await this.recruitmentService.createRecruitment(data, user),
    );
  }

  @Put(':id')
  async updateRecruitmentInfo(
    @Param('id', ParseIntPipe) recruitmentId: number,
    @Body() data: RecruitmentDto,
    @CurrentUser() user: User,
  ) {
    return ResponseDto.successDefault(
      await this.recruitmentService.updateRecruitment(
        recruitmentId,
        data,
        user,
      ),
    );
  }

  @Delete(':id')
  async deleteRecruitment(
    @Param('id', ParseIntPipe) recruitmentId: number,
    @CurrentUser() user: User,
  ) {
    return ResponseDto.successDefault(
      await this.recruitmentService.deleteRecruitment(recruitmentId, user),
    );
  }

  @Get(':recruitmentId/applications')
  async findApplicationsOfRecruitment(
    @Param('recruitmentId', ParseIntPipe) recruitmentId: number,
    @CurrentUser() user: User,
  ) {
    return ResponseDto.successDefault(
      await this.applicationService.findByRecruitment(recruitmentId, user),
    );
  }
}
