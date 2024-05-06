import { Controller, Get } from '@nestjs/common';
import { StatisticService } from '../statistic.service';
import ResponseDto from '../../../constants/response.dto';
import { CurrentUser } from '../../../decorators/current-user.decorator';
import { Role, User } from '@prisma/client';
import { Roles } from '../../../decorators/role.decorator';

@Controller('admin/statistics')
export class AdminStatisticController {
  constructor(private readonly statisticService: StatisticService) {}

  @Get()
  @Roles(Role.ADMIN)
  async getCommonStatistics() {
    return ResponseDto.successDefault(
      await this.statisticService.getAdminCommonStatistics(),
    );
  }

  @Get('company')
  @Roles(Role.COMPANY_ADMIN, Role.COMPANY_HR)
  async getCompanyStatistics(@CurrentUser() user: User) {
    return ResponseDto.successDefault(
      await this.statisticService.getCompanyCommonStatistics(user),
    );
  }
}
