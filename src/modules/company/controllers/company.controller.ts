import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CompanyService } from '../company.service';
import { CompanyFilter } from '../dtos/company-filter.query';
import ResponseDto from '../../../constants/response.dto';

@Controller('companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  async getListCompanies(@Query() filter: CompanyFilter) {
    return ResponseDto.successDefault(
      await this.companyService.findAll(filter),
    );
  }

  @Get(':id')
  async getCompanyById(@Param('id', ParseIntPipe) id: number) {
    return ResponseDto.successDefault(await this.companyService.findById(id));
  }
}
