import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { CompanyService } from '../company.service';
import { CompanyFilter } from '../dtos/company-filter.query';
import ResponseDto from '../../../constants/response.dto';
import { Message } from '../../../constants/message';
import { CompanyDto } from '../dtos/company.dto';
import { Roles } from '../../../decorators/role.decorator';
import { Role } from '@prisma/client';

@Roles(Role.ADMIN)
@Controller('admin/companies')
export class AdminCompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  async list(@Query() filter: CompanyFilter) {
    return ResponseDto.successDefault(
      await this.companyService.findAll(filter),
    );
  }

  @Get(':id')
  async getCompanyById(@Param('id', ParseIntPipe) id: number) {
    return ResponseDto.successDefault(await this.companyService.findById(id));
  }

  @Get(':code')
  async getCompanyByCode(@Param('code') code: string) {
    return ResponseDto.successDefault(
      await this.companyService.findByCode(code),
    );
  }

  @Post()
  async createCompany(@Body() data: CompanyDto) {
    return ResponseDto.success(
      await this.companyService.createCompany(data),
      Message.COMPANY_CREATED,
    );
  }

  @Put(':id')
  async updateCompany(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: CompanyDto,
  ) {
    return ResponseDto.success(
      await this.companyService.updateCompany(id, data),
      Message.COMPANY_UPDATED,
    );
  }

  @Delete(':id')
  async deleteCompany(@Param('id', ParseIntPipe) id: number) {
    await this.companyService.deleteCompany(id);
    return ResponseDto.successWithoutData(Message.COMPANY_DELETED);
  }
}
