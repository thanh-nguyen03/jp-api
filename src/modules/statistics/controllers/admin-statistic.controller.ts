import { Controller, Get } from '@nestjs/common';
import { StatisticService } from '../statistic.service';
import ResponseDto from '../../../constants/response.dto';
import { CurrentUser } from '../../../decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('admin/statistics')
export class AdminStatisticController {
  constructor(private readonly statisticService: StatisticService) {}

  @Get()
  async getCommonStatistics() {
    return ResponseDto.successDefault(
      await this.statisticService.getAdminCommonStatistics(),
    );
  }

  @Get('company')
  async getCompanyStatistics(@CurrentUser() user: User) {
    return ResponseDto.successDefault(
      await this.statisticService.getCompanyCommonStatistics(user),
    );
  }
}
